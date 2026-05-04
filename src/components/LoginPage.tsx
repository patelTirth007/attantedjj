import React, { useState } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { School, ShieldCheck, User as UserIcon, Users, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginPageProps {
  onProfileCreated: (profile: UserProfile) => void;
}

export default function LoginPage({ onProfileCreated }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    if (!selectedRole) {
      setError("Please select your role first.");
      return;
    }

    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const docRef = doc(db, 'users', user.uid);
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }

      if (docSnap?.exists()) {
        const profile = docSnap.data() as UserProfile;
        onProfileCreated(profile);
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || 'User',
          role: selectedRole,
          createdAt: Date.now(),
        };
        try {
          await setDoc(docRef, {
            ...newProfile,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
        onProfileCreated(newProfile);
      }
    } catch (err: any) {
      // If it's the JSON error from handleFirestoreError, parse it for display
      try {
        const info = JSON.parse(err.message);
        setError(`Security Rule Denial: ${info.operationType} on ${info.path}`);
      } catch {
        setError(err.message || "Failed to sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4 flex-col">
      <div className="mb-12 text-center">
        <span className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-30 mb-2 block italic">Access Management // Security Layer</span>
        <h1 className="text-7xl font-serif italic tracking-tight uppercase leading-none">EduAttend</h1>
        <p className="text-sm mt-4 opacity-50 font-medium">Please authenticate using your institutional digital identity.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-brand-muted border border-brand p-10 space-y-10"
      >
        <div className="space-y-4">
          <span className="art-label text-center">Protocol Role Selection</span>
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'student', icon: UserIcon, label: 'Student' },
              { id: 'faculty', icon: Users, label: 'Faculty' },
              { id: 'admin', icon: ShieldCheck, label: 'Admin' }
            ].map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id as UserRole)}
                className={`flex flex-col items-center p-4 border transition-all ${
                  selectedRole === role.id 
                    ? 'border-brand bg-brand-text text-white' 
                    : 'border-brand border-opacity-10 opacity-40 hover:opacity-100 hover:border-opacity-30'
                }`}
              >
                <role.icon className="w-5 h-5 mb-2" />
                <span className="text-[10px] uppercase font-bold tracking-widest">{role.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-white border border-brand text-[10px] uppercase tracking-wider font-bold text-[#C0392B] italic">
            Error // {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 bg-brand-text text-white text-xs uppercase tracking-[0.2em] font-bold transition-all hover:bg-opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Initialize Identity</span>
            </>
          )}
        </button>

        <p className="text-center text-[9px] uppercase tracking-widest opacity-30 font-bold max-w-[240px] mx-auto leading-relaxed">
          Authorization required for academic record persistence.
        </p>
      </motion.div>
    </div>
  );
}
