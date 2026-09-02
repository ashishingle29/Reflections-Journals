import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import type { JournalEntry, UserProfile } from '../types';
import appConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance safely
const firebaseConfig = {
  apiKey: appConfig.apiKey,
  authDomain: appConfig.authDomain,
  projectId: appConfig.projectId,
  storageBucket: appConfig.storageBucket,
  messagingSenderId: appConfig.messagingSenderId,
  appId: appConfig.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with specific database ID if defined in applet config
const databaseId = appConfig.firestoreDatabaseId && appConfig.firestoreDatabaseId !== '(default)'
  ? appConfig.firestoreDatabaseId
  : undefined;

/**
 * Configure Firestore with experimentalForceLongPolling to eliminate
 * "Could not reach Cloud Firestore backend. Connection failed 1 times. Most recent error: FirebaseError: [code=unavailable]"
 * which occurs in proxy/iframe/sandboxed browser environments.
 */
function createFirestoreInstance() {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, databaseId);
  } catch (_err) {
    // If already initialized, fallback to getFirestore
    return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
}

export const db = createFirestoreInstance();

// Test connection on boot per Firebase skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client operating in offline mode. Verifying network connection.');
    }
  }
}
testConnection();

// Skill-mandated error handling types and function
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function extractFirestoreErrorMessage(err: unknown): string {
  if (!err) return 'An unexpected error occurred with Firestore.';
  const rawMsg = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(rawMsg);
    if (parsed && typeof parsed.error === 'string') {
      return parsed.error;
    }
  } catch {
    // rawMsg is standard string
  }
  return rawMsg;
}

// Authentication Helpers
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMsg = typeof error?.message === 'string' ? error.message : '';

    // If the user dismissed or closed the popup window, or a concurrent popup was cancelled,
    // this is a benign user cancellation, NOT a system error.
    if (
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorCode === 'auth/user-cancelled' ||
      errorMsg.includes('auth/popup-closed-by-user') ||
      errorMsg.includes('popup-closed-by-user')
    ) {
      // Return null quietly without logging errors to console
      return null;
    }

    if (errorCode === 'auth/popup-blocked' || errorMsg.includes('popup-blocked')) {
      const blockedError = new Error(
        'The sign-in popup was blocked by your browser. Please allow popups for this page or open the app in a new window.'
      );
      (blockedError as any).code = 'auth/popup-blocked';
      throw blockedError;
    }

    if (errorCode === 'auth/unauthorized-domain' || errorMsg.includes('unauthorized-domain')) {
      const domainError = new Error(
        'This domain is not in the Firebase Auth authorized domains list. Please add this domain to Authorized Domains in Firebase Console.'
      );
      (domainError as any).code = 'auth/unauthorized-domain';
      throw domainError;
    }

    // Re-throw genuine errors
    throw error;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: UserProfile | null) => void) {
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      callback({
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || 'Reflective Writer',
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
      });
    } else {
      callback(null);
    }
  });
}

/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Firestore will throw a fatal error if any property contains undefined.
 * This utility recursively removes undefined keys or converts them to null.
 */
export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      return value === undefined ? null : value;
    })
  );
}

// User-Isolated Firestore Operations: /users/{userId}/entries/{entryId}
export async function saveUserJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId) throw new Error('User ID is required to persist journal entry.');
  if (!entry.id) throw new Error('Entry ID is required.');

  const path = `users/${userId}/entries/${entry.id}`;
  const entryRef = doc(db, 'users', userId, 'entries', entry.id);
  const cleanData = sanitizeForFirestore({
    ...entry,
    userId,
    updatedAt: Date.now(),
  });

  try {
    await setDoc(entryRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchUserJournalEntries(userId: string): Promise<JournalEntry[]> {
  if (!userId) return [];

  const path = `users/${userId}/entries`;
  const entriesRef = collection(db, 'users', userId, 'entries');
  const q = query(entriesRef, orderBy('updatedAt', 'desc'));

  try {
    const snapshot = await getDocs(q);
    const entries: JournalEntry[] = [];

    snapshot.forEach((docSnap) => {
      entries.push(docSnap.data() as JournalEntry);
    });

    return entries;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchUserJournalEntry(userId: string, entryId: string): Promise<JournalEntry | null> {
  if (!userId || !entryId) return null;

  const path = `users/${userId}/entries/${entryId}`;
  const entryRef = doc(db, 'users', userId, 'entries', entryId);

  try {
    const snap = await getDoc(entryRef);

    if (snap.exists()) {
      return snap.data() as JournalEntry;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteUserJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) throw new Error('User ID and Entry ID are required to delete entry.');
  const path = `users/${userId}/entries/${entryId}`;
  const entryRef = doc(db, 'users', userId, 'entries', entryId);

  try {
    await deleteDoc(entryRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

