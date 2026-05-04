import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { UserProfile, Course, Session, AttendanceRecord } from '../types';
import { 
  Plus, 
  History, 
  Users, 
  FileSpreadsheet, 
  QrCode, 
  Play, 
  Square,
  Clock,
  Loader2,
  Calendar,
  Search,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import Papa from 'papaparse';

interface FacultyPanelProps {
  profile: UserProfile;
}

export default function FacultyPanel({ profile }: FacultyPanelProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessionAttendance, setSessionAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [qrSecret, setQrSecret] = useState<string>('');

  useEffect(() => {
    fetchCourses();
    checkForActiveSession();
  }, []);

  const fetchCourses = async () => {
    try {
      const q = query(collection(db, 'courses'), where('facultyId', '==', profile.uid));
      const snap = await getDocs(q);
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'courses');
    }
    setLoading(false);
  };

  const checkForActiveSession = async () => {
    try {
      const q = query(
        collection(db, 'sessions'), 
        where('facultyId', '==', profile.uid),
        where('isActive', '==', true)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const s = { id: snap.docs[0].id, ...snap.docs[0].data() } as Session;
        setActiveSession(s);
        setQrSecret(s.qrSecret);
        subscribeToAttendance(s.id);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'sessions');
    }
  };

  const subscribeToAttendance = (sessionId: string) => {
    const q = query(collection(db, 'attendance'), where('sessionId', '==', sessionId));
    return onSnapshot(q, (snap) => {
      setSessionAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'attendance');
    });
  };

  const startSession = async () => {
    if (!selectedCourse) return;
    setLoading(true);
    const secret = Math.random().toString(36).substring(2, 15);
    try {
      const docRef = await addDoc(collection(db, 'sessions'), {
        id: crypto.randomUUID(),
        courseId: selectedCourse,
        facultyId: profile.uid,
        startTime: Date.now(),
        qrSecret: secret,
        isActive: true
      });
      const newSession: Session = {
        id: docRef.id,
        courseId: selectedCourse,
        facultyId: profile.uid,
        startTime: Date.now(),
        qrSecret: secret,
        isActive: true
      };
      setActiveSession(newSession);
      setQrSecret(secret);
      setShowSessionModal(false);
      subscribeToAttendance(docRef.id);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'sessions');
    }
    setLoading(false);
  };

  const stopSession = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'sessions', activeSession.id), {
        isActive: false,
        endTime: serverTimestamp()
      });
      setActiveSession(null);
      setSessionAttendance([]);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `sessions/${activeSession.id}`);
    }
    setLoading(false);
  };

  const exportAttendance = () => {
    const data = sessionAttendance.map(a => ({
      StudentUID: a.studentId,
      Timestamp: format(new Date(a.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      CourseID: a.courseId
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-12">
      {/* Active Session Card */}
      {activeSession ? (
        <section className="grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-5 flex flex-col justify-between">
            <div className="mb-8">
              <span className="text-xs uppercase tracking-widest font-bold text-brand-accent">Active Session // Broadcasting</span>
              <h2 className="text-6xl art-heading mt-2 uppercase">
                {courses.find(c => c.id === activeSession.courseId)?.name || 'Standard Session'}
              </h2>
              <p className="text-sm mt-4 max-w-sm opacity-60">
                Instructional broadcast in progress. QR code is dynamically bound to the current spatial-temporal window.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-10">
              <div className="relative">
                <div className="w-48 h-48 bg-white border border-brand p-2">
                  <div className="w-full h-full flex items-center justify-center">
                    <QRCodeSVG 
                      value={`${activeSession.id}:${qrSecret}`} 
                      size={180} 
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-brand-text text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                  Live Key: {qrSecret.substring(0, 8)}
                </div>
              </div>
              
              <div className="flex flex-col gap-4 w-full sm:w-auto">
                <div className="bg-brand-muted p-6 border border-brand w-full sm:w-48">
                  <span className="art-label">Verified Pulse</span>
                  <div className="text-4xl font-serif">{sessionAttendance.length} / 50</div>
                  <div className="w-full bg-brand-text h-1 mt-2 opacity-10"></div>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((sessionAttendance.length / 50) * 100, 100)}%` }}
                    className="bg-brand-text h-1 -mt-1"
                  />
                </div>
                <button 
                  onClick={stopSession}
                  className="w-full border border-brand py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-text hover:text-white transition-colors"
                >
                  Terminate Session
                </button>
              </div>
            </div>
            
            <div className="mt-8 flex items-center gap-6 opacity-30 group cursor-default">
              <div className="text-[10px] uppercase font-bold tracking-widest">Spatial Validation Active</div>
              <div className="flex-grow h-[1px] bg-brand-text"></div>
              <div className="text-xs font-serif italic">Broadcasting via EduAttend Node Alpha</div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 flex flex-col gap-8">
            <div className="bg-brand-muted border border-brand p-8 relative overflow-hidden">
               <div className="flex justify-between items-start mb-8">
                <div>
                  <span className="art-label">Data Matrix</span>
                  <h3 className="text-3xl art-heading">Live Roll Call</h3>
                </div>
                <button 
                  onClick={exportAttendance}
                  className="art-button-secondary flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export Protocol
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {sessionAttendance.length > 0 ? (
                  sessionAttendance.map((a, idx) => (
                    <div key={a.id} className="flex justify-between items-center border-b border-brand border-opacity-10 pb-2">
                       <div className="flex items-center gap-3">
                         <span className="text-[10px] opacity-30 font-mono">#{idx + 1}</span>
                         <span className="text-sm font-medium">{a.studentId.substring(0, 12)}...</span>
                       </div>
                       <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">Verified @ {format(new Date(a.timestamp), 'HH:mm:ss')}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center opacity-30 italic font-serif">
                    Waiting for student handshakes...
                  </div>
                )}
              </div>
            </div>

            <div className="bg-brand-text text-white p-8 flex flex-col justify-between h-48">
              <div className="flex justify-between">
                <h4 className="text-[10px] uppercase font-bold tracking-widest opacity-40 font-sans">Session Integrity</h4>
                <span className="text-[10px] opacity-40">SYSTEM REPORT</span>
              </div>
              <div className="relative">
                <span className="text-8xl art-heading italic leading-none">{sessionAttendance.length}</span>
                <span className="text-2xl font-serif absolute top-4 ml-1">pax</span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="bg-brand-muted border border-brand border-dashed p-20 text-center flex flex-col items-center">
          <span className="art-label mb-4">Awaiting Command</span>
          <h2 className="text-5xl art-heading mb-6 uppercase">Initialize Session</h2>
          <button 
            onClick={() => setShowSessionModal(true)}
            className="art-button-primary px-12 py-4"
          >
            Start Instructional Broadcast
          </button>
        </div>
      )}

      {/* Course List */}
      <section className="space-y-4 pt-12 border-t border-brand">
        <div className="flex items-center gap-6">
          <h3 className="text-xs uppercase font-bold tracking-[0.3em] opacity-40">Curriculum Assignment</h3>
          <div className="flex-grow h-[1px] bg-brand-text opacity-10"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map(course => (
            <div key={course.id} className="border border-brand p-6 flex flex-col justify-between hover:bg-brand-muted transition-colors group">
              <div>
                <span className="text-[10px] uppercase font-bold opacity-30 mb-1 block group-hover:text-brand-accent transition-colors">{course.code}</span>
                <h4 className="text-xl font-serif italic leading-tight">{course.name}</h4>
              </div>
              <button className="text-[10px] uppercase font-bold underline mt-6 text-left tracking-widest opacity-60 hover:opacity-100 transition-opacity">
                View Ledger
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Start Session Modal */}
      <AnimatePresence>
        {showSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">Start New Session</h3>
                <button onClick={() => setShowSessionModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <Plus className="rotate-45 w-6 h-6 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Course</label>
                  <select 
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="">Select a subject...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3">
                  <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    By starting the session, a unique QR code will be generated. Avoid sharing the same secret across classes to prevent unauthorized markings.
                  </p>
                </div>

                <button 
                  disabled={!selectedCourse || loading}
                  onClick={startSession}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Play className="w-5 h-5" /> Start Live QR Tracking</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
