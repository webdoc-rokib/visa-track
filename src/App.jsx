import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  onSnapshot, 
  serverTimestamp,
  query,
  orderBy,
  where,
  getDocs,
  setDoc,
  increment,
  runTransaction,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { 
  Briefcase, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Search, 
  Plus, 
  User, 
  LogOut, 
  Calendar,
  Printer,
  ArrowRight,
  Filter,
  DollarSign,
  Send,
  MapPin,
  Sparkles,
  MessageSquare,
  Copy,
  X,
  Shield,
  Lock,
  Trash2,
  Users,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Globe,
  Layout,
  List,
  TrendingUp,
  CheckSquare,
  Settings
} from 'lucide-react';

// --- Firebase Configuration & Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyDm95mrI7Cu9Ghmsux3q70RPwkP01zB8ig",
  authDomain: "visa-track-app.firebaseapp.com",
  projectId: "visa-track-app",
  storageBucket: "visa-track-app.firebasestorage.app",
  messagingSenderId: "290385935838",
  appId: "1:290385935838:web:69af424011897698be314f"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "production-v1";

// --- Gemini API Helper ---
const callGemini = async (prompt) => {
  const apiKey = "AIzaSyDgJsStJLfGWmZiKsyP9KGOsc1jgvNp060"; // Injected at runtime
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate text.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI service.";
  }
};

// --- Constants & Enums ---
const ROLES = {
  SALES: 'Sales Representative',
  PROCESSING: 'Processing Agent',
  ADMIN: 'Manager/Admin'
};

const STATUS = {
  RECEIVED_SALES: { label: 'Received (Sales)', color: 'bg-blue-100 text-blue-800', icon: Briefcase },
  HANDOVER_PROCESSING: { label: 'In Processing', color: 'bg-purple-100 text-purple-800', icon: ArrowRight },
  DOCS_PENDING: { label: 'Docs Pending', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  PAYMENT_PENDING: { label: 'Payment Pending', color: 'bg-orange-100 text-orange-800', icon: DollarSign },
  SUBMITTED: { label: 'Submitted to Embassy', color: 'bg-indigo-100 text-indigo-800', icon: Send },
  FOLLOW_UP: { label: 'Follow Up Required', color: 'bg-red-100 text-red-800', icon: Clock },
  DONE: { label: 'Result Received', color: 'bg-green-100 text-green-800', icon: CheckCircle },
};

const RESULTS = {
  APPROVED: { label: 'Visa Approved', color: 'text-green-600', icon: ThumbsUp },
  REJECTED: { label: 'Visa Rejected', color: 'text-red-600', icon: ThumbsDown },
};

// --- Helper Functions ---
const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getStartOf = (period) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  
  if (period === 'week') {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
    start.setDate(diff);
  } else if (period === 'month') {
    start.setDate(1);
  }
  return start;
};

// --- Main Component ---
export default function VisaTrackApp() {
  const [user, setUser] = useState(null);
  const [appUser, setAppUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [files, setFiles] = useState([]);
  const [destinations, setDestinations] = useState([]); // Shared state for destinations
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      const savedUser = localStorage.getItem('visaTrackUser');
      if (savedUser) setAppUser(JSON.parse(savedUser));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Fetch Files
    const qFiles = collection(db, 'artifacts', appId, 'public', 'data', 'visa_files');
    const unsubFiles = onSnapshot(qFiles, (snapshot) => {
      const filesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      filesData.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setFiles(filesData);
      setLoading(false);
    });

    // Fetch Destinations
    const destRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'destinations');
    const unsubDest = onSnapshot(destRef, (docSnap) => {
      if (docSnap.exists()) {
        setDestinations(docSnap.data().items || []);
      } else {
        // Initialize defaults if not exists
        setDestinations(['Canada', 'UK', 'USA', 'Schengen Area', 'Australia', 'Dubai']);
      }
    });

    return () => {
      unsubFiles();
      unsubDest();
    };
  }, [user]);

  // --- Actions ---
  const handleLogin = (userProfile) => {
    setAppUser(userProfile);
    localStorage.setItem('visaTrackUser', JSON.stringify(userProfile));
  };

  const handleLogout = () => {
    setAppUser(null);
    localStorage.removeItem('visaTrackUser');
    setActiveTab('dashboard'); 
  };

  const addNewFile = async (data) => {
    if (!appUser) return;
    
    // Simple ID generation for stability
    const fileId = `VT-${Math.floor(10000 + Math.random() * 90000)}`;
    
    const newFile = {
      fileId: fileId,
      applicantName: data.applicantName,
      passportNo: data.passportNo,
      contactNo: data.contactNo,
      destination: data.destination,
      status: 'RECEIVED_SALES',
      assignedTo: appUser.name,
      createdBy: appUser.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      visaResult: null, 
      history: [{
        action: 'File Received & Registered',
        status: 'RECEIVED_SALES',
        performedBy: appUser.name,
        timestamp: Date.now()
      }]
    };
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'visa_files'), newFile);
    setActiveTab('dashboard');
  };

  const openUpdateModal = (file, action) => {
    setSelectedFile(file);
    setSelectedAction(action);
    setModalOpen(true);
  };

  const handleStatusUpdate = async (note, result = null) => {
    if (!appUser || !selectedFile || !selectedAction) return;

    let actionText = `Updated status to ${STATUS[selectedAction].label}`;
    if (result) {
      actionText = `Result Received: ${RESULTS[result].label}`;
    }

    const newHistoryItem = {
      action: note ? `${actionText} - Note: ${note}` : actionText,
      status: selectedAction,
      result: result,
      performedBy: appUser.name,
      timestamp: Date.now()
    };

    const updateData = {
      status: selectedAction,
      updatedAt: serverTimestamp(),
      assignedTo: selectedAction === 'HANDOVER_PROCESSING' ? 'Processing Team' : appUser.name,
      history: [newHistoryItem, ...selectedFile.history]
    };

    if (result) {
      updateData.visaResult = result;
    }

    const fileRef = doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', selectedFile.id);
    await updateDoc(fileRef, updateData);
    setModalOpen(false);
  };

  // --- Render Logic ---
  if (!user || loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading System...</div>;
  
  if (!appUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <nav className="bg-white border-b sticky top-0 z-10 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">VisaTrack Pro</h1>
                <p className="text-xs text-slate-500">Agency File Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
               <div className="hidden md:flex gap-1">
                 <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={Layout}>Dashboard</NavButton>
                 <NavButton active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} icon={List}>Pipeline</NavButton>
                 <NavButton active={activeTab === 'add'} onClick={() => setActiveTab('add')} icon={Plus}>New File</NavButton>
                 <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={Activity}>Stats</NavButton>
                 {appUser.role === ROLES.ADMIN && (
                   <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={Shield}>Admin</NavButton>
                 )}
               </div>

               <div className="flex items-center gap-3 pl-6 border-l">
                 <div className="text-right hidden sm:block">
                   <p className="text-sm font-medium text-slate-900">{appUser.name}</p>
                   <p className="text-xs text-slate-500">{appUser.role}</p>
                 </div>
                 <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                   <LogOut className="h-5 w-5" />
                 </button>
               </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard 
            files={files} 
            user={appUser} 
            destinations={destinations}
            onOpenUpdateModal={openUpdateModal} 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'pipeline' && <PipelineView files={files} />}
        {activeTab === 'add' && (
          <AddFileForm 
            destinations={destinations} 
            onSubmit={addNewFile} 
            onCancel={() => setActiveTab('dashboard')} 
          />
        )}
        {activeTab === 'reports' && <StatisticalReports files={files} currentUser={appUser} />}
        {activeTab === 'admin' && appUser.role === ROLES.ADMIN && (
          <AdminPanel currentUser={appUser} destinations={destinations} />
        )}
      </main>

      {/* Status Update Modal */}
      {modalOpen && (
        <StatusUpdateModal 
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleStatusUpdate}
          file={selectedFile}
          newStatus={selectedAction}
        />
      )}
    </div>
  );
}

// --- Sub-Components ---

function Dashboard({ files, user, destinations, onOpenUpdateModal, searchTerm, setSearchTerm, setActiveTab }) {
  const [destFilter, setDestFilter] = useState('');

  const stats = useMemo(() => {
    const today = getStartOf('today');
    let salesToday = 0;
    let submittedToday = 0;
    let inProcess = 0;

    files.forEach(f => {
      // Sales Today
      if (f.createdAt?.seconds * 1000 >= today.getTime()) {
        salesToday++;
      }
      
      // In Process
      if (!['DONE', 'RECEIVED_SALES', 'FOLLOW_UP'].includes(f.status)) {
        inProcess++;
      }

      // Submitted Today
      const submittedAction = f.history.find(h => h.status === 'SUBMITTED' && h.timestamp >= today.getTime());
      if (submittedAction) submittedToday++;
    });

    return { salesToday, submittedToday, inProcess };
  }, [files]);

  const recentActivity = useMemo(() => {
    const allEvents = [];
    files.forEach(f => {
      f.history.forEach(h => {
        allEvents.push({ ...h, fileId: f.fileId, applicant: f.applicantName, id: f.id });
      });
    });
    return allEvents.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [files]);

  const myTasks = files.filter(f => f.assignedTo === user.name && f.status !== 'DONE');
  
  const filteredFiles = files.filter(f => {
    const matchesSearch = 
      f.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      f.passportNo.includes(searchTerm) ||
      (f.fileId && f.fileId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDest = destFilter ? f.destination === destFilter : true;
    
    return matchesSearch && matchesDest;
  });

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Sales Today</p>
            <p className="text-3xl font-bold text-slate-900">{stats.salesToday}</p>
          </div>
          <div className="bg-blue-100 p-3 rounded-full text-blue-600"><TrendingUp className="h-6 w-6"/></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">In Processing</p>
            <p className="text-3xl font-bold text-slate-900">{stats.inProcess}</p>
          </div>
          <div className="bg-purple-100 p-3 rounded-full text-purple-600"><Activity className="h-6 w-6"/></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Submitted Today</p>
            <p className="text-3xl font-bold text-slate-900">{stats.submittedToday}</p>
          </div>
          <div className="bg-indigo-100 p-3 rounded-full text-indigo-600"><Send className="h-6 w-6"/></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed / Search */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">All Files</h2>
              <p className="text-sm text-slate-500">Search and manage</p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={destFilter}
                  onChange={(e) => setDestFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border rounded-lg appearance-none bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48 h-full"
                >
                  <option value="">All Countries</option>
                  {destinations.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search ID, name, passport..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-400">No files found.</p>
              </div>
            ) : (
              filteredFiles.slice(0, 5).map(file => (
                <FileCard key={file.id} file={file} user={user} onOpenUpdateModal={onOpenUpdateModal} />
              ))
            )}
            {filteredFiles.length > 5 && (
               <button onClick={() => setActiveTab('pipeline')} className="w-full py-2 text-sm text-blue-600 font-medium hover:bg-slate-50 rounded-lg">View All in Pipeline →</button>
            )}
          </div>
        </div>

        {/* Sidebar: Tasks & Activity */}
        <div className="space-y-6">
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b bg-slate-50">
                 <h3 className="font-semibold text-slate-700 flex items-center gap-2"><CheckSquare className="h-4 w-4"/> My Active Tasks</h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                 {myTasks.length === 0 ? (
                    <p className="p-4 text-sm text-slate-400 text-center">No active files assigned to you.</p>
                 ) : (
                    myTasks.map(t => (
                       <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onOpenUpdateModal(t, t.status)}>
                          <div className="flex justify-between items-start">
                             <span className="font-medium text-slate-800 text-sm">{t.applicantName}</span>
                             <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{t.fileId}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{STATUS[t.status].label}</p>
                       </div>
                    ))
                 )}
              </div>
           </div>

           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b bg-slate-50">
                 <h3 className="font-semibold text-slate-700 flex items-center gap-2"><Clock className="h-4 w-4"/> Recent Activity</h3>
              </div>
              <div className="divide-y divide-slate-100">
                 {recentActivity.map((act, idx) => (
                    <div key={idx} className="p-4">
                       <p className="text-sm text-slate-800"><span className="font-medium">{act.performedBy}</span> {act.action.split(' - ')[0]}</p>
                       <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-blue-600 font-medium">{act.fileId || 'N/A'} - {act.applicant}</span>
                          <span className="text-[10px] text-slate-400">{formatDate({seconds: act.timestamp/1000}).split(',')[1]}</span>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function AddFileForm({ onSubmit, onCancel, destinations }) {
  const [formData, setFormData] = useState({ applicantName: '', passportNo: '', contactNo: '', destination: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Register New File</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Applicant Full Name</label>
            <input 
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="As on passport"
              value={formData.applicantName}
              onChange={e => setFormData({...formData, applicantName: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Passport Number</label>
            <input 
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.passportNo}
              onChange={e => setFormData({...formData, passportNo: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Contact Number</label>
            <input 
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="+880..."
              value={formData.contactNo}
              onChange={e => setFormData({...formData, contactNo: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Destination Country</label>
            <select
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={formData.destination}
              onChange={e => setFormData({...formData, destination: e.target.value})}
            >
               <option value="">Select Destination</option>
               {destinations.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Register File</button>
        </div>
      </form>
    </div>
  );
}

function AdminPanel({ currentUser, destinations }) {
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ fullName: '', username: '', password: '', role: ROLES.SALES });
  const [newDest, setNewDest] = useState('');
  
  useEffect(() => {
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'agency_users');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    });
    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!userForm.username || !userForm.password || !userForm.fullName) return;

    if (users.some(u => u.username === userForm.username)) {
      alert("Username already exists!");
      return;
    }

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'agency_users'), {
        ...userForm,
        createdAt: serverTimestamp()
      });
      setUserForm({ fullName: '', username: '', password: '', role: ROLES.SALES });
    } catch (err) {
      console.error(err);
      alert("Error adding user");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser.id) {
      alert("You cannot delete yourself!");
      return;
    }
    if (confirm('Are you sure you want to delete this user?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'agency_users', userId));
    }
  };

  const handleAddDestination = async (e) => {
    e.preventDefault();
    if (!newDest.trim()) return;
    
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'destinations');
    await setDoc(docRef, { items: arrayUnion(newDest.trim()) }, { merge: true });
    setNewDest('');
  };

  const handleDeleteDestination = async (dest) => {
    if (confirm(`Remove ${dest} from destination list?`)) {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'destinations');
      await updateDoc(docRef, { items: arrayRemove(dest) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-900">Admin Control Panel</h2>
           <p className="text-slate-500">Manage system settings and user access</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Management Section */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><Users className="h-5 w-5"/> Staff Accounts</h3>
                <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-600">{users.length} Users</span>
             </div>
             
             {/* Add User Form */}
             <div className="p-6 border-b border-slate-100 bg-slate-50/50">
               <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Create New Account</h4>
               <form onSubmit={handleAddUser} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 <input 
                   required
                   className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                   placeholder="Full Name"
                   value={userForm.fullName}
                   onChange={e => setUserForm({...userForm, fullName: e.target.value})}
                 />
                 <input 
                   required
                   className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                   placeholder="User ID"
                   value={userForm.username}
                   onChange={e => setUserForm({...userForm, username: e.target.value})}
                 />
                 <input 
                   required
                   type="password"
                   className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                   placeholder="Password"
                   value={userForm.password}
                   onChange={e => setUserForm({...userForm, password: e.target.value})}
                 />
                 <div className="flex gap-2">
                   <select 
                     className="w-full px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                     value={userForm.role}
                     onChange={e => setUserForm({...userForm, role: e.target.value})}
                   >
                     {Object.values(ROLES).map(r => <option key={r} value={r}>{r}</option>)}
                   </select>
                   <button type="submit" className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900"><Plus className="h-5 w-5"/></button>
                 </div>
               </form>
             </div>

             {/* User List */}
             <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
               {users.map(u => (
                 <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                   <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                       <User className="h-4 w-4" />
                     </div>
                     <div>
                       <p className="font-medium text-slate-900 text-sm">{u.fullName}</p>
                       <p className="text-[10px] text-slate-500 uppercase tracking-wide">{u.role} • {u.username}</p>
                     </div>
                   </div>
                   {u.id !== currentUser.id && (
                     <button 
                       onClick={() => handleDeleteUser(u.id)}
                       className="text-slate-400 hover:text-red-600 p-1"
                       title="Delete User"
                     >
                       <Trash2 className="h-4 w-4" />
                     </button>
                   )}
                 </div>
               ))}
             </div>
           </div>
        </div>

        {/* Destination Settings Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-fit">
          <div className="px-6 py-4 border-b bg-slate-50">
             <h3 className="font-bold text-slate-700 flex items-center gap-2"><Globe className="h-5 w-5"/> Destinations</h3>
          </div>
          <div className="p-4 border-b border-slate-100">
             <form onSubmit={handleAddDestination} className="flex gap-2">
               <input 
                 className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                 placeholder="Add Country..."
                 value={newDest}
                 onChange={e => setNewDest(e.target.value)}
               />
               <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Plus className="h-5 w-5"/></button>
             </form>
          </div>
          <div className="p-2 max-h-[400px] overflow-y-auto">
             <div className="flex flex-wrap gap-2">
               {destinations.map(d => (
                 <span key={d} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm border border-slate-200">
                    {d}
                    <button onClick={() => handleDeleteDestination(d)} className="hover:text-red-600 text-slate-400 ml-1"><X className="h-3 w-3"/></button>
                 </span>
               ))}
               {destinations.length === 0 && <span className="text-slate-400 text-sm p-2">No destinations set.</span>}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Admin Setup State
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');

  useEffect(() => {
    const checkUsers = async () => {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'agency_users'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setIsFirstRun(true);
      }
      setLoading(false);
    };
    checkUsers();
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'agency_users'), 
        where('username', '==', username),
        where('password', '==', password) 
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('Invalid Credentials');
        return;
      }

      const userData = snapshot.docs[0].data();
      onLogin({
        id: snapshot.docs[0].id,
        name: userData.fullName,
        username: userData.username,
        role: userData.role
      });

    } catch (err) {
      console.error(err);
      setError('Login failed. Please try again.');
    }
  };

  const handleFirstRunSetup = async (e) => {
    e.preventDefault();
    if (!newAdminName || !newAdminUser || !newAdminPass) return;

    try {
      const newUser = {
        fullName: newAdminName,
        username: newAdminUser,
        password: newAdminPass,
        role: ROLES.ADMIN,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'agency_users'), newUser);
      onLogin({
        id: docRef.id,
        name: newAdminName,
        username: newAdminUser,
        role: ROLES.ADMIN
      });
    } catch (err) {
      console.error(err);
      setError('Setup failed.');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-100">Checking configuration...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isFirstRun ? 'System Setup' : 'Staff Login'}
          </h2>
          <p className="text-slate-500">
            {isFirstRun ? 'Create the first Admin account' : 'Access your workspace'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {isFirstRun ? (
          <form onSubmit={handleFirstRunSetup} className="space-y-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input 
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newAdminName}
                onChange={e => setNewAdminName(e.target.value)}
                placeholder="e.g. Agency Manager"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username (User ID)</label>
              <input 
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newAdminUser}
                onChange={e => setNewAdminUser(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                required
                type="password"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newAdminPass}
                onChange={e => setNewAdminPass(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
              Create Admin Account
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">User ID / Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter your ID"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="password"
                  required
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all mt-4"
            >
              Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function PipelineView({ files }) {
  const groupedFiles = useMemo(() => {
    const groups = {};
    files.forEach(f => {
      if (f.status === 'DONE') return; 
      const assignee = f.assignedTo || 'Unassigned';
      if (!groups[assignee]) groups[assignee] = [];
      groups[assignee].push(f);
    });
    return groups;
  }, [files]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Work Pipeline</h2>
          <p className="text-slate-500">Current workload distribution by employee</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-x-auto pb-4">
        {Object.entries(groupedFiles).map(([user, userFiles]) => (
          <div key={user} className="bg-slate-100 rounded-xl p-4 min-w-[300px] flex flex-col h-full max-h-[calc(100vh-200px)]">
             <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                   <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-500 shadow-sm"><User className="h-4 w-4"/></div>
                   {user}
                </h3>
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{userFiles.length}</span>
             </div>
             
             <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
               {userFiles.map(file => (
                 <div key={file.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-mono text-slate-400">{file.fileId}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS[file.status].color}`}>{STATUS[file.status].label}</span>
                    </div>
                    <h4 className="font-medium text-slate-800 line-clamp-1">{file.applicantName}</h4>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                       <MapPin className="h-3 w-3"/> {file.destination || 'N/A'}
                    </div>
                 </div>
               ))}
             </div>
          </div>
        ))}
        {Object.keys(groupedFiles).length === 0 && (
           <div className="col-span-full text-center py-20 text-slate-400">No active files in the pipeline.</div>
        )}
      </div>
    </div>
  );
}

function FileCard({ file, user, onOpenUpdateModal }) {
  const [expanded, setExpanded] = useState(false);
  const StatusIcon = STATUS[file.status].icon;
  const isOwner = file.assignedTo === user.name || (file.status === 'HANDOVER_PROCESSING' && user.role === ROLES.PROCESSING);

  // Determine actions based on status
  const getAvailableActions = () => {
    const actions = [];
    if (file.status === 'RECEIVED_SALES') actions.push('HANDOVER_PROCESSING');
    if (file.status === 'HANDOVER_PROCESSING') actions.push('HANDOVER_PROCESSING');
    
    // Processing Actions
    if (['HANDOVER_PROCESSING', 'DOCS_PENDING', 'PAYMENT_PENDING', 'SUBMITTED', 'FOLLOW_UP'].includes(file.status) && user.role === ROLES.PROCESSING) {
       if (file.status !== 'DOCS_PENDING') actions.push('DOCS_PENDING');
       if (file.status !== 'PAYMENT_PENDING') actions.push('PAYMENT_PENDING');
       if (file.status !== 'SUBMITTED') actions.push('SUBMITTED');
    }

    if (['SUBMITTED', 'FOLLOW_UP'].includes(file.status)) {
      actions.push('DONE');
      actions.push('FOLLOW_UP');
    }
    
    if (file.status !== 'DONE' && file.status !== 'FOLLOW_UP') actions.push('FOLLOW_UP');

    return [...new Set(actions)];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
      <div className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${STATUS[file.status].color.split(' ')[0]}`}>
              <StatusIcon className={`h-6 w-6 ${STATUS[file.status].color.split(' ')[1]}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <h3 className="text-lg font-bold text-slate-900">{file.applicantName}</h3>
                 <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200">{file.fileId || 'NO-ID'}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                {file.visaResult === 'APPROVED' && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded border border-green-200 flex items-center gap-1"><ThumbsUp className="h-3 w-3"/> Approved</span>}
                {file.visaResult === 'REJECTED' && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded border border-red-200 flex items-center gap-1"><ThumbsDown className="h-3 w-3"/> Rejected</span>}
                
                <span className="flex items-center gap-1"><User className="h-3 w-3" /> {file.passportNo}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {file.destination || 'N/A'}</span>
                <span className="flex items-center gap-1">📞 {file.contactNo}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS[file.status].color}`}>
              {STATUS[file.status].label}
            </span>
            <span className="text-xs text-slate-400">Assigned: {file.assignedTo}</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-4">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {expanded ? 'Hide History' : 'View History'}
          </button>

          {isOwner && file.status !== 'DONE' && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {getAvailableActions().map(actionKey => (
                <button
                  key={actionKey}
                  onClick={() => onOpenUpdateModal(file, actionKey)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Mark {STATUS[actionKey].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="bg-slate-50 p-5 border-t">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Audit Trail</h4>
          <div className="space-y-4">
            {file.history.map((entry, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="mt-1 flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                  {idx !== file.history.length - 1 && <div className="w-px h-full bg-slate-200 my-1"></div>}
                </div>
                <div>
                  <p className="text-sm text-slate-800 font-medium">{entry.action}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(entry.timestamp)} • <span className="text-blue-600">{entry.performedBy}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatisticalReports({ files, currentUser }) {
  const [timeRange, setTimeRange] = useState('today');
  const [userFilter, setUserFilter] = useState(currentUser.name);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const q = collection(db, 'artifacts', typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', 'public', 'data', 'agency_users');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(d => d.data().fullName);
      setAllUsers(users);
    });
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    const start = getStartOf(timeRange);
    const reportData = {
      processing: {
        inProcess: 0,
        submittedToday: 0,
        docsPendingToday: 0,
        completedToday: 0,
        approvals: 0,
        rejections: 0,
        totalActions: 0
      },
      sales: {
        successfulDeals: 0,
        clientComms: 0,
        destinations: {},
        totalActions: 0
      },
      notes: []
    };

    files.forEach(file => {
      if (file.assignedTo === userFilter) {
        if (!['DONE', 'RECEIVED_SALES'].includes(file.status)) {
          reportData.processing.inProcess++;
        }
      }

      file.history.forEach(entry => {
        const entryTime = new Date(entry.timestamp);
        if (entryTime >= start && entry.performedBy === userFilter) {
          reportData.processing.totalActions++;
          reportData.sales.totalActions++;

          if (entry.action.includes('Note:')) {
            const noteContent = entry.action.split('Note:')[1].trim();
            reportData.notes.push({
               file: file.applicantName,
               note: noteContent,
               time: entry.timestamp
            });
          }

          if (entry.status === 'SUBMITTED') reportData.processing.submittedToday++;
          if (entry.status === 'DOCS_PENDING') reportData.processing.docsPendingToday++;
          if (entry.status === 'DONE') {
            reportData.processing.completedToday++;
            if (entry.result === 'APPROVED') reportData.processing.approvals++;
            if (entry.result === 'REJECTED') reportData.processing.rejections++;
          }

          if (entry.status === 'RECEIVED_SALES' || entry.status === 'HANDOVER_PROCESSING') {
             if (entry.status === 'RECEIVED_SALES') {
               reportData.sales.successfulDeals++;
               const dest = file.destination || 'Unknown';
               reportData.sales.destinations[dest] = (reportData.sales.destinations[dest] || 0) + 1;
             }
          }

          if (['FOLLOW_UP', 'DOCS_PENDING', 'PAYMENT_PENDING'].includes(entry.status)) {
            reportData.sales.clientComms++;
          }
        }
      });
    });

    return reportData;
  }, [files, timeRange, userFilter]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 min-h-[800px]">
      <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Statistical Reports</h2>
          <p className="text-slate-500">Productivity Analysis</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
           <select 
             value={userFilter}
             onChange={(e) => setUserFilter(e.target.value)}
             className="px-3 py-2 border rounded-lg text-sm"
           >
             {allUsers.length > 0 ? allUsers.map(u => <option key={u} value={u}>{u}</option>) : <option>{currentUser.name}</option>}
           </select>

           <div className="flex bg-slate-100 p-1 rounded-lg">
             {['today', 'week', 'month'].map(t => (
               <button
                 key={t}
                 onClick={() => setTimeRange(t)}
                 className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${timeRange === t ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
               >
                 {t}
               </button>
             ))}
           </div>

           <button 
             onClick={handlePrint}
             className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
           >
             <Printer className="h-4 w-4" /> Export PDF
           </button>
        </div>
      </div>

      <div className="p-8 print:p-0" id="printable-report">
        <div className="mb-8 hidden print:block">
          <h1 className="text-3xl font-bold mb-2">Performance Summary</h1>
          <div className="text-sm text-slate-500 flex justify-between">
             <span>Employee: <b>{userFilter}</b></span>
             <span>Period: <b>{timeRange.toUpperCase()}</b></span>
             <span>Generated: {new Date().toLocaleString()}</span>
          </div>
          <hr className="my-4"/>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          
          <div className="col-span-2 md:col-span-1 border rounded-xl p-6 bg-blue-50/50 border-blue-100">
             <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Briefcase className="h-5 w-5 text-blue-600"/> Sales Performance</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                   <span className="text-slate-600">New Deals / Files Registered</span>
                   <span className="text-xl font-bold text-slate-900">{stats.sales.successfulDeals}</span>
                </div>
                <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                   <span className="text-slate-600">Client Interactions (Follow-ups)</span>
                   <span className="text-xl font-bold text-slate-900">{stats.sales.clientComms}</span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                   <span className="text-xs font-semibold text-slate-400 uppercase">Deals by Destination</span>
                   <div className="mt-2 space-y-1">
                     {Object.entries(stats.sales.destinations).length > 0 ? (
                       Object.entries(stats.sales.destinations).map(([dest, count]) => (
                         <div key={dest} className="flex justify-between text-sm">
                           <span>{dest}</span>
                           <span className="font-medium">{count}</span>
                         </div>
                       ))
                     ) : <div className="text-sm text-slate-400">No deals yet</div>}
                   </div>
                </div>
             </div>
          </div>

          <div className="col-span-2 md:col-span-1 border rounded-xl p-6 bg-purple-50/50 border-purple-100">
             <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="h-5 w-5 text-purple-600"/> Processing Metrics</h3>
             <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                   <div className="text-2xl font-bold text-slate-900">{stats.processing.inProcess}</div>
                   <div className="text-xs text-slate-500">Currently in Process</div>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                   <div className="text-2xl font-bold text-slate-900">{stats.processing.submittedToday}</div>
                   <div className="text-xs text-slate-500">Submitted Today</div>
                </div>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-sm py-1 border-b border-purple-100">
                   <span>Docs Pending Marked</span>
                   <span className="font-medium">{stats.processing.docsPendingToday}</span>
                </div>
                <div className="flex justify-between text-sm py-1 border-b border-purple-100">
                   <span>Files Completed</span>
                   <span className="font-medium">{stats.processing.completedToday}</span>
                </div>
                <div className="flex gap-2 mt-2">
                    <span className="flex-1 bg-green-100 text-green-700 text-center py-1 rounded text-xs font-bold">{stats.processing.approvals} Approved</span>
                    <span className="flex-1 bg-red-100 text-red-700 text-center py-1 rounded text-xs font-bold">{stats.processing.rejections} Rejected</span>
                </div>
             </div>
          </div>
        </div>

        <div>
           <h3 className="text-lg font-bold text-slate-800 mb-4">Activity Notes Log</h3>
           {stats.notes.length === 0 ? (
             <div className="text-center py-8 bg-slate-50 rounded-lg text-slate-400 text-sm">No notes recorded in this period.</div>
           ) : (
             <div className="space-y-3">
               {stats.notes.map((n, idx) => (
                 <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-slate-700">{n.file}</span>
                      <span className="text-slate-400 text-xs">{formatDate({seconds: n.time/1000})}</span>
                    </div>
                    <p className="text-slate-600">{n.note}</p>
                 </div>
               ))}
             </div>
           )}
        </div>

      </div>
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          nav, button, select {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}