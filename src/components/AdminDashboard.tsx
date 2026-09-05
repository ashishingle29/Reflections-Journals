import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  MapPin,
  BookOpen,
  ArrowLeft,
  Mail,
  UserCheck,
  User as UserIcon,
  Lock,
  CheckCircle2,
  Sparkles,
  UserPlus,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import type { UserProfile, JournalEntry } from '../types';
import {
  fetchAllUsersDirectory,
  isUserAdmin,
  registerUserDirectly,
  deleteUserFromDirectory,
  extractFirestoreErrorMessage,
} from '../lib/firebase';

interface AdminDashboardProps {
  currentUser: UserProfile | null;
  entries: JournalEntry[];
  onReturnToJournal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  entries,
  onReturnToJournal,
}) => {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Register User Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [newUserReflections, setNewUserReflections] = useState(0);
  const [newUserPlaces, setNewUserPlaces] = useState(0);
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userPendingDelete, setUserPendingDelete] = useState<UserProfile | null>(null);

  const realIsAdmin = currentUser
    ? currentUser.role === 'admin' || isUserAdmin(currentUser.email)
    : false;

  const loadDirectory = async () => {
    setIsLoading(true);
    setErrorNotice(null);

    try {
      if (!realIsAdmin) {
        throw new Error('403 Forbidden: Missing administrative privileges to inspect the registered users directory.');
      }

      const fetchedUsers = await fetchAllUsersDirectory(currentUser);

      // Merge current live session stats for the logged-in admin user
      const merged = fetchedUsers.map((u) => {
        if (currentUser && (u.uid === currentUser.uid || (currentUser.email && u.email === currentUser.email))) {
          const liveReflections = entries.length;
          const liveLocations = entries.filter((e) => e.location?.placeName).length;
          return {
            ...u,
            displayName: currentUser.displayName || u.displayName,
            totalReflections: Math.max(liveReflections, u.totalReflections ?? 0),
            geocodedPlacesCount: Math.max(liveLocations, u.geocodedPlacesCount ?? 0),
          };
        }
        return u;
      });

      setUsersList(merged);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to load user directory.');
      setUsersList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, [entries.length, realIsAdmin]);

  const handleRegisterUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    setIsSubmittingNewUser(true);
    setErrorNotice(null);
    try {
      await registerUserDirectly({
        displayName: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        totalReflections: Number(newUserReflections) || 0,
        geocodedPlacesCount: Number(newUserPlaces) || 0,
      });

      setSuccessNotice(`Successfully registered ${newUserName.trim()} (${newUserEmail.trim()}) to Cloud Firestore.`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('user');
      setNewUserReflections(0);
      setNewUserPlaces(0);
      setIsRegisterModalOpen(false);
      await loadDirectory();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to register new user in Firestore.');
    } finally {
      setIsSubmittingNewUser(false);
    }
  };

  const handleRequestDelete = (userToDelete: UserProfile) => {
    if (userToDelete.uid === currentUser?.uid || (currentUser?.email && userToDelete.email === currentUser.email)) {
      setErrorNotice('Cannot delete your active administrator account.');
      return;
    }
    setErrorNotice(null);
    setUserPendingDelete(userToDelete);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userPendingDelete) return;

    setDeletingUserId(userPendingDelete.uid);
    setErrorNotice(null);
    try {
      await deleteUserFromDirectory(userPendingDelete.uid);
      // Optimistically update local users directory immediately
      setUsersList((prev) => prev.filter((u) => u.uid !== userPendingDelete.uid));
      setSuccessNotice(`Removed user ${userPendingDelete.displayName || userPendingDelete.email} from Cloud Firestore directory.`);
      setUserPendingDelete(null);
      await loadDirectory();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      console.error('Delete user error:', err);
      setErrorNotice(extractFirestoreErrorMessage(err) || 'Failed to delete user from Firestore.');
    } finally {
      setDeletingUserId(null);
    }
  };

  // Search filtering by Name or Email ID
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return usersList;

    return usersList.filter((u) => {
      const name = (u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [usersList, searchQuery]);

  // Aggregate totals
  const totalRegisteredUsers = usersList.length;
  const totalPlatformReflections = useMemo(() => {
    return usersList.reduce((acc, curr) => acc + (curr.totalReflections || 0), 0);
  }, [usersList]);
  const totalGeocodedPlaces = useMemo(() => {
    return usersList.reduce((acc, curr) => acc + (curr.geocodedPlacesCount || 0), 0);
  }, [usersList]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-stone-950 text-stone-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-800">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-stone-100 tracking-tight">
                Administrative Control
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-stone-400">
              Registered users directory showing real Cloud Firestore accounts, reflection volume, and geocoded places
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-register-user-modal-trigger"
              onClick={() => setIsRegisterModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-stone-950 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Register User</span>
            </button>
            <button
              id="btn-refresh-user-directory"
              onClick={loadDirectory}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700/80 text-xs font-medium text-stone-300 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              id="btn-back-to-journal"
              onClick={onReturnToJournal}
              className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Journal</span>
            </button>
          </div>
        </div>

        {/* Success Notice Banner */}
        {successNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successNotice}</span>
            </div>
            <button
              onClick={() => setSuccessNotice(null)}
              className="text-emerald-400 hover:text-emerald-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Access Denied Shield (If user is not admin) */}
        {!realIsAdmin ? (
          <div className="p-8 rounded-2xl bg-red-950/20 border border-red-900/60 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center text-red-400 mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-red-200">
              403 Forbidden: Administrative Access Only
            </h3>
            <p className="text-xs sm:text-sm text-red-300 max-w-md mx-auto leading-relaxed">
              Standard users cannot view the user directory. Administrative access is restricted exclusively to designated administrators.
            </p>
            <button
              onClick={onReturnToJournal}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition cursor-pointer inline-flex items-center gap-2 mt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Journal
            </button>
          </div>
        ) : (
          <>
            {/* Quick 3-Stat Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-400 font-medium">Registered Users</span>
                  <div className="text-2xl font-bold text-stone-100 font-mono mt-1">
                    {totalRegisteredUsers}
                  </div>
                  <span className="text-[11px] text-stone-500">Platform Accounts</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-stone-800/80 border border-stone-700 flex items-center justify-center text-amber-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-400 font-medium">Total Reflections</span>
                  <div className="text-2xl font-bold text-stone-100 font-mono mt-1">
                    {totalPlatformReflections}
                  </div>
                  <span className="text-[11px] text-stone-500">Across all user accounts</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-stone-800/80 border border-stone-700 flex items-center justify-center text-emerald-400">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-400 font-medium">Geocoded Places</span>
                  <div className="text-2xl font-bold text-stone-100 font-mono mt-1">
                    {totalGeocodedPlaces}
                  </div>
                  <span className="text-[11px] text-stone-500">Sanctuaries pinned on map</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-stone-800/80 border border-stone-700 flex items-center justify-center text-sky-400">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Users Directory Card & Table */}
            <div className="rounded-2xl bg-stone-900 border border-stone-800 overflow-hidden shadow-sm">
              {/* Table Controls Header */}
              <div className="p-4 sm:p-5 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/90">
                <div>
                  <h2 className="text-base font-semibold text-stone-100 flex items-center gap-2">
                    <span>Registered Users Directory</span>
                    <span className="px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-[11px] font-mono text-stone-300">
                      {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                    </span>
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    User profiles and aggregate activity metrics
                  </p>
                </div>

                {/* Filter / Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-search-users"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-3 py-1.5 bg-stone-950 border border-stone-700/80 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-amber-500 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Error Notice if any */}
              {errorNotice && (
                <div className="p-4 bg-red-950/40 border-b border-red-900/60 text-xs text-red-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorNotice}</span>
                </div>
              )}

              {/* Desktop / Tablet Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-800 bg-stone-950/60 text-stone-400 font-medium uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 sm:px-6">User Name</th>
                      <th className="py-3 px-4 sm:px-6">Email ID</th>
                      <th className="py-3 px-4 text-center">Total Reflections</th>
                      <th className="py-3 px-4 text-center">Geocoded Places</th>
                      <th className="py-3 px-4 text-center">Role</th>
                      <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/80">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-stone-400">
                          <div className="w-6 h-6 border-2 border-stone-800 border-t-amber-400 rounded-full animate-spin mx-auto mb-2" />
                          <span className="text-xs font-serif">Loading real registered users from Firestore...</span>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-stone-400">
                          <UserIcon className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                          <p className="text-sm font-medium text-stone-300">
                            {searchQuery ? `No users match "${searchQuery}"` : 'No registered users found'}
                          </p>
                          <p className="text-xs text-stone-500 mt-1">
                            {searchQuery
                              ? 'Try adjusting your search terms.'
                              : 'Click "+ Register User" above to add a user to Cloud Firestore.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isCurrent = currentUser?.uid === u.uid || (currentUser?.email && u.email === currentUser.email);
                        const initials = (u.displayName || u.email || 'U')
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();

                        return (
                          <tr
                            key={u.uid}
                            className={`hover:bg-stone-800/40 transition-colors ${
                              isCurrent ? 'bg-amber-500/5' : ''
                            }`}
                          >
                            {/* User Name & Avatar */}
                            <td className="py-3.5 px-4 sm:px-6">
                              <div className="flex items-center gap-3">
                                {u.photoURL ? (
                                  <img
                                    src={u.photoURL}
                                    alt={u.displayName || 'User'}
                                    referrerPolicy="no-referrer"
                                    className="w-8 h-8 rounded-full border border-stone-700 object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-xs font-semibold text-amber-300">
                                    {initials}
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-stone-100 flex items-center gap-1.5">
                                    <span>{u.displayName || 'Reflective Contemplator'}</span>
                                    {isCurrent && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-500/30">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-stone-500 font-mono">
                                    UID: {u.uid.slice(0, 10)}...
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Email ID */}
                            <td className="py-3.5 px-4 sm:px-6 font-mono text-stone-300">
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                                <span className="truncate max-w-[220px]">
                                  {u.email || 'No email provided'}
                                </span>
                              </div>
                            </td>

                            {/* Total Reflections */}
                            <td className="py-3.5 px-4 text-center font-mono">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-800 text-stone-200 font-semibold text-xs">
                                <BookOpen className="w-3 h-3 text-amber-400" />
                                {u.totalReflections ?? 0}
                              </span>
                            </td>

                            {/* Geocoded Places */}
                            <td className="py-3.5 px-4 text-center font-mono">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-800 text-stone-200 font-semibold text-xs">
                                <MapPin className="w-3 h-3 text-sky-400" />
                                {u.geocodedPlacesCount ?? 0}
                              </span>
                            </td>

                            {/* Role Badge */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  u.role === 'admin'
                                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                                    : 'bg-stone-800/80 text-stone-300 border-stone-700'
                                }`}
                              >
                                {u.role === 'admin' ? (
                                  <>
                                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                                    Administrator
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3 h-3 text-stone-400" />
                                    User
                                  </>
                                )}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 sm:px-6 text-right">
                              {isCurrent ? (
                                <span className="text-[11px] text-stone-500 italic">Active Account</span>
                              ) : (
                                <button
                                  id={`btn-delete-user-${u.uid}`}
                                  onClick={() => handleRequestDelete(u)}
                                  disabled={deletingUserId === u.uid}
                                  className="p-1.5 rounded-lg bg-stone-800/60 hover:bg-red-950 hover:text-red-300 text-stone-400 border border-stone-700/60 hover:border-red-800 transition cursor-pointer disabled:opacity-50"
                                  title={`Delete ${u.displayName || u.email} from Firestore directory`}
                                  aria-label={`Delete ${u.displayName || u.email}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-stone-800/80">
                {isLoading ? (
                  <div className="py-12 text-center text-stone-400">
                    <div className="w-6 h-6 border-2 border-stone-800 border-t-amber-400 rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs font-serif">Loading users...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-10 text-center text-stone-400 p-4">
                    <p className="text-sm font-medium text-stone-300">No registered users found</p>
                    <p className="text-xs text-stone-500 mt-1">Use the "+ Register User" button to register an account.</p>
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isCurrent = currentUser?.uid === u.uid || (currentUser?.email && u.email === currentUser.email);
                    const initials = (u.displayName || u.email || 'U')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <div key={u.uid} className={`p-4 space-y-2.5 ${isCurrent ? 'bg-amber-500/5' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {u.photoURL ? (
                              <img
                                src={u.photoURL}
                                alt={u.displayName || 'User'}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-full border border-stone-700 object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-xs font-semibold text-amber-300">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-stone-100 text-xs flex items-center gap-1.5">
                                <span className="truncate">{u.displayName || 'Reflective Contemplator'}</span>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-500/30">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-400 font-mono flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 text-stone-500 shrink-0" />
                                <span className="truncate max-w-[180px]">{u.email || 'Private'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                u.role === 'admin'
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : 'bg-stone-800 text-stone-300 border-stone-700'
                              }`}
                            >
                              {u.role === 'admin' ? 'Admin' : 'User'}
                            </span>
                            {!isCurrent && (
                              <button
                                id={`btn-delete-user-mobile-${u.uid}`}
                                onClick={() => handleRequestDelete(u)}
                                disabled={deletingUserId === u.uid}
                                className="p-1.5 rounded bg-stone-800 hover:bg-red-950 text-stone-400 hover:text-red-300 border border-stone-700/60 hover:border-red-800 transition cursor-pointer disabled:opacity-50"
                                title={`Delete ${u.displayName || u.email}`}
                                aria-label={`Delete ${u.displayName || u.email}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Counts Grid */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="p-2 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                            <span className="text-[11px] text-stone-400 flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-amber-400" />
                              Reflections
                            </span>
                            <span className="font-mono text-xs font-semibold text-stone-200">
                              {u.totalReflections ?? 0}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                            <span className="text-[11px] text-stone-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-sky-400" />
                              Places
                            </span>
                            <span className="font-mono text-xs font-semibold text-stone-200">
                              {u.geocodedPlacesCount ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Privacy Architecture Notice */}
            <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800/80 flex items-start gap-3 text-xs text-stone-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-stone-300">Privacy-by-Design Architecture:</strong> Administrators can monitor registered user profiles and aggregate volume metrics (Total Reflections, Geocoded Places), while individual diary reflections remain strictly isolated under <code className="text-stone-300 font-mono">/users/{'{userId}'}/entries</code> and cannot be read by any external account.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Modal: Register New User to Cloud Firestore */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-100">Register User to Directory</h3>
                  <p className="text-[11px] text-stone-400">Add a real user profile to Cloud Firestore</p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-stone-400 hover:text-stone-200 p-1 rounded-lg hover:bg-stone-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterUserSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  User Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-hidden focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Email ID <span className="text-amber-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. aarav.sharma@example.com"
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-hidden focus:border-amber-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    Account Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-hidden focus:border-amber-500 transition cursor-pointer"
                  >
                    <option value="user">User (Standard)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    Total Reflections
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newUserReflections}
                    onChange={(e) => setNewUserReflections(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-hidden focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Geocoded Places Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={newUserPlaces}
                  onChange={(e) => setNewUserPlaces(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-hidden focus:border-amber-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewUser || !newUserName.trim() || !newUserEmail.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingNewUser ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                      <span>Saving to Firestore...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save to Cloud Firestore</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete User Confirmation Modal (No blocked iframe window.confirm) */}
      {userPendingDelete && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !deletingUserId && setUserPendingDelete(null)}
        >
          <div
            className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden text-stone-100"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-dialog-title"
          >
            {/* Header */}
            <div className="p-5 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 id="delete-user-dialog-title" className="font-semibold text-base text-stone-100">
                  Delete Registered User
                </h3>
              </div>
              <button
                onClick={() => setUserPendingDelete(null)}
                disabled={!!deletingUserId}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition cursor-pointer disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
              <p className="text-sm text-stone-300 leading-relaxed">
                Are you sure you want to remove user{' '}
                <span className="text-stone-100 font-semibold font-serif">
                  "{userPendingDelete.displayName || userPendingDelete.email}"
                </span>{' '}
                from Cloud Firestore?
              </p>
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs space-y-1 font-mono text-stone-400">
                <div>
                  <span className="text-stone-500">Email:</span> {userPendingDelete.email || 'None'}
                </div>
                <div>
                  <span className="text-stone-500">UID:</span> {userPendingDelete.uid}
                </div>
                <div>
                  <span className="text-stone-500">Reflections:</span>{' '}
                  {userPendingDelete.totalReflections ?? 0} |{' '}
                  <span className="text-stone-500">Places:</span>{' '}
                  {userPendingDelete.geocodedPlacesCount ?? 0}
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/30 border border-red-900/40 text-xs text-red-300/90 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>
                  This will permanently delete this user document from the Cloud Firestore{' '}
                  <code className="font-mono bg-red-950/60 px-1 py-0.2 rounded border border-red-800/40">
                    /users
                  </code>{' '}
                  collection. This action cannot be undone.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-stone-950/60 border-t border-stone-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUserPendingDelete(null)}
                disabled={!!deletingUserId}
                className="px-4 py-2 text-xs font-medium text-stone-300 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-user"
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={!!deletingUserId}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow transition cursor-pointer disabled:opacity-50 min-h-[36px]"
              >
                {deletingUserId ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
