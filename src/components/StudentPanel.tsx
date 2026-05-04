import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { UserProfile, AttendanceRecord, Course, Session } from '../types';
import { 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  History,
  TrendingUp,
  MapPin,
  Loader2,
  X,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { format } from 'date-fns';

interface StudentPanelProps {
  profile: UserProfile;
}

export default function StudentPanel({ profile }: StudentPanelProps) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanningMsg, setScanningMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch attendance
      const pathAtt = 'attendance';
      const attQuery = query(collection(db, pathAtt), where('studentId', '==', profile.uid));
      const attSnap = await getDocs(attQuery);
      const attList = attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setAttendance(attList);

      // Fetch courses
      const pathCourses = 'courses';
      const courseSnap = await getDocs(collection(db, pathCourses));
      const courseList = courseSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      setCourses(courseList);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attendance || courses');
    }
    setLoading(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    // Expected format: session_id:secret
    const [sessionId, secret] = decodedText.split(':');
    
    if (!sessionId || !secret) {
      setScanningMsg({ type: 'error', text: 'Invalid QR Code' });
      return;
    }

    setShowScanner(false);
    setLoading(true);

    try {
      // Verify session exists and is active
      const sessionPath = `sessions/${sessionId}`;
      const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
      if (!sessionDoc.exists()) {
        throw new Error("Session not found");
      }
      const session = sessionDoc.data() as Session;
      
      if (!session.isActive) {
        throw new Error("This session has expired");
      }

      if (session.qrSecret !== secret) {
        throw new Error("QR Code is outdated. Ask faculty for most recent code.");
      }

      // Check if already marked
      const attPath = 'attendance';
      const existingQuery = query(
        collection(db, attPath), 
        where('studentId', '==', profile.uid),
        where('sessionId', '==', sessionId)
      );
      const existingSnap = await getDocs(existingQuery);
      if (!existingSnap.empty) {
        setScanningMsg({ type: 'error', text: 'Attendance already marked for this session' });
        setLoading(false);
        return;
      }

      // Mark attendance
      await addDoc(collection(db, attPath), {
        id: crypto.randomUUID(),
        studentId: profile.uid,
        sessionId: sessionId,
        courseId: session.courseId,
        facultyId: session.facultyId,
        timestamp: Date.now(),
        verified: true
      });

      setScanningMsg({ type: 'success', text: 'Attendance marked successfully!' });
      fetchData();
    } catch (err: any) {
      if (err.message.includes('{')) {
        const info = JSON.parse(err.message);
        setScanningMsg({ type: 'error', text: `Access Denied: ${info.operationType}` });
      } else {
        setScanningMsg({ type: 'error', text: err.message || 'Verification failed' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (showScanner) {
      scanner = new Html5QrcodeScanner(
        'reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scanner.render(onScanSuccess, (err) => {});
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.warn(e));
      }
    };
  }, [showScanner]);

  const getAttendanceForCourse = (courseId: string) => {
    return attendance.filter(a => a.courseId === courseId).length;
  };

  const calculatePercentage = (courseId: string) => {
    // For demo, assuming total 10 lectures conducted. Real app would count sessions.
    const attended = getAttendanceForCourse(courseId);
    const total = 10; 
    return Math.min(Math.round((attended / total) * 100), 100);
  };

  if (loading && attendance.length === 0) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-12">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="art-card flex flex-col justify-between h-40">
          <span className="art-label">Cumulative Matrix</span>
          <div className="flex items-baseline gap-1">
            <span className="text-7xl art-heading">84</span>
            <span className="text-2xl art-heading">%</span>
          </div>
        </div>
        <div className="art-card flex flex-col justify-between h-40">
          <span className="art-label">Verified Handshakes</span>
          <div className="text-7xl art-heading">{attendance.length}</div>
        </div>
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => setShowScanner(true)}
            className="art-button-primary h-full flex flex-col items-center justify-center gap-2 group"
          >
            <QrCode className="w-8 h-8 group-active:scale-95 transition-transform" />
            <span>Identify & Mark</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {scanningMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-6 border border-brand flex items-center justify-between ${
              scanningMsg.type === 'success' ? 'bg-[#E6F3E6] text-[#2D5A27]' : 'bg-[#F9E6E6] text-[#C0392B]'
            }`}
          >
            <div className="flex items-center gap-3">
              {scanningMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-xs uppercase tracking-widest font-bold font-sans">System Message // {scanningMsg.text}</span>
            </div>
            <button onClick={() => setScanningMsg(null)}><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Subject wise cards */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-6">
            <h2 className="text-xs uppercase font-bold tracking-[0.3em] opacity-40 whitespace-nowrap">
              Academic Compliance
            </h2>
            <div className="flex-grow h-[1px] bg-brand-text opacity-10"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map(course => {
              const perc = calculatePercentage(course.id);
              return (
                <div key={course.id} className="border border-brand p-6 bg-brand-muted relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] uppercase font-bold opacity-30 group-hover:text-brand-accent transition-colors tracking-tighter">{course.code}</span>
                      <h3 className="text-2xl art-heading leading-tight">{course.name}</h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Presence Matrix</span>
                      <span className={`text-sm font-serif italic ${perc < 75 ? 'text-[#C0392B]' : 'text-brand-text'}`}>{perc}%</span>
                    </div>
                    <div className="w-full bg-white border border-brand border-opacity-10 h-1.5 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${perc}%` }}
                        className={`h-full ${perc < 75 ? 'bg-[#C0392B]' : 'bg-brand-text'}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* History */}
        <section className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-6">
            <h2 className="text-xs uppercase font-bold tracking-[0.3em] opacity-40 whitespace-nowrap">
              Temporal Log
            </h2>
            <div className="flex-grow h-[1px] bg-brand-text opacity-10"></div>
          </div>
          <div className="bg-brand-muted border border-brand divide-y divide-brand divide-opacity-10">
            {attendance.sort((a,b) => b.timestamp - a.timestamp).slice(0, 8).map(record => (
              <div key={record.id} className="p-4 flex flex-col gap-1 hover:bg-white transition-colors cursor-default">
                <div className="flex justify-between">
                  <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">
                    {record.timestamp ? format(new Date(record.timestamp), 'MMM dd // HH:mm') : 'PENDING'}
                  </span>
                  <div className="flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Verified</span>
                  </div>
                </div>
                <p className="text-sm font-serif italic leading-none mt-1">
                  {courses.find(c => c.id === record.courseId)?.name || 'Protocol Registry'}
                </p>
              </div>
            ))}
            {attendance.length === 0 && (
              <div className="p-12 text-center opacity-30 italic font-serif text-sm">
                Temporal records are currently empty.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/90 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-bg border border-brand overflow-hidden max-w-sm w-full relative"
            >
              <div className="p-4 border-b border-brand flex justify-between items-center">
                <span className="art-label mb-0">Spectral Imaging</span>
                <button onClick={() => setShowScanner(false)} className="hover:text-brand-accent transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8">
                <div id="reader" className="overflow-hidden border border-brand grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all"></div>
                <div className="mt-8 flex items-start gap-4 opacity-40">
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <p className="text-[10px] uppercase font-bold tracking-widest leading-loose">
                    Position yourself within the mapped classroom boundaries to satisfy geofencing constraints.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
;
}
