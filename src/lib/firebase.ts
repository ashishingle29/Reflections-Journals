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
import type { JournalEntry, UserProfile, PlatformTelemetry, EntryCategory } from '../types';
import appConfig from '../../firebase-applet-config.json';

/**
 * Firebase Client Web Configuration
 * 
 * Note on GitHub Secret Scanning & Firebase Web API Keys:
 * In Firebase Web applications, the apiKey (AIzaSy...) is an IDENTIFIER used by the browser
 * to route requests to your Firebase project, NOT an administrative secret.
 * Google's official security architecture enforces data security strictly via Firestore Security Rules
 * (firestore.rules), which require authenticated user ownership (request.auth.uid == userId) for all operations.
 * 
 * Supports optional environment variable overrides for custom CI/CD pipelines.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appConfig.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with specific database ID if defined in applet config or env
const databaseId = 
  import.meta.env.VITE_FIRESTORE_DATABASE_ID ||
  (appConfig.firestoreDatabaseId && appConfig.firestoreDatabaseId !== '(default)'
    ? appConfig.firestoreDatabaseId
    : undefined);

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

const ADMIN_EMAILS = ['ashishingle589@gmail.com'];

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export async function syncUserProfile(
  firebaseUser: User,
  stats?: { totalReflections?: number; geocodedPlacesCount?: number }
): Promise<UserProfile> {
  const isAdmin = isUserAdmin(firebaseUser.email);
  const userRef = doc(db, 'users', firebaseUser.uid);

  let existingData: any = null;
  try {
    const existingSnap = await getDoc(userRef);
    if (existingSnap.exists()) {
      existingData = existingSnap.data();
    }
  } catch (err) {
    console.warn('Could not read existing user profile:', err);
  }

  const totalReflections = stats?.totalReflections ?? (existingData?.totalReflections ?? 0);
  const geocodedPlacesCount = stats?.geocodedPlacesCount ?? (existingData?.geocodedPlacesCount ?? 0);
  const existingRole = existingData?.role;

  const profile: UserProfile = {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || existingData?.displayName || 'Reflective Writer',
    email: firebaseUser.email || existingData?.email || null,
    photoURL: firebaseUser.photoURL || existingData?.photoURL || null,
    role: isAdmin ? 'admin' : (existingRole || 'user'),
    totalReflections,
    geocodedPlacesCount,
    createdAt: existingData?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  try {
    await setDoc(userRef, sanitizeForFirestore(profile), { merge: true });
  } catch (err) {
    console.warn('Profile sync warning:', err);
  }

  return profile;
}

export async function updateUserReflectionsStats(
  userId: string,
  totalReflections: number,
  geocodedPlacesCount: number
): Promise<void> {
  if (!userId || userId.startsWith('demo-')) return;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      sanitizeForFirestore({
        totalReflections,
        geocodedPlacesCount,
        updatedAt: Date.now(),
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn('User stats update warning (non-fatal):', err);
  }
}

export function subscribeToAuthState(callback: (user: UserProfile | null) => void) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const initialProfile: UserProfile = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || 'Reflective Writer',
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        role: isUserAdmin(firebaseUser.email) ? 'admin' : 'user',
      };
      callback(initialProfile);

      // Async sync to Firestore
      try {
        const synced = await syncUserProfile(firebaseUser);
        callback(synced);
      } catch {
        // Handled silently
      }
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

// Role-Based Access Control (RBAC): System Telemetry Operations
export async function fetchPlatformTelemetry(currentUser: UserProfile | null, userEntries: JournalEntry[]): Promise<PlatformTelemetry> {
  const isAdmin = currentUser?.role === 'admin' || (currentUser?.email && isUserAdmin(currentUser.email));
  if (!isAdmin) {
    const error = new Error('403 Forbidden: Missing administrative privileges to read /system_telemetry.');
    handleFirestoreError(error, OperationType.GET, 'system_telemetry/aggregate');
  }

  const categoryCounts: Record<EntryCategory, number> = {
    reflection: 0,
    gratitude: 0,
    brainstorm: 0,
    daily_log: 0,
    deep_thought: 0,
  };

  let totalWords = 0;
  let entriesWithLocation = 0;
  const locationMap = new Map<string, { count: number; lat: number; lng: number }>();

  userEntries.forEach((entry) => {
    if (categoryCounts[entry.category] !== undefined) {
      categoryCounts[entry.category]++;
    }
    if (entry.location && entry.location.placeName) {
      entriesWithLocation++;
      const key = entry.location.placeName;
      const current = locationMap.get(key) || { count: 0, lat: entry.location.lat, lng: entry.location.lng };
      current.count++;
      locationMap.set(key, current);
    }
    entry.turns.forEach((t) => {
      totalWords += t.content.trim().split(/\s+/).filter(Boolean).length;
    });
  });

  const locationsList = Array.from(locationMap.entries()).map(([placeName, info]) => ({
    placeName,
    count: info.count,
    lat: info.lat,
    lng: info.lng,
  }));

  const telemetry: PlatformTelemetry = {
    totalEntriesCount: userEntries.length,
    categoryCounts,
    totalWordCount: totalWords,
    entriesWithLocationCount: entriesWithLocation,
    locationsList,
    activeModelLadder: [
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
    ],
    serverStatus: 'ok',
    geminiKeyConfigured: true,
    lastCalculatedAt: Date.now(),
  };

  // Attempt to sync telemetry doc to Firestore /system_telemetry/aggregate
  try {
    const docRef = doc(db, 'system_telemetry', 'aggregate');
    await setDoc(docRef, sanitizeForFirestore(telemetry), { merge: true });
  } catch (err) {
    console.warn('System telemetry sync notice:', err);
  }

  return telemetry;
}

/**
 * Admin Operation: Fetch all registered users directory from /users.
 * Retrieves Name, Email ID, Total Reflections, and Geocoded Places for each real user.
 * Protected by Firestore Security Rules: isAdmin() is enforced.
 * NO DUMMY USERS: Exclusively returns real records stored in Cloud Firestore.
 */
export async function fetchAllUsersDirectory(currentUser: UserProfile | null): Promise<UserProfile[]> {
  const isAdmin = currentUser?.role === 'admin' || (currentUser?.email && isUserAdmin(currentUser.email));
  if (!isAdmin) {
    const error = new Error('403 Forbidden: Missing administrative privileges to query /users directory.');
    handleFirestoreError(error, OperationType.LIST, 'users');
  }

  // Ensure current user's profile is saved in Firestore so it's always included in the directory
  if (currentUser && !currentUser.uid.startsWith('demo-')) {
    try {
      const selfRef = doc(db, 'users', currentUser.uid);
      await setDoc(
        selfRef,
        sanitizeForFirestore({
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Administrator',
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          role: 'admin',
          totalReflections: currentUser.totalReflections ?? 0,
          geocodedPlacesCount: currentUser.geocodedPlacesCount ?? 0,
          updatedAt: Date.now(),
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn('Admin self-registration sync notice:', err);
    }
  }

  const registeredUsers: UserProfile[] = [];

  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      registeredUsers.push({
        uid: docSnap.id,
        displayName: data.displayName || 'Reflective Writer',
        email: data.email || null,
        photoURL: data.photoURL || null,
        role: data.role || (isUserAdmin(data.email) ? 'admin' : 'user'),
        totalReflections: typeof data.totalReflections === 'number' ? data.totalReflections : 0,
        geocodedPlacesCount: typeof data.geocodedPlacesCount === 'number' ? data.geocodedPlacesCount : 0,
        updatedAt: data.updatedAt || Date.now(),
        createdAt: data.createdAt || data.updatedAt || Date.now(),
      });
    });
  } catch (err: any) {
    console.error('Firestore user directory fetch error:', err);
    throw new Error(extractFirestoreErrorMessage(err));
  }

  // If the logged-in admin isn't returned from Firestore query, add them
  if (currentUser && !registeredUsers.some((u) => u.uid === currentUser.uid || (currentUser.email && u.email === currentUser.email))) {
    registeredUsers.push({
      uid: currentUser.uid,
      displayName: currentUser.displayName || 'Administrator',
      email: currentUser.email,
      photoURL: currentUser.photoURL,
      role: 'admin',
      totalReflections: currentUser.totalReflections ?? 0,
      geocodedPlacesCount: currentUser.geocodedPlacesCount ?? 0,
      updatedAt: Date.now(),
    });
  }

  // Sort by total reflections descending, then by name
  registeredUsers.sort((a, b) => {
    const diff = (b.totalReflections ?? 0) - (a.totalReflections ?? 0);
    if (diff !== 0) return diff;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });

  return registeredUsers;
}

/**
 * Admin Operation: Register a new real user profile directly into Cloud Firestore /users.
 */
export async function registerUserDirectly(userData: {
  displayName: string;
  email: string;
  role?: 'admin' | 'user';
  totalReflections?: number;
  geocodedPlacesCount?: number;
}): Promise<UserProfile> {
  const newUid = `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const newUser: UserProfile = {
    uid: newUid,
    displayName: userData.displayName.trim(),
    email: userData.email.trim(),
    photoURL: null,
    role: userData.role || (isUserAdmin(userData.email) ? 'admin' : 'user'),
    totalReflections: userData.totalReflections ?? 0,
    geocodedPlacesCount: userData.geocodedPlacesCount ?? 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const userRef = doc(db, 'users', newUid);
  await setDoc(userRef, sanitizeForFirestore(newUser));
  return newUser;
}

/**
 * Admin Operation: Delete a user record from /users in Cloud Firestore.
 */
export async function deleteUserFromDirectory(userId: string): Promise<void> {
  if (!userId) throw new Error('User ID is required to delete user.');
  const path = `users/${userId}`;
  const userRef = doc(db, 'users', userId);
  try {
    await deleteDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateUserRole(targetUserId: string, newRole: 'admin' | 'user'): Promise<void> {
  const userRef = doc(db, 'users', targetUserId);
  await setDoc(userRef, { role: newRole, updatedAt: Date.now() }, { merge: true });
}



