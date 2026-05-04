/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserProfile, UserRole } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  School, 
  Loader2,
  LayoutDashboard,
  Calendar,
  Settings,
  QrCode,
  FileText
} from 'lucide-react';

// Components
import StudentPanel from './components/StudentPanel';
import FacultyPanel from './components/FacultyPanel';
import AdminPanel from './components/AdminPanel';
import LoginPage from './components/LoginPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // New user logic - handled in LoginPage usually
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => auth.signOut();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginPage onProfileCreated={(p) => setProfile(p)} />;
  }

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-brand-text">
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex justify-between items-end border-b border-brand mb-8">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40 mb-1">
            Student Management // System v2.04
          </span>
          <h1 className="text-5xl font-serif italic tracking-tight uppercase leading-none">
            EduAttend Institute
          </h1>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex gap-2">
            <span className={`px-4 py-1 border border-brand rounded-full text-[10px] uppercase tracking-widest ${profile.role === 'faculty' ? 'bg-brand-text text-white' : 'opacity-40'}`}>Faculty</span>
            <span className={`px-4 py-1 border border-brand rounded-full text-[10px] uppercase tracking-widest ${profile.role === 'student' ? 'bg-brand-text text-white' : 'opacity-40'}`}>Student</span>
            <span className={`px-4 py-1 border border-brand rounded-full text-[10px] uppercase tracking-widest ${profile.role === 'admin' ? 'bg-brand-text text-white' : 'opacity-40'}`}>Admin</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-muted rounded-full flex items-center justify-center border border-brand group relative">
              <span className="text-xs font-bold uppercase">{profile.name.substring(0, 2)}</span>
              <button 
                onClick={handleLogout}
                className="absolute -top-1 -right-1 p-1 bg-white border border-brand rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={profile.role}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {profile.role === 'student' && <StudentPanel profile={profile} />}
            {profile.role === 'faculty' && <FacultyPanel profile={profile} />}
            {profile.role === 'admin' && <AdminPanel profile={profile} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

