import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { UserProfile, Course, UserRole } from '../types';
import { 
  Plus, 
  Users, 
  BookOpen, 
  Upload, 
  Trash2, 
  UserPlus, 
  Shield, 
  Search,
  MoreVertical,
  Loader2,
  FileText,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

interface AdminPanelProps {
  profile: UserProfile;
}

export default function AdminPanel({ profile }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'courses'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', code: '', facultyId: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const uSnap = await getDocs(collection(db, 'users'));
      setUsers(uSnap.docs.map(d => ({ ...d.data(), id: d.id } as unknown as UserProfile)));
      
      const cSnap = await getDocs(collection(db, 'courses'));
      setCourses(cSnap.docs.map(d => ({ ...d.data(), id: d.id } as unknown as Course)));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'users || courses');
    }
    setLoading(false);
  };

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setUploading(true);
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const data = results.data as any[];
        try {
          for (const row of data) {
            if (row.email && row.name && row.role) {
              // In production we'd create actual auth accounts or just DB entries
              // For demo, we just add to users collection
              await addDoc(collection(db, 'users'), {
                ...row,
                createdAt: serverTimestamp()
              });
            }
          }
          fetchData();
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, 'users');
        }
        setUploading(false);
      }
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv']
    }
  } as any);

  const addCourse = async () => {
    if (!newCourse.name || !newCourse.code || !newCourse.facultyId) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'courses'), {
        ...newCourse,
        id: crypto.randomUUID(),
        createdAt: serverTimestamp()
      });
      setNewCourse({ name: '', code: '', facultyId: '' });
      setShowAddCourse(false);
      fetchData();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'courses');
    }
    setLoading(false);
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, 'courses', id));
      fetchData();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `courses/${id}`);
    }
  };

  const graduates = users.filter(u => u.role === 'faculty');

  return (
    <div className="space-y-12">
      {/* Tabs */}
      <div className="flex gap-4 items-center">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-6 py-1 border border-brand rounded-full text-[10px] uppercase tracking-widest font-bold transition-all ${
            activeTab === 'users' ? 'bg-brand-text text-white' : 'opacity-40 hover:opacity-100'
          }`}
        >
          Identity Matrix
        </button>
        <button 
          onClick={() => setActiveTab('courses')}
          className={`px-6 py-1 border border-brand rounded-full text-[10px] uppercase tracking-widest font-bold transition-all ${
            activeTab === 'courses' ? 'bg-brand-text text-white' : 'opacity-40 hover:opacity-100'
          }`}
        >
          Curriculum Ledger
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Bulk Upload */}
            <div {...getRootProps()} className={`p-12 border-2 border-dashed transition-all cursor-pointer flex flex-col items-center text-center ${
              isDragActive ? 'border-brand-accent bg-brand-muted' : 'border-brand border-opacity-20 bg-white hover:border-opacity-100'
            }`}>
              <input {...getInputProps()} />
              <div className="p-4 bg-brand-muted border border-brand border-opacity-10 rounded-full text-brand-text mb-4">
                <Upload className="w-8 h-8 opacity-40" />
              </div>
              <span className="art-label">Bulk Protocol Import</span>
              <h3 className="text-xl art-heading italic">Drop CSV Data Matrix</h3>
              {uploading && <Loader2 className="animate-spin mt-4 text-brand-text" />}
            </div>

            {/* Manual Add User */}
            <div className="p-12 border border-brand bg-brand-muted flex flex-col justify-between">
              <div>
                <span className="art-label">Manual Entry</span>
                <h3 className="text-3xl art-heading italic leading-none mb-4">Create Digital Identity</h3>
                <p className="text-[10px] uppercase tracking-widest opacity-50 max-w-[200px]">Assign a teacher or student to the institutional ledger manually.</p>
              </div>
              <button className="art-button-primary mt-8 flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" /> Initialize User
              </button>
            </div>
          </div>

          <div className="border border-brand overflow-hidden">
            <div className="p-6 bg-brand-muted border-b border-brand flex items-center justify-between">
              <span className="art-label mb-0">Identity Registry</span>
              <div className="flex items-center gap-4">
                <div className="text-[10px] uppercase tracking-widest font-bold opacity-30 italic">Search // Registry</div>
                <div className="border-b border-brand border-opacity-20 flex items-center gap-2 px-1">
                  <Search className="w-3 h-3 opacity-30" />
                  <input type="text" placeholder="QUERY NAME..." className="bg-transparent outline-none text-[10px] uppercase tracking-widest font-bold w-48" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] font-bold text-brand-text/30 uppercase tracking-[0.2em] border-b border-brand border-opacity-10">
                  <tr>
                    <th className="px-8 py-4">Name</th>
                    <th className="px-8 py-4">Role</th>
                    <th className="px-8 py-4">Email Address</th>
                    <th className="px-8 py-4">Serial ID</th>
                    <th className="px-8 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand divide-opacity-10">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-brand-muted transition-colors font-sans">
                      <td className="px-8 py-4 text-sm font-bold">{u.name}</td>
                      <td className="px-8 py-4">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-brand border-opacity-20 ${
                          u.role === 'admin' ? 'text-purple-700 bg-purple-50' :
                          u.role === 'faculty' ? 'text-amber-700 bg-amber-50' : 'text-blue-700 bg-blue-50'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-xs opacity-60 italic">{u.email}</td>
                      <td className="px-8 py-4 text-[10px] font-mono tracking-tighter opacity-40">{u.studentId || '-'}</td>
                      <td className="px-8 py-4 text-right">
                        <button className="opacity-20 hover:opacity-100 transition-opacity"><MoreVertical className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="flex items-center justify-between pb-4 border-b border-brand border-opacity-10">
            <h3 className="text-4xl art-heading italic">Curriculum Matrix</h3>
            <button 
              onClick={() => setShowAddCourse(true)}
              className="art-button-primary py-3 px-8"
            >
              Initialize Course
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map(course => (
              <div key={course.id} className="border border-brand p-8 flex flex-col justify-between hover:bg-brand-muted transition-colors group relative">
                <button 
                  onClick={() => deleteCourse(course.id)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-all hover:text-[#C0392B]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div>
                  <span className="text-[10px] uppercase font-bold opacity-30 group-hover:text-brand-accent transition-colors tracking-[0.2em]">{course.code}</span>
                  <h4 className="text-3xl art-heading italic leading-none mt-2">{course.name}</h4>
                </div>
                <div className="mt-10 pt-6 border-t border-brand border-opacity-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-brand border-opacity-20 flex items-center justify-center bg-white">
                      <span className="text-[10px] font-bold">FA</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">
                      {users.find(u => u.uid === course.facultyId)?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      <AnimatePresence>
        {showAddCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-text/90 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-bg border border-brand max-w-md w-full"
            >
              <div className="p-6 border-b border-brand flex justify-between items-center">
                 <span className="art-label mb-0">Record Entry</span>
                <button onClick={() => setShowAddCourse(false)} className="opacity-40 hover:opacity-100 hover:text-brand-accent">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-10 space-y-6">
                <div>
                  <label className="art-label">Subject Identification</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ADVANCED NEURAL NETWORKS"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                    className="w-full p-4 bg-brand-muted border border-brand text-[10px] uppercase tracking-widest font-bold outline-none focus:bg-white transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="art-label">Protocol Code</label>
                    <input 
                      type="text" 
                      placeholder="ANN-205"
                      value={newCourse.code}
                      onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                      className="w-full p-4 bg-brand-muted border border-brand text-[10px] uppercase tracking-widest font-bold outline-none focus:bg-white transition-all uppercase"
                    />
                  </div>
                  <div>
                    <label className="art-label">Faculty Authority</label>
                    <select 
                      value={newCourse.facultyId}
                      onChange={(e) => setNewCourse({...newCourse, facultyId: e.target.value})}
                      className="w-full p-4 bg-brand-muted border border-brand text-[10px] uppercase tracking-widest font-bold outline-none focus:bg-white transition-all appearance-none"
                    >
                      <option value="">SELECT...</option>
                      {graduates.map(f => (
                        <option key={f.uid} value={f.uid}>{f.name.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  disabled={loading}
                  onClick={addCourse}
                  className="w-full py-4 mt-4 art-button-primary"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'COMMIT TO LEDGER'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
