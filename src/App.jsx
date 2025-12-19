import React, { useState, useEffect, useMemo, useRef } from 'react';
import logoImage from './assets/logo.jpg';
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
  getDoc,
  setDoc,
  increment,
  runTransaction,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';
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
  Settings,
  UserPlus,
  Bell,
  Code2,
  Moon,
  Sun,
  Menu,
  Edit2,
  StickyNote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Timer,
  Monitor,
  Plane
} from 'lucide-react';
//vercel analytics
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react"

// --- Firebase Configuration & Initialization ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "app-version-3";

// --- Constants & Enums ---
const ROLES = {
  SALES: 'Sales Representative',
  PROCESSING: 'Processing Agent',
  ADMIN: 'Manager/Admin',
  ACCOUNTS: 'Accounts'
};

const FILE_TYPES = {
  VISA: 'Visa',
  AIR_TICKET: 'Air Ticket',
  PACKAGE: 'Package'
};

const AIR_TICKET_PORTALS = ['Ticket Lagbe', 'TripLover', 'FirstTrip', 'AkijAir'];

const STATUS = {
  // Visa statuses
  RECEIVED_SALES: { label: 'Received (Sales)', color: 'bg-blue-100 text-blue-800', darkColor: 'bg-blue-900/30 text-blue-200', icon: Briefcase },
  HANDOVER_PROCESSING: { label: 'In Processing', color: 'bg-purple-100 text-purple-800', darkColor: 'bg-purple-900/30 text-purple-200', icon: ArrowRight },
  DOCS_PENDING: { label: 'Docs Pending', color: 'bg-yellow-100 text-yellow-800', darkColor: 'bg-yellow-900/30 text-yellow-200', icon: AlertCircle },
  PAYMENT_PENDING: { label: 'Payment Pending', color: 'bg-orange-100 text-orange-800', darkColor: 'bg-orange-900/30 text-orange-200', icon: DollarSign },
  SUBMITTED: { label: 'Submitted to Embassy', color: 'bg-indigo-100 text-indigo-800', darkColor: 'bg-indigo-900/30 text-indigo-200', icon: Send },
  FOLLOW_UP: { label: 'Follow Up Required', color: 'bg-red-100 text-red-800', darkColor: 'bg-red-900/30 text-red-200', icon: Clock },
  DONE: { label: 'Result Received', color: 'bg-green-100 text-green-800', darkColor: 'bg-green-900/30 text-green-200', icon: CheckCircle },
  
  // Air Ticket statuses
  SALE_INITIATED: { label: 'Sale Initiated', color: 'bg-blue-100 text-blue-800', darkColor: 'bg-blue-900/30 text-blue-200', icon: Briefcase },
  BOOKED: { label: 'Booked', color: 'bg-purple-100 text-purple-800', darkColor: 'bg-purple-900/30 text-purple-200', icon: CheckCircle },
  ISSUED: { label: 'Ticket Issued', color: 'bg-green-100 text-green-800', darkColor: 'bg-green-900/30 text-green-200', icon: CheckCircle },
  
  // Package statuses
  FLIGHT_ISSUED: { label: 'Flight Ticket Issued', color: 'bg-blue-100 text-blue-800', darkColor: 'bg-blue-900/30 text-blue-200', icon: CheckCircle },
  HOTELS_BOOKED: { label: 'Hotels Booked', color: 'bg-purple-100 text-purple-800', darkColor: 'bg-purple-900/30 text-purple-200', icon: CheckCircle },
  PICKUP_DROPOFF_BOOKED: { label: 'Pick & Drop Booked', color: 'bg-indigo-100 text-indigo-800', darkColor: 'bg-indigo-900/30 text-indigo-200', icon: CheckCircle },
  PACKAGE_READY: { label: 'Package Ready', color: 'bg-green-100 text-green-800', darkColor: 'bg-green-900/30 text-green-200', icon: CheckCircle },
};

const RESULTS = {
  APPROVED: { label: 'Visa Approved', color: 'text-green-600', icon: ThumbsUp },
  REJECTED: { label: 'Visa Rejected', color: 'text-red-600', icon: ThumbsDown },
};

// --- Helper Functions ---
const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  try {
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '-';
  }
};

const formatTimeOnly = (timestamp) => {
  if (!timestamp) return '-';
  try {
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '-';
  }
};

const formatSimpleDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Timezone utility for Dhaka (+6 UTC)
const getDhakaDate = () => {
  const now = new Date();
  // Convert to Dhaka timezone (UTC+6)
  const dhakaTime = new Date(now.getTime() + (6 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
  return dhakaTime;
};

const getStartOf = (period, customStartDate = null) => {
  const now = getDhakaDate();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  
  if (period === 'custom' && customStartDate) {
    return new Date(customStartDate);
  }
  
  if (period === 'week') {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
    start.setDate(diff);
  } else if (period === 'month') {
    start.setDate(1);
  } else if (period === 'alltime') {
    return new Date(0); 
  }
  return start;
};

const getEndOf = (period, customEndDate = null) => {
  const now = getDhakaDate();
  now.setHours(23, 59, 59, 999);
  
  if (period === 'custom' && customEndDate) {
    const end = new Date(customEndDate);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  
  return now;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(amount || 0);
};

// Working Hours Calculation Functions
const calculateWorkingHours = (loginTime, logoutTime) => {
  if (!loginTime || !logoutTime) return { hours: 0, shift: 0, overtime: 0 };
  
  const loginDate = loginTime.toDate ? loginTime.toDate() : new Date(loginTime);
  const logoutDate = logoutTime.toDate ? logoutTime.toDate() : new Date(logoutTime);
  
  const diffMs = logoutDate - loginDate;
  const diffHours = diffMs / (1000 * 60 * 60);
  const roundedHours = Math.round(diffHours * 100) / 100; // Round to 2 decimals
  
  const SHIFT_HOURS = 8;
  const shiftHours = Math.min(roundedHours, SHIFT_HOURS);
  const overtime = Math.max(0, roundedHours - SHIFT_HOURS);
  
  return {
    hours: roundedHours,
    shift: shiftHours,
    overtime: overtime
  };
};

const formatHours = (hours) => {
  if (hours === 0) return '-';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
};

// Animation Functions
const triggerConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
};

const triggerConfettiExplosion = () => {
  const duration = 3 * 1000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: Math.random() * 360,
      spread: Math.random() * 360,
      origin: { x: Math.random(), y: Math.random() - 0.2 },
      zIndex: 9999
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  
  frame();
};

// Company Details for Invoice
const COMPANY_INFO = {
  name: 'ALIF GLOBAL TOURS AND TRAVELS',
  tradeNum: 'TRAD/DNCC/046978/2023',
  caabNum: '0015752',
  logo: '/src/assets/logo.jpg',
  phone: '+880 1901-467290',
  email: 'info@alifglobaltoursandtravels.com.bd',
};

// Invoice Generation Function
const generateInvoice = async (file, paymentStatus, paidAmount = null) => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPos = 10;

    // Color scheme
    const primaryColor = [52, 122, 197]; // Blue
    const accentColor = [230, 126, 34]; // Orange
    const darkGray = [45, 62, 80];
    const lightGray = [236, 240, 241];

    // Add elegant header background
    pdf.setFillColor(...lightGray);
    pdf.rect(0, 0, pageWidth, 45, 'F');

    // Add premium border top
    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, pageWidth, 2, 'F');

    // Load and add logo as data URL for PDF
    try {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = logoImage;
      await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imgData = canvas.toDataURL('image/jpeg');
            pdf.addImage(imgData, 'JPEG', 12, 8, 20, 20);
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Logo load failed'));
      });
    } catch (e) {
      console.log('Logo not added to PDF (optional):', e.message);
    }

    // Company Header
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...primaryColor);
    pdf.text(COMPANY_INFO.name, 35, 13, { align: 'left', maxWidth: 95 });

    // Company details
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Trade License: ${COMPANY_INFO.tradeNum}`, 35, 19, { align: 'left' });
    pdf.text(`CAAB No: ${COMPANY_INFO.caabNum}`, 35, 22, { align: 'left' });
    pdf.text(`Mobile: ${COMPANY_INFO.phone} | Email: ${COMPANY_INFO.email}`, 35, 25, { align: 'left', maxWidth: 100 });

    // Invoice badge on right
    pdf.setFillColor(...accentColor);
    pdf.rect(pageWidth - 45, 12, 40, 18, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text('INVOICE', pageWidth - 25, 19, { align: 'center' });
    pdf.setFontSize(9);
    pdf.text(file.fileId, pageWidth - 25, 25, { align: 'center' });

    yPos = 52;

    // Invoice Details Section
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...darkGray);
    pdf.text('Invoice Details', 15, yPos);
    yPos += 6;

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 80);
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    pdf.text(`Date Issued: ${today}`, 15, yPos);
    yPos += 5;
    pdf.text(`Invoice #: ${file.fileId}`, 15, yPos);
    yPos += 8;

    // Client Information Section
    pdf.setFillColor(...lightGray);
    pdf.rect(15, yPos - 3, pageWidth - 30, 0.5, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...primaryColor);
    pdf.text('Client Information', 15, yPos + 2);
    yPos += 8;

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(60, 60, 60);
    pdf.text(`Applicant: ${file.applicantName}`, 15, yPos);
    yPos += 4;
    pdf.text(`Passport: ${file.passportNo}`, 15, yPos);
    yPos += 4;
    pdf.text(`Contact: ${file.contactNo}`, 15, yPos);
    yPos += 4;
    pdf.text(`Destination Country: ${file.destination || 'N/A'}`, 15, yPos);
    yPos += 10;

    // Service Details Section
    pdf.setFillColor(...lightGray);
    pdf.rect(15, yPos - 3, pageWidth - 30, 0.5, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...primaryColor);
    pdf.text('Service Details', 15, yPos + 2);
    yPos += 8;

    // Service table header
    pdf.setFillColor(...primaryColor);
    pdf.rect(15, yPos - 3, pageWidth - 30, 6, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Service Description', 18, yPos);
    pdf.text('Amount', pageWidth - 25, yPos, { align: 'right' });
    yPos += 8;

    // Service row
    const serviceCharge = parseFloat(file.serviceCharge || 0);
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(60, 60, 60);
    const serviceDesc = `${file.destination} Visa Service Processing`;
    pdf.text(serviceDesc, 18, yPos);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(...accentColor);
    pdf.text(`Tk ${serviceCharge.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 10;

    // Payment Status Section
    pdf.setFillColor(...lightGray);
    pdf.rect(15, yPos - 3, pageWidth - 30, 0.5, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...primaryColor);
    pdf.text('Payment Status', 15, yPos + 2);
    yPos += 8;

    // Status box
    let statusColor = [52, 152, 219]; // Blue for unpaid
    if (paymentStatus === 'Paid') statusColor = [46, 204, 113]; // Green
    if (paymentStatus === 'Partially Paid') statusColor = [241, 196, 15]; // Yellow

    pdf.setFillColor(...statusColor);
    pdf.rect(15, yPos - 2, 40, 7, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text(paymentStatus.toUpperCase(), 17, yPos + 2);

    yPos += 10;
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(60, 60, 60);

    if (paymentStatus === 'Partially Paid' && paidAmount !== null) {
      const remaining = serviceCharge - paidAmount;
      pdf.text(`Paid Amount: Tk ${parseFloat(paidAmount).toFixed(2)}`, 15, yPos);
      yPos += 5;
      pdf.text(`Remaining: Tk ${Math.max(0, remaining).toFixed(2)}`, 15, yPos);
    } else if (paymentStatus === 'Paid') {
      pdf.text(`Amount Paid: Tk ${serviceCharge.toFixed(2)}`, 15, yPos);
    } else if (paymentStatus === 'Unpaid') {
      pdf.text(`Amount Due: Tk ${serviceCharge.toFixed(2)}`, 15, yPos);
    }

    // Total amount box at bottom
    yPos = pageHeight - 35;
    pdf.setFillColor(...primaryColor);
    pdf.rect(pageWidth - 55, yPos, 50, 15, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Total Amount:', pageWidth - 50, yPos + 4);
    pdf.setFontSize(14);
    pdf.text(`Tk ${serviceCharge.toFixed(2)}`, pageWidth - 50, yPos + 11);

    // Footer
    yPos = pageHeight - 18;
    pdf.setDrawColor(...primaryColor);
    pdf.line(15, yPos - 2, pageWidth - 15, yPos - 2);
    
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(80, 80, 80);
    pdf.text(`Contact: ${COMPANY_INFO.phone} | ${COMPANY_INFO.email}`, pageWidth / 2, yPos + 2, { align: 'center' });
    
    pdf.setFont(undefined, 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    pdf.text('Thank you for choosing Alif Global Tours and Travels!', pageWidth / 2, yPos + 5, { align: 'center' });
    pdf.text(`Generated on ${today} | This is an official invoice`, pageWidth / 2, yPos + 8, { align: 'center' });

    // Save PDF
    pdf.save(`Invoice_${file.fileId}_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error generating invoice:', error);
    alert('Failed to generate invoice. Please try again.');
  }
};

const triggerSadAnimation = () => {
  // Play a sad tone
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

// --- Main Component ---
export default function VisaTrackApp() {
  const [user, setUser] = useState(null);
  const [appUser, setAppUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [files, setFiles] = useState([]);
  const [destinations, setDestinations] = useState([]); 
  const [allPortals, setAllPortals] = useState(AIR_TICKET_PORTALS);
  const [allUsers, setAllUsers] = useState([]); 
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trackingMode, setTrackingMode] = useState(false);
  const [trackingFileId, setTrackingFileId] = useState('');
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('visaTrackDarkMode');
    return saved === 'true';
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false); 
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState(null);
  
  // Specialized status modals
  const [airTicketBookedModalOpen, setAirTicketBookedModalOpen] = useState(false);
  const [airTicketIssuedModalOpen, setAirTicketIssuedModalOpen] = useState(false);
  const [packageFlightIssuedModalOpen, setPackageFlightIssuedModalOpen] = useState(false);
  const [packageHotelsBookedModalOpen, setPackageHotelsBookedModalOpen] = useState(false);
  const [packagePickupDropoffModalOpen, setPackagePickupDropoffModalOpen] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [miscCosts, setMiscCosts] = useState([]);

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
    
    // Check for tracking mode
    const params = new URLSearchParams(window.location.search);
    if (params.has('track')) {
      setTrackingMode(true);
      setTrackingFileId(params.get('track') || '');
    }
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      const savedUser = localStorage.getItem('visaTrackUser');
      if (savedUser) setAppUser(JSON.parse(savedUser));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('visaTrackDarkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!user) return;
    const qFiles = collection(db, 'artifacts', appId, 'public', 'data', 'visa_files');
    const unsubFiles = onSnapshot(qFiles, (snapshot) => {
      const filesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      filesData.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });
      setFiles(filesData);
      setLoading(false);
    });
    const destRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'destinations');
    const unsubDest = onSnapshot(destRef, (docSnap) => {
      if (docSnap.exists()) setDestinations(docSnap.data().items || []);
      else setDestinations(['Canada', 'UK', 'USA', 'Schengen Area', 'Australia', 'Dubai']);
    });
    const portalsRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'portals');
    const unsubPortals = onSnapshot(portalsRef, (docSnap) => {
      if (docSnap.exists()) setAllPortals(docSnap.data().items || AIR_TICKET_PORTALS);
      else setAllPortals(AIR_TICKET_PORTALS);
    });
    const qUsers = collection(db, 'artifacts', appId, 'public', 'data', 'agency_users');
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(usersList);
      
      // Update appUser if the current user's data has changed
      if (appUser) {
        const currentUserDoc = snapshot.docs.find(doc => doc.data().name === appUser.name);
        if (currentUserDoc) {
          const updatedUserData = { id: currentUserDoc.id, ...currentUserDoc.data() };
          // Only update if something has changed
          if (JSON.stringify(updatedUserData) !== JSON.stringify(appUser)) {
            setAppUser(updatedUserData);
            localStorage.setItem('visaTrackUser', JSON.stringify(updatedUserData));
          }
        }
      }
    });
    const qAttendance = collection(db, 'artifacts', appId, 'public', 'data', 'attendance');
    const unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
      const attendanceData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(attendanceData);
    });
    return () => { unsubFiles(); unsubDest(); unsubPortals(); unsubUsers(); unsubAttendance(); };
  }, [user]);

  const myTasks = useMemo(() => {
    if (!appUser || files.length === 0) return [];
    // For Processing Agents: Show files that are assigned to them and either not yet acknowledged, or acknowledged
    // Files disappear when status becomes SUBMITTED or DONE
    if (appUser.role === ROLES.PROCESSING) {
      return files.filter(f => 
        f.assignedTo === appUser.name && 
        !['DONE', 'SUBMITTED'].includes(f.status)
      );
    }
    // For others: Show files assigned to them that are not DONE
    return files.filter(f => f.assignedTo === appUser.name && f.status !== 'DONE');
  }, [files, appUser]);

  useEffect(() => {
    if (appUser && !loading && !hasCheckedIn) {
        if (myTasks.length > 0) setShowNotifications(true);
        setHasCheckedIn(true);
    }
  }, [appUser, loading, hasCheckedIn, myTasks.length]);

  // Initialize app - check for existing user session
  useEffect(() => {
    const initializeApp = async () => {
      const storedUser = localStorage.getItem('visaTrackUser');
      if (storedUser) {
        const userProfile = JSON.parse(storedUser);
        
        // Fetch fresh user data from Firestore to get latest role and permissions
        try {
          const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_users', userProfile.id);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const freshUserData = userSnap.data();
            const updatedUser = {
              ...userProfile,
              role: freshUserData.role || userProfile.role
            };
            setAppUser(updatedUser);
          } else {
            setAppUser(userProfile);
          }
        } catch (e) {
          console.error("Error fetching fresh user data:", e);
          setAppUser(userProfile);
        }
        
        // Restore attendance session ID if user is on a trusted device
        const isTrustedDevice = localStorage.getItem('vt_trusted_device') === 'true';
        if (isTrustedDevice) {
          try {
            const now = getDhakaDate();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            // Look for active session for this user today
            const q = query(
              collection(db, 'artifacts', appId, 'public', 'data', 'attendance'),
              where('userName', '==', userProfile.name),
              where('date', '==', today),
              where('logoutTime', '==', null)
            );
            const existingDocs = await getDocs(q);
            
            if (existingDocs.size > 0) {
              // Restore the active session
              localStorage.setItem('currentAttendanceId', existingDocs.docs[0].id);
            } else {
              // No active session, clear the ID
              localStorage.removeItem('currentAttendanceId');
            }
          } catch (e) { console.error("Error restoring attendance session:", e); }
        }
      }
    };
    
    initializeApp();
  }, []);

  const handleLogin = async (userProfile) => {
    const isTrustedDevice = localStorage.getItem('vt_trusted_device') === 'true';
    if (userProfile.role !== ROLES.ADMIN && !isTrustedDevice) {
        alert("Security Restriction: You must log in from an authorized office computer.");
        return;
    }
    setAppUser(userProfile);
    localStorage.setItem('visaTrackUser', JSON.stringify(userProfile));
    setHasCheckedIn(false);
    
    // Trigger welcome animation
    setTimeout(() => {
      triggerConfetti();
    }, 300);

    // Record attendance for trusted devices only
    if (isTrustedDevice) {
        try {
            const now = getDhakaDate();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            // Check if there's an active session already to prevent duplicate sessions
            const q = query(
              collection(db, 'artifacts', appId, 'public', 'data', 'attendance'),
              where('userName', '==', userProfile.name),
              where('date', '==', today),
              where('logoutTime', '==', null)
            );
            const existingDocs = await getDocs(q);
            
            if (existingDocs.size === 0) {
              // Only create a new attendance record if there's no active session
              const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'), {
                userId: userProfile.id,
                userName: userProfile.name,
                role: userProfile.role,
                date: today,
                loginTime: serverTimestamp(),
                logoutTime: null
              });
              localStorage.setItem('currentAttendanceId', docRef.id);
            } else {
              // If there's an active session, use that one
              localStorage.setItem('currentAttendanceId', existingDocs.docs[0].id);
            }
        } catch (e) { console.error("Error recording attendance:", e); }
    }
  };

  const handleLogout = async () => {
    const attId = localStorage.getItem('currentAttendanceId');
    if (attId) {
        try {
            const ref = doc(db, 'artifacts', appId, 'public', 'data', 'attendance', attId);
            await updateDoc(ref, { logoutTime: serverTimestamp() });
        } catch(e) { console.error("Error updating logout:", e); }
        localStorage.removeItem('currentAttendanceId');
    }
    setAppUser(null);
    localStorage.removeItem('visaTrackUser');
    setActiveTab('dashboard'); 
    setHasCheckedIn(false);
  };

  // Handle logout on browser close or shutdown
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (appUser && localStorage.getItem('currentAttendanceId')) {
        // Clear local storage to indicate user logged out
        // Database will be cleaned up by a separate periodic task or manual cleanup
        localStorage.removeItem('currentAttendanceId');
        localStorage.removeItem('visaTrackUser');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [appUser]);

  // Periodic cleanup: mark sessions as timed out if they've been idle too long
  useEffect(() => {
    const cleanupStaleAttendance = async () => {
      try {
        const now = getDhakaDate();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        // Find sessions that have been open for more than 12 hours (unlikely normal work session)
        const q = query(
          collection(db, 'artifacts', appId, 'public', 'data', 'attendance'),
          where('date', '==', today),
          where('logoutTime', '==', null)
        );
        const docs = await getDocs(q);
        
        docs.forEach(doc => {
          const loginTime = doc.data().loginTime?.toDate ? doc.data().loginTime.toDate() : new Date(doc.data().loginTime?.seconds * 1000);
          const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
          
          // If session is older than 12 hours, mark it as ended
          if (hoursDiff > 12) {
            updateDoc(doc.ref, { logoutTime: serverTimestamp() }).catch(err => 
              console.error("Error marking stale session as ended:", err)
            );
          }
        });
      } catch (e) { console.error("Error in cleanup task:", e); }
    };

    // Run cleanup every 30 minutes
    const cleanupInterval = setInterval(cleanupStaleAttendance, 30 * 60 * 1000);
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Fetch misc costs for accounting
  useEffect(() => {
    if (!appUser || appUser.role !== ROLES.ADMIN) return;
    
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'misc_costs');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const costs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMiscCosts(costs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });
    return () => unsubscribe();
  }, [appUser]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const addNewFile = async (data) => {
    if (!appUser) return;
    const fileId = `VT-${Math.floor(10000 + Math.random() * 90000)}`;
    const isNewSale = appUser.role !== ROLES.PROCESSING;
    
    let newFile = {
      fileId: fileId,
      applicantName: data.applicantName,
      contactNo: data.contactNo,
      fileType: data.fileType || FILE_TYPES.VISA,
      createdBy: appUser.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isNewSale: isNewSale,
      assignedTo: appUser.name,
      history: []
    };

    // File type specific fields
    if (data.fileType === FILE_TYPES.VISA) {
      newFile = {
        ...newFile,
        passportNo: data.passportNo,
        destination: data.destination,
        serviceCharge: Number(data.serviceCharge) || 0,
        cost: Number(data.cost) || 0,
        reminderDate: data.reminderDate || null,
        status: 'RECEIVED_SALES',
        visaResult: null,
        acknowledgedByProcessingAgent: false,
        history: [{
          action: 'File Received & Registered',
          status: 'RECEIVED_SALES',
          performedBy: appUser.name,
          timestamp: Date.now()
        }]
      };
    } else if (data.fileType === FILE_TYPES.AIR_TICKET) {
      newFile = {
        ...newFile,
        airlineRoute: data.airlineRoute,
        airlineSalePrice: Number(data.serviceCharge) || 0,
        airlineCostPrice: Number(data.cost) || 0,
        status: 'SALE_INITIATED',
        bookingLastTime: null,
        pnr: null,
        portal: null,
        history: [{
          action: 'Air Ticket Sale Initiated',
          status: 'SALE_INITIATED',
          performedBy: appUser.name,
          timestamp: Date.now()
        }]
      };
    } else if (data.fileType === FILE_TYPES.PACKAGE) {
      newFile = {
        ...newFile,
        packageCountries: data.packageCountries,
        packageNights: data.packageNights,
        includesFlight: data.includesFlight,
        includesPickDrop: data.includesPickDrop,
        packageSalePrice: Number(data.packageSalePrice) || 0,
        packageCostPrice: Number(data.packageCostPrice) || 0,
        numberOfPersons: Number(data.numberOfPersons) || 0,
        mainPersonPassport: data.mainPersonPassport,
        status: 'SALE_INITIATED',
        flightIssued: false,
        hotelsBooked: false,
        pickDropBooked: false,
        history: [{
          action: 'Package Sale Initiated',
          status: 'SALE_INITIATED',
          performedBy: appUser.name,
          timestamp: Date.now()
        }]
      };
    }

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'visa_files'), newFile);
    
    // Trigger new file creation animation
    triggerConfetti();
    setResultMessage('🎊 New File Created Successfully! 🎊');
    setResultModalOpen(true);
    
    setTimeout(() => {
      setActiveTab('dashboard');
    }, 1500);
  };

  const requestDeleteFile = (fileId) => { setFileToDelete(fileId); setDeleteConfirmOpen(true); };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', fileToDelete));
      setDeleteConfirmOpen(false);
      setFileToDelete(null);
    } catch (err) { console.error("Error deleting file:", err); }
  };

  const openUpdateModal = (file, action) => { 
    setSelectedFile(file); 
    setSelectedAction(action); 
    
    // Route to specialized modals for specific statuses
    const fileType = file.fileType;
    
    if (fileType === FILE_TYPES.AIR_TICKET) {
      if (action === 'BOOKED') {
        setAirTicketBookedModalOpen(true);
      } else if (action === 'ISSUED') {
        setAirTicketIssuedModalOpen(true);
      } else {
        setModalOpen(true);
      }
    } else if (fileType === FILE_TYPES.PACKAGE) {
      if (action === 'FLIGHT_ISSUED') {
        setPackageFlightIssuedModalOpen(true);
      } else if (action === 'HOTELS_BOOKED') {
        setPackageHotelsBookedModalOpen(true);
      } else if (action === 'PICKUP_DROPOFF_BOOKED') {
        setPackagePickupDropoffModalOpen(true);
      } else {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  };
  const openNoteModal = (file) => { setSelectedFile(file); setNoteModalOpen(true); };
  const openEditModal = (file) => { setSelectedFile(file); setEditModalOpen(true); };

  const handleStatusUpdate = async (note, result = null, newAssignee = null, reminderDate = null, cost = null, acknowledgeProcessing = false, specializedData = null) => {
    if (!appUser || !selectedFile) return;
    
    let updateData = {
      updatedAt: serverTimestamp(),
      history: []
    };

    // Handle "Send to Processing" action
    if (selectedAction === 'SEND_TO_PROCESSING' && newAssignee) {
      const newHistoryItem = {
        action: `File Sent to Processing - Assigned to: ${newAssignee}${note ? ` - Note: ${note}` : ''}`,
        status: 'HANDOVER_PROCESSING',
        performedBy: appUser.name,
        timestamp: Date.now()
      };
      updateData = {
        ...updateData,
        status: 'HANDOVER_PROCESSING',
        assignedTo: newAssignee,
        acknowledgedByProcessingAgent: false,
        history: [newHistoryItem, ...selectedFile.history]
      };
    }
    // Handle "Acknowledge Processing" action
    else if (selectedAction === 'ACKNOWLEDGE_PROCESSING') {
      const newHistoryItem = {
        action: `Processing Agent Acknowledged - Started Processing${note ? ` - Note: ${note}` : ''}`,
        status: 'HANDOVER_PROCESSING',
        performedBy: appUser.name,
        timestamp: Date.now()
      };
      updateData = {
        ...updateData,
        status: 'HANDOVER_PROCESSING',
        assignedTo: appUser.name,
        acknowledgedByProcessingAgent: true,
        history: [newHistoryItem, ...selectedFile.history]
      };
    }
    // Handle Air Ticket status updates
    else if (selectedFile.fileType === FILE_TYPES.AIR_TICKET && selectedAction) {
      let actionText = `Updated to ${STATUS[selectedAction].label}`;
      const newHistoryItem = {
        action: note ? `${actionText} - Note: ${note}` : actionText,
        status: selectedAction,
        performedBy: appUser.name,
        timestamp: Date.now()
      };

      const ticketUpdate = {
        ...updateData,
        status: selectedAction,
        history: [newHistoryItem, ...selectedFile.history]
      };

      // Add specialized data if provided (from modals)
      if (specializedData) {
        if (specializedData.pnr) ticketUpdate.pnr = specializedData.pnr;
        if (specializedData.portal) ticketUpdate.portal = specializedData.portal;
        if (specializedData.bookingValidity) ticketUpdate.bookingValidity = specializedData.bookingValidity;
      }

      updateData = ticketUpdate;
    }
    // Handle Package status updates
    else if (selectedFile.fileType === FILE_TYPES.PACKAGE && selectedAction) {
      let actionText = `Updated to ${STATUS[selectedAction].label}`;
      const newHistoryItem = {
        action: note ? `${actionText} - Note: ${note}` : actionText,
        status: selectedAction,
        performedBy: appUser.name,
        timestamp: Date.now()
      };

      const packageUpdate = {
        ...updateData,
        status: selectedAction,
        history: [newHistoryItem, ...selectedFile.history]
      };

      // Update package flags based on status
      if (selectedAction === 'FLIGHT_ISSUED') packageUpdate.flightIssued = true;
      if (selectedAction === 'HOTELS_BOOKED') packageUpdate.hotelsBooked = true;
      if (selectedAction === 'PICKUP_DROPOFF_BOOKED') packageUpdate.pickDropBooked = true;

      // Add specialized data if provided (from modals)
      if (specializedData) {
        if (specializedData.flightPnr) packageUpdate.flightPnr = specializedData.flightPnr;
        if (specializedData.flightPortal) packageUpdate.flightPortal = specializedData.flightPortal;
        if (specializedData.hotelName) packageUpdate.hotelName = specializedData.hotelName;
        if (specializedData.hotelFromDate) packageUpdate.hotelFromDate = specializedData.hotelFromDate;
        if (specializedData.hotelToDate) packageUpdate.hotelToDate = specializedData.hotelToDate;
        if (specializedData.routes) packageUpdate.routes = specializedData.routes;
      }

      updateData = packageUpdate;
    }
    // Handle regular status updates (Visa workflow)
    else if (selectedAction) {
      let actionText = `Updated status to ${STATUS[selectedAction].label}`;
      if (result) actionText = `Result Received: ${RESULTS[result].label}`;
      if (newAssignee) actionText += ` (Assigned to: ${newAssignee})`;
      if (reminderDate) actionText += ` (Reminder set: ${reminderDate})`;
      if (cost) actionText += ` (Cost Updated: ${cost})`;

      const newHistoryItem = {
        action: note ? `${actionText} - Note: ${note}` : actionText,
        status: selectedAction,
        result: result,
        performedBy: appUser.name,
        timestamp: Date.now()
      };

      let nextAssignee = selectedFile.assignedTo;
      if (newAssignee) nextAssignee = newAssignee;
      else if (selectedAction === 'HANDOVER_PROCESSING' && (!selectedFile.assignedTo || selectedFile.assignedTo === appUser.name)) nextAssignee = 'Processing Team'; 

      updateData = {
        ...updateData,
        status: selectedAction,
        assignedTo: nextAssignee,
        history: [newHistoryItem, ...selectedFile.history]
      };

      if (result) {
        updateData.visaResult = result;
        // Trigger animations based on result
        setTimeout(() => {
          if (result === 'APPROVED') {
            triggerConfettiExplosion();
            setResultMessage('🎉 Congratulations! Visa Approved! 🎉');
          } else if (result === 'REJECTED') {
            triggerSadAnimation();
            setResultMessage('😔 The visa application was rejected. Please review and reapply if needed.');
          }
          setResultModalOpen(true);
        }, 300);
      }
      
      // Trigger celebration for SUBMITTED status
      if (selectedAction === 'SUBMITTED') {
        setTimeout(() => {
          triggerConfetti();
          setResultMessage('✈️ File Successfully Submitted to Embassy! ✈️');
          setResultModalOpen(true);
        }, 300);
      }
      if (reminderDate) updateData.reminderDate = reminderDate;
      if (cost) updateData.cost = Number(cost);
    }

    const fileRef = doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', selectedFile.id);
    await updateDoc(fileRef, updateData);
    setModalOpen(false);
    setAirTicketBookedModalOpen(false);
    setAirTicketIssuedModalOpen(false);
    setPackageFlightIssuedModalOpen(false);
    setPackageHotelsBookedModalOpen(false);
    setPackagePickupDropoffModalOpen(false);
  };

  const handleAddNote = async (note) => {
    if (!appUser || !selectedFile || !note.trim()) return;
    const newHistoryItem = {
      action: `Note Added: ${note}`,
      status: selectedFile.status,
      performedBy: appUser.name,
      timestamp: Date.now()
    };
    const fileRef = doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', selectedFile.id);
    await updateDoc(fileRef, { updatedAt: serverTimestamp(), history: [newHistoryItem, ...selectedFile.history] });
    setNoteModalOpen(false);
  };

  const handleEditFile = async (data) => {
    if (!appUser || !selectedFile) return;
    
    try {
      const fileRef = doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', selectedFile.id);
      
      // Convert numeric strings to numbers where needed
      let updateData = { ...data };
      
      const oldCreatedBy = selectedFile.createdBy || '';
      const newCreatedBy = data.createdBy || '';
      
      console.log('Old createdBy:', oldCreatedBy, 'New createdBy:', newCreatedBy);
      
      // When createdBy (sales rep) is changed, update assignedTo and add history entry
      if (newCreatedBy && oldCreatedBy !== newCreatedBy) {
        console.log('Sales rep changed! Updating assignedTo and history');
        updateData.assignedTo = newCreatedBy;
        
        // Add to history to track sales rep change
        const historyEntry = {
          status: selectedFile.status,
          timestamp: Date.now(),
          performedBy: appUser.name,
          action: `Sales Rep changed from ${oldCreatedBy} to ${newCreatedBy}`,
          note: `Sales Rep changed from ${oldCreatedBy} to ${newCreatedBy}`
        };
        
        updateData.history = [...(selectedFile.history || []), historyEntry];
      }
      
      if (selectedFile.fileType === FILE_TYPES.VISA) {
        updateData.serviceCharge = Number(data.serviceCharge) || 0;
        updateData.cost = Number(data.cost) || 0;
      } else if (selectedFile.fileType === FILE_TYPES.AIR_TICKET) {
        updateData.airlineSalePrice = Number(data.airlineSalePrice) || 0;
        updateData.airlineCostPrice = Number(data.airlineCostPrice) || 0;
      } else if (selectedFile.fileType === FILE_TYPES.PACKAGE) {
        updateData.numberOfPersons = Number(data.numberOfPersons) || 0;
        updateData.packageSalePrice = Number(data.packageSalePrice) || 0;
        updateData.packageCostPrice = Number(data.packageCostPrice) || 0;
      }
      
      updateData.updatedAt = serverTimestamp();
      
      console.log('Final update data:', updateData);
      await updateDoc(fileRef, updateData);
      console.log('File updated successfully');
      setEditModalOpen(false);
      alert('File updated successfully!');
    } catch (err) {
      console.error('Error updating file:', err);
      alert('Failed to update file');
    }
  };

  const addMiscCost = async (data) => {
    if (!appUser) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'misc_costs'), {
        description: data.description,
        amount: Number(data.amount) || 0,
        category: data.category || 'Other',
        date: data.date || new Date().toISOString().split('T')[0],
        notes: data.notes || '',
        createdBy: appUser.name,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error adding misc cost:', err);
      alert('Failed to add expense');
    }
  };

  const deleteMiscCost = async (costId) => {
    if (confirm('Delete this expense entry?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'misc_costs', costId));
      } catch (err) {
        console.error('Error deleting misc cost:', err);
        alert('Failed to delete expense');
      }
    }
  };

  const containerClass = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800';
  const borderClass = darkMode ? 'border-slate-800' : 'border-slate-200';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';

  if (!user || loading) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
      <div className="flex flex-col items-center gap-4">
        <Activity className="animate-spin h-8 w-8 text-blue-600" />
        <p>Loading System...</p>
      </div>
    </div>
  );
  
  // Public Tracking Mode
  if (trackingMode) {
    return <PublicTrackingPage fileId={trackingFileId} files={files} loading={loading} darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} />;
  }
  
  if (!appUser) {
    return <LoginScreen onLogin={handleLogin} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
  }

  const NavItem = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
        activeTab === id 
          ? (darkMode ? "bg-slate-800 text-blue-400" : "bg-slate-100 text-blue-600") 
          : (darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 flex flex-col ${containerClass}`}>
      <nav className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b sticky top-0 z-20 print:hidden`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80"
                title="Go to Dashboard"
              >
                <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-xl font-bold ${textMain} hidden sm:block`}>VisaTrack Pro</h1>
                  <h1 className={`text-lg font-bold ${textMain} sm:hidden`}>VisaTrack</h1>
                </div>
              </button>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
               <div className="hidden md:flex gap-1">
                 <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={Layout} darkMode={darkMode}>Dashboard</NavButton>
                 {appUser.role !== ROLES.ACCOUNTS && (
                   <>
                     <NavButton active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} icon={List} darkMode={darkMode}>Pipeline</NavButton>
                     <NavButton active={activeTab === 'add'} onClick={() => setActiveTab('add')} icon={Plus} darkMode={darkMode}>New File</NavButton>
                     <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={Activity} darkMode={darkMode}>Stats</NavButton>
                   </>
                 )}
                 {(appUser.role === ROLES.ADMIN || appUser.role === ROLES.ACCOUNTS) && <NavButton active={activeTab === 'accounting'} onClick={() => setActiveTab('accounting')} icon={DollarSign} darkMode={darkMode}>Accounting</NavButton>}
                 {appUser.role === ROLES.ADMIN && (
                   <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={Shield} darkMode={darkMode}>Admin</NavButton>
                 )}
               </div>

               <button 
                 onClick={toggleDarkMode}
                 className={`p-2 rounded-full transition-colors ${darkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
               >
                 {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
               </button>

               <button 
                onClick={() => setShowNotifications(true)}
                className={`relative p-2 transition-colors ${darkMode ? 'text-slate-400 hover:text-blue-400' : 'text-slate-400 hover:text-blue-600'}`}
               >
                 <Bell className="h-5 w-5" />
                 {myTasks.length > 0 && (
                   <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                 )}
               </button>

               <div className={`flex items-center gap-3 pl-2 md:pl-6 md:border-l ${borderClass}`}>
                 <div className="text-right hidden sm:block">
                   <p className={`text-sm font-medium ${textMain}`}>{appUser.name}</p>
                   <p className={`text-xs ${textSub}`}>{appUser.role}</p>
                 </div>
                 <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                   <LogOut className="h-5 w-5" />
                 </button>
               </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Sidebar */}
        {mobileMenuOpen && (
          <div className={`md:hidden absolute top-16 left-0 w-full h-[calc(100vh-4rem)] z-50 p-4 border-t ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
             <div className="space-y-1">
                <NavItem id="dashboard" icon={Layout} label="Dashboard" />
                {appUser.role !== ROLES.ACCOUNTS && (
                  <>
                    <NavItem id="pipeline" icon={List} label="Work Pipeline" />
                    <NavItem id="add" icon={Plus} label="Register New File" />
                    <NavItem id="reports" icon={Activity} label="Statistical Reports" />
                  </>
                )}
                {(appUser.role === ROLES.ADMIN || appUser.role === ROLES.ACCOUNTS) && (
                  <NavItem id="accounting" onClick={() => setActiveTab('accounting')} icon={DollarSign} label="Accounting" />
                )}
                {appUser.role === ROLES.ADMIN && (
                  <NavItem id="admin" onClick={() => setActiveTab('admin')} icon={Shield} label="Admin Panel" />
                )}
             </div>
             <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3 px-4">
                   <div className={`h-10 w-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      <User className="h-5 w-5"/>
                   </div>
                   <div>
                      <p className={`font-medium ${textMain}`}>{appUser.name}</p>
                      <p className={`text-xs ${textSub}`}>{appUser.role}</p>
                   </div>
                </div>
             </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        {activeTab === 'dashboard' && (
          <Dashboard 
            files={files} 
            user={appUser} 
            destinations={destinations}
            allUsers={allUsers}
            attendanceRecords={attendanceRecords}
            onOpenUpdateModal={openUpdateModal} 
            onOpenNoteModal={openNoteModal}
            onOpenEditModal={openEditModal}
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm}
            setActiveTab={setActiveTab}
            myTasks={myTasks} 
            onDeleteFile={requestDeleteFile}
            darkMode={darkMode}
            onOpenInvoiceModal={(f) => { setInvoiceFile(f); setInvoiceModalOpen(true); }}
          />
        )}
        {activeTab === 'pipeline' && <PipelineView files={files} darkMode={darkMode} />}
        {activeTab === 'add' && (
          <AddFileForm 
            destinations={destinations} 
            onSubmit={addNewFile} 
            onCancel={() => setActiveTab('dashboard')} 
            darkMode={darkMode}
          />
        )}
        {activeTab === 'reports' && <StatisticalReports files={files} currentUser={appUser} darkMode={darkMode} onOpenInvoiceModal={(f) => { setInvoiceFile(f); setInvoiceModalOpen(true); }} />}
        {activeTab === 'accounting' && (appUser.role === ROLES.ADMIN || appUser.role === ROLES.ACCOUNTS) && (
          <AccountingPanel currentUser={appUser} files={files} miscCosts={miscCosts} onAddMiscCost={addMiscCost} onDeleteMiscCost={deleteMiscCost} darkMode={darkMode} isAdmin={appUser.role === ROLES.ADMIN} />
        )}
        {activeTab === 'admin' && appUser.role === ROLES.ADMIN && (
          <AdminPanel currentUser={appUser} destinations={destinations} darkMode={darkMode} />
        )}
      </main>

      <footer className={`py-6 text-center text-xs ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-100 text-slate-400'} print:hidden border-t`}>
        <p className="flex items-center justify-center gap-1.5">
          <Code2 className="h-3 w-3"/> 
          Developed by <span className={`font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>MD Rokibul Islam</span>
        </p>
      </footer>

      {/* Modals */}
      {modalOpen && (
        <StatusUpdateModal 
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleStatusUpdate}
          file={selectedFile}
          newStatus={selectedAction}
          allUsers={allUsers}
          darkMode={darkMode}
          userRole={appUser.role}
        />
      )}

      {noteModalOpen && (
        <NoteModal 
          isOpen={noteModalOpen}
          onClose={() => setNoteModalOpen(false)}
          onConfirm={handleAddNote}
          file={selectedFile}
          darkMode={darkMode}
        />
      )}

      {editModalOpen && (
        <EditFileModal 
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onConfirm={handleEditFile}
          file={selectedFile}
          destinations={destinations}
          darkMode={darkMode}
          allUsers={allUsers}
          currentUser={appUser}
        />
      )}

      {showNotifications && (
        <NotificationModal 
          isOpen={showNotifications} 
          onClose={() => setShowNotifications(false)}
          tasks={myTasks}
          onOpenTask={(file) => {
            setShowNotifications(false);
            openUpdateModal(file, file.status);
          }}
          darkMode={darkMode}
        />
      )}

      {deleteConfirmOpen && (
        <DeleteConfirmationModal
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={confirmDeleteFile}
          darkMode={darkMode}
        />
      )}

      {resultModalOpen && (
        <ResultModal
          isOpen={resultModalOpen}
          onClose={() => setResultModalOpen(false)}
          message={resultMessage}
          darkMode={darkMode}
        />
      )}

      {invoiceModalOpen && (
        <InvoiceModal
          isOpen={invoiceModalOpen}
          onClose={() => {
            setInvoiceModalOpen(false);
            setInvoiceFile(null);
          }}
          file={invoiceFile}
          darkMode={darkMode}
          onGenerateInvoice={generateInvoice}
        />
      )}

      {/* Specialized Status Update Modals */}
      {airTicketBookedModalOpen && (
        <AirTicketBookedModal
          isOpen={airTicketBookedModalOpen}
          onClose={() => setAirTicketBookedModalOpen(false)}
          onConfirm={(data) => {
            handleStatusUpdate(null, null, null, null, null, false, data);
            setAirTicketBookedModalOpen(false);
          }}
          file={selectedFile}
          darkMode={darkMode}
          portals={allPortals}
        />
      )}

      {airTicketIssuedModalOpen && (
        <AirTicketIssuedModal
          isOpen={airTicketIssuedModalOpen}
          onClose={() => setAirTicketIssuedModalOpen(false)}
          onConfirm={(data) => {
            handleStatusUpdate(null, null, null, null, null, false, data);
            setAirTicketIssuedModalOpen(false);
          }}
          file={selectedFile}
          darkMode={darkMode}
          portals={allPortals}
        />
      )}

      {packageFlightIssuedModalOpen && (
        <PackageFlightIssuedModal
          isOpen={packageFlightIssuedModalOpen}
          onClose={() => setPackageFlightIssuedModalOpen(false)}
          onConfirm={(data) => {
            handleStatusUpdate(null, null, null, null, null, false, data);
            setPackageFlightIssuedModalOpen(false);
          }}
          file={selectedFile}
          darkMode={darkMode}
          portals={allPortals}
        />
      )}

      {packageHotelsBookedModalOpen && (
        <PackageHotelsBookedModal
          isOpen={packageHotelsBookedModalOpen}
          onClose={() => setPackageHotelsBookedModalOpen(false)}
          onConfirm={(data) => {
            handleStatusUpdate(null, null, null, null, null, false, data);
            setPackageHotelsBookedModalOpen(false);
          }}
          file={selectedFile}
          darkMode={darkMode}
        />
      )}

      {packagePickupDropoffModalOpen && (
        <PackagePickupDropoffModal
          isOpen={packagePickupDropoffModalOpen}
          onClose={() => setPackagePickupDropoffModalOpen(false)}
          onConfirm={(data) => {
            handleStatusUpdate(null, null, null, null, null, false, data);
            setPackagePickupDropoffModalOpen(false);
          }}
          file={selectedFile}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

// --- Sub-Components ---

function NavButton({ active, onClick, icon: Icon, children, darkMode }) {
  const baseClass = "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors";
  const activeClass = darkMode ? "bg-slate-800 text-blue-400" : "bg-slate-100 text-blue-600";
  const inactiveClass = darkMode ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

  return (
    <button onClick={onClick} className={`${baseClass} ${active ? activeClass : inactiveClass}`}>
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function Dashboard({ files, user, destinations, onOpenUpdateModal, onOpenNoteModal, onOpenEditModal, searchTerm, setSearchTerm, setActiveTab, myTasks, onDeleteFile, darkMode, onOpenInvoiceModal, allUsers, attendanceRecords }) {
  const [destFilter, setDestFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const itemsPerPage = 20;

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  // Calculate honors board metrics - clean rebuild with proper logic
  const honorsMetrics = useMemo(() => {
    const HONORS_START_DATE = new Date(2025, 11, 16); // Reset point: Dec 16, 2025
    
    // Convert Firebase timestamp to Dhaka time
    const toDhakaTime = (timestamp) => {
      if (!timestamp) return null;
      const date = timestamp.toDate ? timestamp.toDate() : new Date((timestamp.seconds || 0) * 1000);
      return new Date(date.getTime() + (6 * 60 * 60 * 1000) - (date.getTimezoneOffset() * 60 * 1000));
    };
    
    // Get current Dhaka date
    const now = getDhakaDate();
    const todayString = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const monthString = `${now.getFullYear()}-${now.getMonth()}`;
    
    // Helper to create date string from date object
    const getDateString = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const getMonthString = (date) => `${date.getFullYear()}-${date.getMonth()}`;

    // Current Dhaka Y/M/D parts and a robust date key with padding (YYYY-MM-DD)
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    const getDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Build user roles map
    const userRoles = {};
    allUsers.forEach(u => {
      userRoles[u.fullName] = u.role;
    });
    
    // ===== CATEGORY 1: EARLIEST TODAY =====
    // Use attendance `date` if present (format YYYY-MM-DD) else fallback to Dhaka-converted loginTime
    const pad = (n) => String(n).padStart(2, '0');
    const dhakaDateString = `${currentYear}-${pad(currentMonth + 1)}-${pad(currentDay)}`;

    let earliestToday = { user: 'N/A', time: null };
    let earliestTime = Infinity;

    attendanceRecords.forEach(record => {
      // Prefer explicit date field
      if (record.date && record.date === dhakaDateString && record.loginTime) {
        const loginTime = toDhakaTime(record.loginTime);
        if (loginTime && loginTime.getTime() < earliestTime) {
          earliestTime = loginTime.getTime();
          earliestToday = { user: record.userName || 'System', time: loginTime };
        }
        return;
      }

      // Fallback to using loginTime conversion
      const loginTime = toDhakaTime(record.loginTime);
      if (!loginTime) return;
      const recordDateString = getDateKey(loginTime);
      const todayKey = getDateKey(now);
      if (recordDateString === todayKey && loginTime.getTime() < earliestTime) {
        earliestTime = loginTime.getTime();
        earliestToday = { user: record.userName || 'System', time: loginTime };
      }
    });

    // ===== CATEGORY 2: MOST PUNCTUAL =====
    // First login per user per day for current month (and after HONORS_START_DATE)
    const firstLoginByDay = {}; // Key: "user|YYYY-M-D" => minutes
    const monthWorkdaysByUser = {}; // user => Set of day keys in current month

    attendanceRecords.forEach(record => {
      if (!record.loginTime) return;
      const loginTime = toDhakaTime(record.loginTime);
      if (!loginTime || loginTime < HONORS_START_DATE) return;

      // Only consider records in current month
      if (loginTime.getFullYear() !== currentYear || loginTime.getMonth() !== currentMonth) return;

      // Skip Friday (5) - Dhaka weekend
      const dayOfWeek = loginTime.getDay();
      if (dayOfWeek === 5) return;

      const user = record.userName || 'System';
      const dateKey = getDateKey(loginTime);
      const userDateKey = `${user}|${dateKey}`;

      // Capture first login time per user/day
      if (!firstLoginByDay[userDateKey]) {
        firstLoginByDay[userDateKey] = loginTime.getHours() * 60 + loginTime.getMinutes();
      }

      if (!monthWorkdaysByUser[user]) monthWorkdaysByUser[user] = new Set();
      monthWorkdaysByUser[user].add(dateKey);
    });

    // Build punctuality stats
    const punctualityStats = {};
    Object.entries(firstLoginByDay).forEach(([key, minutes]) => {
      const user = key.split('|')[0];
      if (!punctualityStats[user]) punctualityStats[user] = { times: [], workdays: monthWorkdaysByUser[user]?.size || 0 };
      punctualityStats[user].times.push(minutes);
    });

    // Calculate how many workdays have occurred in the current month (excluding holidays)
    // Dhaka weekend: Friday (5) only
    const countWorkdaysSoFar = (startDate, endDate, holidays = []) => {
      let count = 0;
      const d = new Date(startDate);
      const holidayDates = new Set(holidays);
      while (d <= endDate) {
        const day = d.getDay();
        const dateStr = getDateKey(d);
        // Workdays: exclude Friday (5) and any holidays
        if (day !== 5 && !holidayDates.has(dateStr)) count++;
        d.setDate(d.getDate() + 1);
      }
      return count;
    };

    const monthStart = new Date(currentYear, currentMonth, 1);
    // TODO: Pass holidays from parent state when available
    const monthWorkdaysSoFar = countWorkdaysSoFar(monthStart, now, []);
    const minWorkdaysRequired = Math.ceil(monthWorkdaysSoFar * 0.9); // 90% threshold
    
    // Find most punctual (earliest average arrival time, tie-break by most workdays)
    let mostPunctual = { user: 'N/A', workdayCount: 0, avgTime: Infinity };
    
    Object.entries(punctualityStats).forEach(([user, stats]) => {
      const avgTime = stats.times.reduce((a, b) => a + b, 0) / stats.times.length;
      const workdays = stats.workdays;

      // Require minimum workdays participation
      if (workdays < minWorkdaysRequired) return;
      
      // Compare: earliest average time wins, if tied then most workdays wins
      const isBetter = (avgTime < mostPunctual.avgTime) || 
                       (avgTime === mostPunctual.avgTime && workdays > mostPunctual.workdayCount);
      
      if (isBetter) {
        mostPunctual = { user, workdayCount: workdays, avgTime };
      }
    });
    
    // ===== CATEGORY 3: BEST SALES =====
    let bestSales = { user: 'N/A', count: 0 };
    const salesCounts = {};
    
    files.forEach(file => {
      const createdDate = toDhakaTime(file.createdAt);
      if (!createdDate || createdDate < HONORS_START_DATE || !file.isNewSale) return;
      
      const fileMonthString = getMonthString(createdDate);
      if (fileMonthString !== monthString) return;
      
      const user = file.assignedTo || 'System';
      if (userRoles[user] !== ROLES.SALES) return;
      
      salesCounts[user] = (salesCounts[user] || 0) + 1;
    });
    
    Object.entries(salesCounts).forEach(([user, count]) => {
      if (count > bestSales.count) {
        bestSales = { user, count };
      }
    });
    
    // ===== CATEGORY 4: BEST PROCESSING =====
    let bestProcessing = { user: 'N/A', count: 0 };
    const processingCounts = {};
    
    files.forEach(file => {
      const updatedDate = toDhakaTime(file.updatedAt);
      if (!updatedDate || updatedDate < HONORS_START_DATE || file.status !== 'SUBMITTED') return;
      
      const fileMonthString = getMonthString(updatedDate);
      if (fileMonthString !== monthString) return;
      
      const user = file.assignedTo || 'System';
      processingCounts[user] = (processingCounts[user] || 0) + 1;
    });
    
    Object.entries(processingCounts).forEach(([user, count]) => {
      if (count > bestProcessing.count) {
        bestProcessing = { user, count };
      }
    });
    
    return {
      earliestToday,
      mostPunctual,
      bestSales,
      bestProcessing
    };
  }, [files, allUsers, attendanceRecords]);

  const isFileCompleted = (file) => {
    if (file.fileType === FILE_TYPES.VISA) {
      return ['DONE', 'FOLLOW_UP'].includes(file.status);
    } else if (file.fileType === FILE_TYPES.AIR_TICKET) {
      return file.status === 'ISSUED';
    } else if (file.fileType === FILE_TYPES.PACKAGE) {
      return file.status === 'PACKAGE_READY';
    }
    return false;
  };

  const stats = useMemo(() => {
    const today = getStartOf('today');
    let salesToday = 0;
    let submittedToday = 0;
    let inProcess = 0;

    files.forEach(f => {
      if (isFileCompleted(f)) return;

      const isSale = f.isNewSale !== false;
      
      if (f.createdAt?.seconds * 1000 >= today.getTime() && isSale) {
        salesToday++;
      }
      if (!['DONE', 'RECEIVED_SALES', 'FOLLOW_UP'].includes(f.status)) {
        inProcess++;
      }
      const submittedAction = f.history.find(h => h.status === 'SUBMITTED' && h.timestamp >= today.getTime());
      if (submittedAction) submittedToday++;
    });

    // Calculate workdays for current user this month
    const now = getDhakaDate();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const getDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // User's workdays (unique days with at least one login, excluding Fridays)
    const userWorkdaysSet = new Set();
    attendanceRecords.forEach(record => {
      if (!record.loginTime) return;
      const loginTime = record.loginTime.toDate ? record.loginTime.toDate() : new Date((record.loginTime.seconds || 0) * 1000);
      // Adjust to Dhaka time
      const dhakaTime = new Date(loginTime.getTime() + (6 * 60 * 60 * 1000) - (loginTime.getTimezoneOffset() * 60 * 1000));
      
      // Only count if in current month and not Friday (5)
      if (dhakaTime.getFullYear() === currentYear && dhakaTime.getMonth() === currentMonth && dhakaTime.getDay() !== 5) {
        userWorkdaysSet.add(getDateKey(dhakaTime));
      }
    });
    
    // Total workdays in month (1st to today, excluding Fridays)
    let totalWorkdaysInMonth = 0;
    const d = new Date(monthStart);
    while (d <= now) {
      if (d.getDay() !== 5) { // Skip Friday
        totalWorkdaysInMonth++;
      }
      d.setDate(d.getDate() + 1);
    }

    return { 
      salesToday, 
      submittedToday, 
      inProcess,
      daysWorked: userWorkdaysSet.size,
      totalWorkdaysMonth: totalWorkdaysInMonth
    };
  }, [files, isFileCompleted, attendanceRecords]);

  const recentActivity = useMemo(() => {
    const allEvents = [];
    files.forEach(f => {
      f.history.forEach(h => {
        allEvents.push({ ...h, fileId: f.fileId, applicant: f.applicantName, id: f.id });
      });
    });
    return allEvents.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [files]);

  // Upcoming Reminders Logic
  const reminders = useMemo(() => {
    const today = getDhakaDate();
    today.setHours(0,0,0,0); // Dhaka midnight today

    return files
        .filter(f => f.reminderDate)
        .map(f => {
            // Parse YYYY-MM-DD to Local Date to avoid UTC timezone issues
            const [y, m, d] = f.reminderDate.split('-').map(Number);
            const rDate = new Date(y, m - 1, d); // Month is 0-indexed
            return { ...f, rDate };
        })
        .filter(f => f.rDate >= today) // Strict filter: Must be today or future
        .sort((a, b) => a.rDate - b.rDate)
        .slice(0, 5); 
  }, [files]);
  
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredFiles = files.filter(f => {
    if (!normalizedSearch) return destFilter ? f.destination === destFilter : true;

    const matchesSearch = 
      (f.applicantName && String(f.applicantName).toLowerCase().includes(normalizedSearch)) || 
      (f.passportNo && String(f.passportNo).trim().toLowerCase().includes(normalizedSearch)) ||
      (f.mainPersonPassport && String(f.mainPersonPassport).trim().toLowerCase().includes(normalizedSearch)) ||
      (f.destination && String(f.destination).toLowerCase().includes(normalizedSearch)) ||
      (f.fileId && String(f.fileId).toLowerCase().includes(normalizedSearch));

    const matchesDest = destFilter ? f.destination === destFilter : true;
    return matchesSearch && matchesDest;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
  const currentFiles = filteredFiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Sidebar: Company Branding & Honors Board */}
      <div className="space-y-6">
        {/* Company Branding Section - Vertical */}
        <div className={`rounded-xl border p-4 ${cardClass}`}>
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <img 
              src={logoImage} 
              alt="Company Logo" 
              className="h-16 w-16 rounded-lg object-cover shadow-lg mb-3"
            />
            
            {/* Company Info */}
            <h2 className={`text-lg font-bold ${textMain} mb-2`}>{COMPANY_INFO.name}</h2>
            <div className={`${textSub} text-xs space-y-2`}>
              <div>
                <p className={`font-semibold ${textMain}`}>Trade License</p>
                <p className="truncate text-[10px]">{COMPANY_INFO.tradeNum}</p>
              </div>
              <div>
                <p className={`font-semibold ${textMain}`}>CAAB No</p>
                <p className="truncate text-[10px]">{COMPANY_INFO.caabNum}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Honors Board - Top Performers by Category */}
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className={`px-4 py-3 border-b ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
            <h3 className={`font-bold flex items-center gap-2 text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              ⭐ Honors Board
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Earliest Today */}
            <div className={`p-3 rounded-lg border ${darkMode ? 'border-blue-800/50 bg-blue-900/20' : 'border-blue-200 bg-blue-50'}`}>
              <p className={`text-[10px] font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'} uppercase tracking-wide mb-2`}>🌅 Earliest Today</p>
              {honorsMetrics.earliestToday ? (
                <p className={`text-sm font-semibold ${textMain}`}>{honorsMetrics.earliestToday.user}</p>
              ) : (
                <p className="text-xs text-slate-400">No activity today</p>
              )}
            </div>

            {/* Most Punctual */}
            <div className={`p-3 rounded-lg border ${darkMode ? 'border-green-800/50 bg-green-900/20' : 'border-green-200 bg-green-50'}`}>
              <p className={`text-[10px] font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'} uppercase tracking-wide mb-2`}>✓ Most Punctual</p>
              <p className={`text-sm font-semibold ${textMain}`}>{honorsMetrics.mostPunctual.user}</p>
              <p className={`text-xs ${textSub}`}>{honorsMetrics.mostPunctual.workdayCount} workdays this month</p>
            </div>

            {/* Best Sales */}
            <div className={`p-3 rounded-lg border ${darkMode ? 'border-purple-800/50 bg-purple-900/20' : 'border-purple-200 bg-purple-50'}`}>
              <p className={`text-[10px] font-semibold ${darkMode ? 'text-purple-400' : 'text-purple-600'} uppercase tracking-wide mb-2`}>💰 Best Sales</p>
              <p className={`text-sm font-semibold ${textMain}`}>{honorsMetrics.bestSales.user}</p>
              <p className={`text-xs ${textSub}`}>{honorsMetrics.bestSales.count} sales this month</p>
            </div>

            {/* Best Processing */}
            <div className={`p-3 rounded-lg border ${darkMode ? 'border-amber-800/50 bg-amber-900/20' : 'border-amber-200 bg-amber-50'}`}>
              <p className={`text-[10px] font-semibold ${darkMode ? 'text-amber-400' : 'text-amber-600'} uppercase tracking-wide mb-2`}>⚡ Best Processing</p>
              <p className={`text-sm font-semibold ${textMain}`}>{honorsMetrics.bestProcessing.user}</p>
              <p className={`text-xs ${textSub}`}>{honorsMetrics.bestProcessing.count} files completed this month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-3 space-y-8">
        {/* Clock and Workday Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`p-6 rounded-xl border flex items-center justify-between ${cardClass}`}>
            <div>
              <p className={`text-xs font-medium ${textSub}`}>Current Time (Dhaka)</p>
              <p className={`text-3xl md:text-4xl font-bold ${textMain} font-mono`}>{currentTime.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</p>
            </div>
            <div className={`${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'} p-4 rounded-full`}><Clock className="h-6 md:h-8 w-6 md:w-8"/></div>
          </div>

          <div className={`p-6 rounded-xl border flex items-center justify-between ${cardClass}`}>
            <div>
              <p className={`text-xs font-medium ${textSub}`}>Workdays This Month</p>
              <p className={`text-3xl md:text-4xl font-bold ${textMain}`}><span className="text-green-600">{stats.daysWorked || 0}</span>/<span className="text-slate-400">{stats.totalWorkdaysMonth || 0}</span></p>
              <p className={`text-xs ${textSub} mt-1`}>{stats.daysWorked ? Math.round((stats.daysWorked / stats.totalWorkdaysMonth) * 100) : 0}% attendance</p>
            </div>
            <div className={`${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'} p-4 rounded-full`}><Calendar className="h-6 md:h-8 w-6 md:w-8"/></div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className={`p-4 md:p-6 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 ${cardClass}`}>
          <div>
            <p className={`text-xs md:text-sm font-medium ${textSub}`}>Sales Today</p>
            <p className={`text-2xl md:text-3xl font-bold ${textMain}`}>{stats.salesToday}</p>
          </div>
          <div className={`${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'} p-2 md:p-3 rounded-full w-fit`}><TrendingUp className="h-5 md:h-6 w-5 md:w-6"/></div>
        </div>
        <div className={`p-4 md:p-6 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 ${cardClass}`}>
          <div>
            <p className={`text-xs md:text-sm font-medium ${textSub}`}>In Processing</p>
            <p className={`text-2xl md:text-3xl font-bold ${textMain}`}>{stats.inProcess}</p>
          </div>
          <div className={`${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'} p-2 md:p-3 rounded-full w-fit`}><Activity className="h-5 md:h-6 w-5 md:w-6"/></div>
        </div>
        <div className={`p-4 md:p-6 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 ${cardClass}`}>
          <div>
            <p className={`text-xs md:text-sm font-medium ${textSub}`}>Submitted Today</p>
            <p className={`text-2xl md:text-3xl font-bold ${textMain}`}>{stats.submittedToday}</p>
          </div>
          <div className={`${darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-600'} p-2 md:p-3 rounded-full w-fit`}><Send className="h-5 md:h-6 w-5 md:w-6"/></div>
        </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed / Search */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <h2 className={`text-xl font-bold ${textMain}`}>All Files</h2>
              <p className={`text-sm ${textSub}`}>Showing {currentFiles.length} of {filteredFiles.length} files</p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={destFilter}
                  onChange={(e) => setDestFilter(e.target.value)}
                  className={`pl-10 pr-8 py-2 border rounded-lg appearance-none text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48 h-full ${inputClass}`}
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
                  className={`pl-10 pr-4 py-2 border rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {currentFiles.length === 0 ? (
              <div className={`text-center py-10 rounded-xl border border-dashed ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
                <p className="text-slate-400">No files found.</p>
              </div>
            ) : (
              currentFiles.map(file => (
                <FileCard 
                    key={file.id} 
                    file={file} 
                    user={user} 
                    onOpenUpdateModal={onOpenUpdateModal} 
                    onOpenNoteModal={onOpenNoteModal}
                    onOpenEditModal={onOpenEditModal}
                    onDeleteFile={onDeleteFile} 
                    darkMode={darkMode}
                    onOpenInvoiceModal={onOpenInvoiceModal}
                />
              ))
            )}
            
            {/* Pagination Controls */}
            {filteredFiles.length > 0 && (
                <div className="flex items-center justify-between pt-4">
                    <p className={`text-xs ${textSub}`}>Page {currentPage} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 disabled:text-slate-700' : 'hover:bg-slate-100 disabled:text-slate-300'} disabled:cursor-not-allowed`}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 disabled:text-slate-700' : 'hover:bg-slate-100 disabled:text-slate-300'} disabled:cursor-not-allowed`}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* Sidebar: Tasks, Reminders & Activity */}
        <div className="space-y-6">
           {/* Upcoming Reminders */}
           <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
              <div className={`px-5 py-3 border-b ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
                 <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}><CalendarDays className="h-4 w-4"/> Upcoming Reminders</h3>
              </div>
              <div className={`divide-y max-h-64 overflow-y-auto ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                 {reminders.length === 0 ? (
                    <p className="p-4 text-sm text-slate-400 text-center">No upcoming reminders.</p>
                 ) : (
                    reminders.map(r => (
                       <div key={r.id} className={`p-4 transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`} onClick={() => onOpenUpdateModal(r, r.status)}>
                          <div className="flex justify-between items-start">
                             <span className={`font-medium text-sm ${textMain}`}>{r.applicantName}</span>
                             <span className={`text-xs px-2 py-0.5 rounded ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>{formatSimpleDate(r.reminderDate)}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{r.destination}</p>
                       </div>
                    ))
                 )}
              </div>
           </div>

           <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
              <div className={`px-5 py-3 border-b ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
                 <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}><CheckSquare className="h-4 w-4"/> My Active Tasks</h3>
              </div>
              <div className={`divide-y max-h-64 overflow-y-auto ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                 {myTasks.length === 0 ? (
                    <p className="p-4 text-sm text-slate-400 text-center">No active files assigned to you.</p>
                 ) : (
                    myTasks.map(t => (
                       <div key={t.id} className={`p-4 transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`} onClick={() => onOpenUpdateModal(t, t.status)}>
                          <div className="flex justify-between items-start">
                             <span className={`font-medium text-sm ${textMain}`}>{t.applicantName}</span>
                             <span className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{t.fileId}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{STATUS[t.status].label}</p>
                       </div>
                    ))
                 )}
              </div>
           </div>

           <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
              <div className={`px-5 py-3 border-b ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
                 <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}><Clock className="h-4 w-4"/> Recent Activity</h3>
              </div>
              <div className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                 {recentActivity.map((act, idx) => (
                    <div key={idx} className="p-4">
                       <p className={`text-sm ${textMain}`}><span className="font-medium">{act.performedBy}</span> {(act.action || act.note || '').split(' - ')[0]}</p>
                       <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-blue-500 font-medium">{act.fileId || 'N/A'} - {act.applicant}</span>
                          <span className="text-[10px] text-slate-400">{formatDate({seconds: act.timestamp/1000}).split(',')[1]}</span>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function AddFileForm({ onSubmit, onCancel, destinations, darkMode }) {
  const [fileType, setFileType] = useState(FILE_TYPES.VISA);
  const [formData, setFormData] = useState({ 
    applicantName: '', 
    passportNo: '', 
    contactNo: '', 
    destination: '',
    serviceCharge: '',
    cost: '',
    reminderDate: '',
    fileType: FILE_TYPES.VISA,
    // Air Ticket fields
    airlinePassenger: '',
    airlineRoute: '',
    airlineSalePrice: '',
    airlineCostPrice: '',
    // Package fields
    packageCountries: [],
    packageNights: {},
    includesFlight: false,
    includesPickDrop: false,
    packageSalePrice: '',
    packageCostPrice: '',
    numberOfPersons: '',
    mainPersonPassport: ''
  });
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    // First try to fetch countries from admin settings
    const fetchCountries = async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'countries');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().items && docSnap.data().items.length > 0) {
          setCountries(docSnap.data().items);
        } else {
          // Fallback to destinations if countries not found in settings
          if (destinations && destinations.length > 0) {
            setCountries(destinations);
          }
        }
      } catch (err) {
        console.error('Error fetching countries:', err);
        // Fallback to destinations on error
        if (destinations && destinations.length > 0) {
          setCountries(destinations);
        }
      }
    };
    fetchCountries();
  }, [destinations]);

  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const labelClass = darkMode ? 'text-slate-300' : 'text-slate-700';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  const handleFileTypeChange = (type) => {
    setFileType(type);
    setFormData({...formData, fileType: type});
  };

  const handleCountryToggle = (country) => {
    const updated = formData.packageCountries.includes(country)
      ? formData.packageCountries.filter(c => c !== country)
      : [...formData.packageCountries, country];
    setFormData({...formData, packageCountries: updated});
  };

  const handleNightsChange = (country, nights) => {
    setFormData({
      ...formData,
      packageNights: {...formData.packageNights, [country]: nights}
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({...formData, fileType});
  };

  return (
    <div className={`max-w-3xl mx-auto rounded-xl p-4 sm:p-8 border ${cardClass}`}>
      <h2 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 ${textMain}`}>Register New File</h2>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* File Type Selector */}
        <div>
          <label className={`block text-sm font-medium mb-3 ${labelClass}`}>File Type</label>
          <div className="flex gap-2 flex-wrap">
            {Object.values(FILE_TYPES).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => handleFileTypeChange(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  fileType === type 
                    ? 'bg-blue-600 text-white' 
                    : darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Common Fields for All Types */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="col-span-1 sm:col-span-2">
            <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Applicant/Passenger Full Name</label>
            <input 
              required
              className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
              placeholder={fileType === FILE_TYPES.VISA ? "As on passport" : "Passenger name"}
              value={formData.applicantName}
              onChange={e => setFormData({...formData, applicantName: e.target.value})}
            />
          </div>

          {fileType === FILE_TYPES.VISA && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Passport Number</label>
                <input 
                  required
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                  value={formData.passportNo}
                  onChange={e => setFormData({...formData, passportNo: e.target.value})}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Contact Number</label>
                <input 
                  required
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                  placeholder="+880..."
                  value={formData.contactNo}
                  onChange={e => setFormData({...formData, contactNo: e.target.value})}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Destination Country</label>
                <select
                  required
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                  value={formData.destination}
                  onChange={e => setFormData({...formData, destination: e.target.value})}
                >
                   <option value="">Select Destination</option>
                   {destinations.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </>
          )}

          {fileType === FILE_TYPES.AIR_TICKET && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Route (From - To)</label>
                <input 
                  required
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                  placeholder="e.g., Dhaka - Bangkok"
                  value={formData.airlineRoute}
                  onChange={e => setFormData({...formData, airlineRoute: e.target.value})}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Contact Number</label>
                <input 
                  required
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                  placeholder="+880..."
                  value={formData.contactNo}
                  onChange={e => setFormData({...formData, contactNo: e.target.value})}
                />
              </div>
            </>
          )}

          {fileType === FILE_TYPES.PACKAGE && (
            <>
              <div className="col-span-1 sm:col-span-2">
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Countries</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {countries.map(country => (
                    <label key={country} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                      <input
                        type="checkbox"
                        checked={formData.packageCountries.includes(country)}
                        onChange={() => handleCountryToggle(country)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{country}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.packageCountries.map(country => (
                <div key={country}>
                  <label className={`block text-sm font-medium mb-2 ${labelClass}`}>{country} - Nights</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                    value={formData.packageNights[country] || ''}
                    onChange={e => handleNightsChange(country, e.target.value)}
                  />
                </div>
              ))}

              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Number of Persons</label>
                <input
                  type="number"
                  min="1"
                  required
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                  placeholder="Enter number of persons"
                  value={formData.numberOfPersons}
                  onChange={e => setFormData({...formData, numberOfPersons: e.target.value})}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Main Person Passport No.</label>
                <input
                  type="text"
                  required
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                  placeholder="Enter passport number"
                  value={formData.mainPersonPassport}
                  onChange={e => setFormData({...formData, mainPersonPassport: e.target.value})}
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Package Options</label>
                <div className="space-y-2">
                  <label className={`flex items-center gap-2 p-2 rounded cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                    <input
                      type="checkbox"
                      checked={formData.includesFlight}
                      onChange={e => setFormData({...formData, includesFlight: e.target.checked})}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Including Flight?</span>
                  </label>
                  <label className={`flex items-center gap-2 p-2 rounded cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                    <input
                      type="checkbox"
                      checked={formData.includesPickDrop}
                      onChange={e => setFormData({...formData, includesPickDrop: e.target.checked})}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Including Pick & Drop?</span>
                  </label>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Sale Price - ৳</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 text-sm font-bold">৳</span>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className={`w-full pl-10 pr-3 sm:pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                    placeholder="0.00"
                    value={formData.packageSalePrice}
                    onChange={e => setFormData({...formData, packageSalePrice: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Cost Price - ৳</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 text-sm font-bold">৳</span>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className={`w-full pl-10 pr-3 sm:pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                    placeholder="0.00"
                    value={formData.packageCostPrice}
                    onChange={e => setFormData({...formData, packageCostPrice: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Contact Number</label>
                <input 
                  required
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                  placeholder="+880..."
                  value={formData.contactNo}
                  onChange={e => setFormData({...formData, contactNo: e.target.value})}
                />
              </div>
            </>
          )}

          {(fileType === FILE_TYPES.VISA || fileType === FILE_TYPES.AIR_TICKET) && fileType !== FILE_TYPES.PACKAGE && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Service Charge - ৳</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 text-sm font-bold">৳</span>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className={`w-full pl-10 pr-3 sm:pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                    placeholder="0.00"
                    value={formData.serviceCharge}
                    onChange={e => setFormData({...formData, serviceCharge: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Cost - ৳</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 text-sm font-bold">৳</span>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                    placeholder="0.00"
                    value={formData.cost}
                    onChange={e => setFormData({...formData, cost: e.target.value})}
                  />
                </div>
              </div>
            </>
          )}

          {fileType === FILE_TYPES.VISA && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Reminder Date (Optional)</label>
              <input 
                  type="date"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                  value={formData.reminderDate}
                  onChange={e => setFormData({...formData, reminderDate: e.target.value})}
              />
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className={`px-6 py-2 rounded-lg ${darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>Cancel</button>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Register File</button>
        </div>
      </form>
    </div>
  );
}

function PipelineView({ files, darkMode }) {
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

  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const columnClass = darkMode ? 'bg-slate-900/50' : 'bg-slate-100';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-800';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${textMain}`}>Work Pipeline</h2>
          <p className="text-slate-500">Current workload distribution by employee</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-x-auto pb-4">
        {Object.entries(groupedFiles).map(([user, userFiles]) => (
          <div key={user} className={`rounded-xl p-4 min-w-[300px] flex flex-col h-full max-h-[calc(100vh-200px)] ${columnClass}`}>
             <div className="flex justify-between items-center mb-3 px-1">
                <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-500'}`}><User className="h-4 w-4"/></div>
                   {user}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{userFiles.length}</span>
             </div>
             
             <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
               {userFiles.map(file => (
                 <div key={file.id} className={`p-3 rounded-lg border transition-shadow ${cardClass}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-mono text-slate-400">{file.fileId}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${darkMode && STATUS[file.status].darkColor ? STATUS[file.status].darkColor : STATUS[file.status].color}`}>{STATUS[file.status].label}</span>
                    </div>
                    <h4 className={`font-medium line-clamp-1 ${textMain}`}>{file.applicantName}</h4>
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

function AdminPanel({ currentUser, destinations, darkMode }) {
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ fullName: '', username: '', password: '', role: ROLES.SALES });
  const [newDest, setNewDest] = useState('');
  const [newPortal, setNewPortal] = useState('');
  const [portals, setPortals] = useState([]);
  const [isTrusted, setIsTrusted] = useState(() => localStorage.getItem('vt_trusted_device') === 'true');
  const [activeSessions, setActiveSessions] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ startDate: '', endDate: '', reason: '' });
  
  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  useEffect(() => {
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'agency_users');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'portals');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setPortals(snapshot.data().items || AIR_TICKET_PORTALS);
      } else {
        setPortals(AIR_TICKET_PORTALS);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const attQ = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'attendance'),
      where('logoutTime', '==', null)
    );
    const unsubscribe = onSnapshot(attQ, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveSessions(sessions);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'holidays');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setHolidays(snapshot.data().items || []);
      } else {
        setHolidays([]);
      }
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

  const handleAddPortal = async (e) => {
    e.preventDefault();
    if (!newPortal.trim()) return;
    
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'portals');
    await setDoc(docRef, { items: arrayUnion(newPortal.trim()) }, { merge: true });
    setNewPortal('');
  };

  const handleDeletePortal = async (portal) => {
    if (confirm(`Remove ${portal} from portal list?`)) {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'portals');
      await updateDoc(docRef, { items: arrayRemove(portal) });
    }
  };

  const toggleTrust = () => {
    if (isTrusted) {
        localStorage.removeItem('vt_trusted_device');
        setIsTrusted(false);
    } else {
        localStorage.setItem('vt_trusted_device', 'true');
        setIsTrusted(true);
    }
  };

  const endSessionForUser = async (sessionId, userName) => {
    if (confirm(`End attendance session for ${userName}?`)) {
      try {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'attendance', sessionId);
        await updateDoc(ref, { logoutTime: serverTimestamp() });
      } catch (err) {
        console.error('Error ending session:', err);
        alert('Failed to end session');
      }
    }
  };

  const endAllActiveSessions = async () => {
    if (confirm(`End all ${activeSessions.length} active attendance sessions?`)) {
      try {
        for (const session of activeSessions) {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'attendance', session.id);
          await updateDoc(ref, { logoutTime: serverTimestamp() });
        }
      } catch (err) {
        console.error('Error ending all sessions:', err);
        alert('Failed to end some sessions');
      }
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!holidayForm.startDate || !holidayForm.endDate) {
      alert('Please select both start and end dates');
      return;
    }
    
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'holidays');
      await setDoc(docRef, { items: arrayUnion(holidayForm) }, { merge: true });
      setHolidayForm({ startDate: '', endDate: '', reason: '' });
      setShowHolidayForm(false);
    } catch (err) {
      console.error('Error adding holiday:', err);
      alert('Error adding holiday period');
    }
  };

  const handleDeleteHoliday = async (holiday) => {
    if (confirm(`Remove holiday period ${holiday.startDate} to ${holiday.endDate}?`)) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'holidays');
        await updateDoc(docRef, { items: arrayRemove(holiday) });
      } catch (err) {
        console.error('Error deleting holiday:', err);
        alert('Error removing holiday');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className={`text-2xl font-bold ${textMain}`}>Admin Control Panel</h2>
           <p className="text-slate-500">Manage system settings and user access</p>
        </div>
      </div>

      {/* Device Auth Card */}
      <div className={`p-6 rounded-xl border mb-6 ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
        <h3 className={`font-bold mb-2 flex items-center gap-2 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
            <Monitor className="h-5 w-5"/> Device Authorization
        </h3>
        <p className={`text-sm opacity-80 mb-4 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
            Current Status: <strong>{isTrusted ? "✅ Trusted Office PC" : "🚫 Unregistered Device"}</strong>
        </p>
        <button onClick={toggleTrust} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            {isTrusted ? "Revoke Authorization" : "Authorize This Device"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Management Section */}
        <div className="lg:col-span-2 space-y-6">
           <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
             <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
                <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}><Users className="h-5 w-5"/> Staff Accounts</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>{users.length} Users</span>
             </div>
             
             {/* Add User Form */}
             <div className={`p-6 border-b ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50/50'}`}>
               <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Create New Account</h4>
               <form onSubmit={handleAddUser} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 <input 
                   required
                   className={`px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                   placeholder="Full Name"
                   value={userForm.fullName}
                   onChange={e => setUserForm({...userForm, fullName: e.target.value})}
                 />
                 <input 
                   required
                   className={`px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                   placeholder="User ID"
                   value={userForm.username}
                   onChange={e => setUserForm({...userForm, username: e.target.value})}
                 />
                 <input 
                   required
                   type="password"
                   className={`px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                   placeholder="Password"
                   value={userForm.password}
                   onChange={e => setUserForm({...userForm, password: e.target.value})}
                 />
                 <div className="flex gap-2">
                   <select 
                     className={`w-full px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
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
             <div className={`divide-y max-h-64 overflow-y-auto ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
               {users.map(u => (
                 <div key={u.id} className={`p-4 flex items-center justify-between transition-colors ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                   <div className="flex items-center gap-3 flex-1">
                     <div className={`h-8 w-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                       <User className="h-4 w-4" />
                     </div>
                     <div className="flex-1">
                       <p className={`font-medium text-sm ${textMain}`}>{u.fullName}</p>
                       <p className="text-[10px] text-slate-500 uppercase tracking-wide">{u.role} • {u.username}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
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
                 </div>
               ))}
             </div>
           </div>
        </div>

        {/* Destination Settings Section */}
        <div className={`rounded-xl border h-fit ${cardClass}`}>
          <div className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
             <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}><Globe className="h-5 w-5"/> Destinations</h3>
          </div>
          <div className={`p-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
             <form onSubmit={handleAddDestination} className="flex gap-2">
               <input 
                 className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
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
                 <span key={d} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {d}
                    <button onClick={() => handleDeleteDestination(d)} className="hover:text-red-600 text-slate-400 ml-1"><X className="h-3 w-3"/></button>
                 </span>
               ))}
               {destinations.length === 0 && <span className="text-slate-400 text-sm p-2">No destinations set.</span>}
             </div>
          </div>
        </div>

        {/* Portal Settings Section */}
        <div className={`rounded-xl border h-fit ${cardClass}`}>
          <div className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
             <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}><Plane className="h-5 w-5"/> Airline Portals</h3>
          </div>
          <div className={`p-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
             <form onSubmit={handleAddPortal} className="flex gap-2">
               <input 
                 className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                 placeholder="Add Portal..."
                 value={newPortal}
                 onChange={e => setNewPortal(e.target.value)}
               />
               <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Plus className="h-5 w-5"/></button>
             </form>
          </div>
          <div className="p-2 max-h-[400px] overflow-y-auto">
             <div className="flex flex-wrap gap-2">
               {portals.map(p => (
                 <span key={p} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {p}
                    <button onClick={() => handleDeletePortal(p)} className="hover:text-red-600 text-slate-400 ml-1"><X className="h-3 w-3"/></button>
                 </span>
               ))}
               {portals.length === 0 && <span className="text-slate-400 text-sm p-2">No portals set.</span>}
             </div>
          </div>
        </div>

      </div>

      {/* Holiday Period Management Section */}
      <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
        <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
          <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            <Calendar className="h-5 w-5"/> Holiday Periods
          </h3>
          <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>{holidays.length} Periods</span>
        </div>

        <div className={`p-4 border-b ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>
          {!showHolidayForm ? (
            <button
              onClick={() => setShowHolidayForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Plus className="h-4 w-4"/> Add Holiday Period
            </button>
          ) : (
            <form onSubmit={handleAddHoliday} className="space-y-3">
              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Start Date</label>
                <input 
                  type="date"
                  required
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                  value={holidayForm.startDate}
                  onChange={e => setHolidayForm({...holidayForm, startDate: e.target.value})}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>End Date</label>
                <input 
                  type="date"
                  required
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                  value={holidayForm.endDate}
                  onChange={e => setHolidayForm({...holidayForm, endDate: e.target.value})}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Reason (optional)</label>
                <input 
                  type="text"
                  placeholder="e.g., National Holiday, Office Maintenance"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                  value={holidayForm.reason}
                  onChange={e => setHolidayForm({...holidayForm, reason: e.target.value})}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 text-sm font-medium">Save</button>
                <button type="button" onClick={() => setShowHolidayForm(false)} className="flex-1 bg-slate-600 text-white p-2 rounded-lg hover:bg-slate-700 text-sm font-medium">Cancel</button>
              </div>
            </form>
          )}
        </div>

        <div className={`divide-y max-h-64 overflow-y-auto ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
          {holidays.length === 0 ? (
            <div className={`p-4 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <p className="text-sm">No holiday periods set</p>
            </div>
          ) : (
            holidays.map((holiday, idx) => (
              <div key={idx} className={`p-4 flex items-center justify-between transition-colors ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${textMain}`}>{holiday.startDate} to {holiday.endDate}</p>
                  {holiday.reason && <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{holiday.reason}</p>}
                </div>
                <button
                  onClick={() => handleDeleteHoliday(holiday)}
                  className="text-slate-400 hover:text-red-600 p-1"
                  title="Delete Holiday"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Attendance Sessions Management Section */}
      <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
        <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
          <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            <Clock className="h-5 w-5"/> Active Attendance Sessions
          </h3>
          <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>{activeSessions.length} Active</span>
        </div>
        
        {activeSessions.length === 0 ? (
          <div className={`p-6 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <p className="text-sm">No active attendance sessions</p>
          </div>
        ) : (
          <>
            <div className={`p-4 border-b flex gap-2 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>
              <button
                onClick={endAllActiveSessions}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
              >
                <LogOut className="h-4 w-4"/> End All Sessions
              </button>
            </div>

            <div className={`divide-y max-h-80 overflow-y-auto ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {activeSessions.map(session => (
                <div key={session.id} className={`p-4 flex items-center justify-between transition-colors ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                  <div className="flex-1">
                    <p className={`font-medium ${textMain}`}>{session.userName}</p>
                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Login: {formatTimeOnly(session.loginTime)} • Date: {session.date}
                    </p>
                  </div>
                  <button
                    onClick={() => endSessionForUser(session.id, session.userName)}
                    className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                  >
                    End
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FileCard({ file, user, onOpenUpdateModal, onOpenNoteModal, onOpenEditModal, onDeleteFile, darkMode, onOpenInvoiceModal }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const StatusIcon = STATUS[file.status].icon;
  const isOwner = file.assignedTo === user.name || (file.status === 'HANDOVER_PROCESSING' && user.role === ROLES.PROCESSING);

  const generateTrackingLink = () => {
    const baseUrl = window.location.origin;
    const trackingUrl = `${baseUrl}?track=${file.fileId}`;
    
    navigator.clipboard.writeText(trackingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy link. Please try again.');
    });
  };

  const getAvailableActions = () => {
    const actions = [];
    
    // Air Ticket workflow - Any staff can update
    if (file.fileType === FILE_TYPES.AIR_TICKET) {
      if (file.status === 'SALE_INITIATED') {
        actions.push({ key: 'BOOKED', label: STATUS['BOOKED'].label, isSpecial: true });
      }
      if (file.status === 'BOOKED') {
        actions.push({ key: 'ISSUED', label: STATUS['ISSUED'].label, isSpecial: true });
      }
      return actions;
    }
    
    // Package workflow - Any staff can update
    if (file.fileType === FILE_TYPES.PACKAGE) {
      const actions_pkg = [];
      
      // From SALE_INITIATED
      if (file.status === 'SALE_INITIATED') {
        if (file.includesFlight) {
          actions_pkg.push({ key: 'FLIGHT_ISSUED', label: STATUS['FLIGHT_ISSUED'].label });
        } else {
          actions_pkg.push({ key: 'HOTELS_BOOKED', label: STATUS['HOTELS_BOOKED'].label });
        }
      }
      // From FLIGHT_ISSUED
      else if (file.status === 'FLIGHT_ISSUED') {
        actions_pkg.push({ key: 'HOTELS_BOOKED', label: STATUS['HOTELS_BOOKED'].label });
      }
      // From HOTELS_BOOKED
      else if (file.status === 'HOTELS_BOOKED') {
        if (file.includesPickDrop) {
          actions_pkg.push({ key: 'PICKUP_DROPOFF_BOOKED', label: STATUS['PICKUP_DROPOFF_BOOKED'].label });
        } else {
          actions_pkg.push({ key: 'PACKAGE_READY', label: STATUS['PACKAGE_READY'].label });
        }
      }
      // From PICKUP_DROPOFF_BOOKED
      else if (file.status === 'PICKUP_DROPOFF_BOOKED') {
        actions_pkg.push({ key: 'PACKAGE_READY', label: STATUS['PACKAGE_READY'].label });
      }
      
      return actions_pkg;
    }
    
    // Visa workflow (existing logic)
    // Sales Rep can send to processing
    if (user.role === ROLES.SALES && file.status === 'RECEIVED_SALES') {
      actions.push({ key: 'SEND_TO_PROCESSING', label: 'Sent to Processing', isSpecial: true });
    }
    
    // Processing Agent can acknowledge
    if (user.role === ROLES.PROCESSING && file.status === 'HANDOVER_PROCESSING' && !file.acknowledgedByProcessingAgent) {
      actions.push({ key: 'ACKNOWLEDGE_PROCESSING', label: 'In Processing', isSpecial: true });
    }
    
    if (file.status === 'RECEIVED_SALES') actions.push({ key: 'HANDOVER_PROCESSING', label: STATUS['HANDOVER_PROCESSING'].label });
    if (file.status === 'HANDOVER_PROCESSING') actions.push({ key: 'HANDOVER_PROCESSING', label: STATUS['HANDOVER_PROCESSING'].label });
    
    // Logic Update: keep In Processing available for Docs Pending
    if (file.status === 'DOCS_PENDING' && user.role === ROLES.PROCESSING) {
        actions.push({ key: 'HANDOVER_PROCESSING', label: STATUS['HANDOVER_PROCESSING'].label }); // Back to processing
    }

    if (['HANDOVER_PROCESSING', 'DOCS_PENDING', 'PAYMENT_PENDING', 'SUBMITTED', 'FOLLOW_UP'].includes(file.status) && user.role === ROLES.PROCESSING) {
       if (file.status !== 'DOCS_PENDING') actions.push({ key: 'DOCS_PENDING', label: STATUS['DOCS_PENDING'].label });
       if (file.status !== 'PAYMENT_PENDING') actions.push({ key: 'PAYMENT_PENDING', label: STATUS['PAYMENT_PENDING'].label });
       if (file.status !== 'SUBMITTED') actions.push({ key: 'SUBMITTED', label: STATUS['SUBMITTED'].label });
    }

    if (['SUBMITTED', 'FOLLOW_UP'].includes(file.status)) {
      actions.push({ key: 'DONE', label: STATUS['DONE'].label });
      actions.push({ key: 'FOLLOW_UP', label: STATUS['FOLLOW_UP'].label });
    }
    
    if (file.status !== 'DONE' && file.status !== 'FOLLOW_UP') actions.push({ key: 'FOLLOW_UP', label: STATUS['FOLLOW_UP'].label });

    return actions;
  };

  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const statusColor = (darkMode && STATUS[file.status].darkColor) ? STATUS[file.status].darkColor : STATUS[file.status].color;
  const iconColor = statusColor.split(' ')[1] || 'text-slate-600';
  const iconBg = statusColor.split(' ')[0] || 'bg-slate-100';

  return (
    <div className={`rounded-xl border overflow-hidden transition-all hover:shadow-md ${cardClass}`}>
      <div className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${iconBg}`}>
              <StatusIcon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <h3 className={`text-lg font-bold ${textMain}`}>{file.applicantName}</h3>
                 <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{file.fileId || 'NO-ID'}</span>
                 <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                   file.fileType === FILE_TYPES.VISA ? (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700') :
                   file.fileType === FILE_TYPES.AIR_TICKET ? (darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700') :
                   file.fileType === FILE_TYPES.PACKAGE ? (darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') :
                   ''
                 }`}>{file.fileType || FILE_TYPES.VISA}</span>
              </div>
              
            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm ${textSub}`}>
                {file.visaResult === 'APPROVED' && <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${darkMode ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-100 text-green-700 border-green-200'}`}><ThumbsUp className="h-3 w-3"/> Approved</span>}
                {file.visaResult === 'REJECTED' && <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${darkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-100 text-red-700 border-red-200'}`}><ThumbsDown className="h-3 w-3"/> Rejected</span>}
                
                {file.fileType === FILE_TYPES.PACKAGE ? (
                  <>
                    {file.numberOfPersons && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {file.numberOfPersons} person{file.numberOfPersons > 1 ? 's' : ''}</span>}
                    {file.mainPersonPassport && <span className="flex items-center gap-1"><User className="h-3 w-3" /> Passport: {file.mainPersonPassport}</span>}
                    {file.packageCountries && file.packageCountries.length > 0 && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {file.packageCountries.join(', ')}</span>}
                    {file.packageSalePrice && <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="text-sm font-bold">৳</span> {file.packageSalePrice}</span>}
                  </>
                ) : file.fileType === FILE_TYPES.AIR_TICKET ? (
                  <>
                    {file.airlineRoute && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {file.airlineRoute}</span>}
                    {file.airlineSalePrice && <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="text-sm font-bold">৳</span> {file.airlineSalePrice}</span>}
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {file.passportNo}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {file.destination || 'N/A'}</span>
                    {file.serviceCharge && <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="text-sm font-bold\">৳</span> {file.serviceCharge}</span>}
                  </>
                )}
                <span className="flex items-center gap-1">📞 {file.contactNo}</span>
                {file.reminderDate && <span className="flex items-center gap-1 text-orange-500"><Clock className="h-3 w-3"/> {formatSimpleDate(file.reminderDate)}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
              {STATUS[file.status].label}
            </span>
            <span className="text-xs text-slate-400">Assigned: {file.assignedTo}</span>
          </div>
        </div>

        <div className={`mt-6 pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <button 
                onClick={() => setExpanded(!expanded)}
                className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              {expanded ? 'Hide' : 'View'}
            </button>
            
            {/* Tracking Link Button */}
            <button 
                onClick={generateTrackingLink}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${copied ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'text-slate-400 hover:text-blue-500 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-500 hover:bg-slate-100')}`}
                title={copied ? 'Copied!' : 'Copy tracking link'}
            >
                {copied ? <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </button>
            
            {/* Universal Note Button */}
            <button 
                onClick={() => onOpenNoteModal(file)}
                className={`p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors`}
                title="Add Note"
            >
                <StickyNote className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            {/* Invoice Button */}
            <button 
                onClick={() => onOpenInvoiceModal && onOpenInvoiceModal(file)}
                className={`p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors`}
                title="Generate Invoice"
            >
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            {/* Admin Edit Button */}
            {user.role === ROLES.ADMIN && (
              <>
                <button 
                    onClick={() => onOpenEditModal(file)}
                    className={`p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors`}
                    title="Edit File"
                >
                    <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button 
                    onClick={() => onDeleteFile(file.id)}
                    className={`p-1.5 sm:p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-colors`}
                    title="Delete File"
                >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </>
            )}
          </div>

          {(isOwner || ((file.fileType === FILE_TYPES.PACKAGE || file.fileType === FILE_TYPES.AIR_TICKET) && user.role === ROLES.ADMIN)) && file.status !== 'DONE' && file.status !== 'ISSUED' && file.status !== 'PACKAGE_READY' && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
              {getAvailableActions().map(action => (
                <button
                  key={action.key}
                  onClick={() => {
                    if (action.key === 'SEND_TO_PROCESSING') {
                      onOpenUpdateModal(file, 'SEND_TO_PROCESSING');
                    } else if (action.key === 'ACKNOWLEDGE_PROCESSING') {
                      onOpenUpdateModal(file, 'ACKNOWLEDGE_PROCESSING');
                    } else {
                      onOpenUpdateModal(file, action.key);
                    }
                  }}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    action.isSpecial 
                      ? (darkMode ? 'bg-green-900/30 text-green-300 hover:bg-green-600 hover:text-white' : 'bg-green-100 text-green-700 hover:bg-green-600 hover:text-white')
                      : (darkMode ? 'bg-slate-800 text-slate-200 hover:bg-blue-600 hover:text-white' : 'bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white')
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className={`p-5 border-t ${darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
          {/* Display Air Ticket & Package Details */}
          {file.fileType === FILE_TYPES.AIR_TICKET && (file.pnr || file.portal || file.bookingValidity) && (
            <div className="mb-6 p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
              <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3">✈️ Flight Details</h4>
              <div className="space-y-2 text-sm">
                {file.pnr && <p><span className="font-medium">PNR:</span> {file.pnr}</p>}
                {file.portal && <p><span className="font-medium">Portal:</span> {file.portal}</p>}
                {file.bookingValidity && <p><span className="font-medium">Valid Until:</span> {file.bookingValidity.date} {file.bookingValidity.time}</p>}
              </div>
            </div>
          )}

          {file.fileType === FILE_TYPES.PACKAGE && (file.numberOfPersons || file.mainPersonPassport || file.flightPnr || file.hotelName || file.routes) && (
            <div className="mb-6 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3">📦 Package Details</h4>
              <div className="space-y-3 text-sm">
                {(file.packageCountries && file.packageCountries.length > 0) && (
                  <div className="pb-3 border-b border-emerald-200 dark:border-emerald-800">
                    <p className="font-medium">Itinerary</p>
                    <div className="text-xs space-y-1 mt-1">
                      {file.packageCountries.map(country => (
                        <p key={country} className="text-slate-600 dark:text-slate-400">
                          <span className="font-medium">{country}:</span> {file.packageNights && file.packageNights[country] ? file.packageNights[country] + ' nights' : 'N/A'}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {(file.includesFlight !== undefined || file.includesPickDrop !== undefined) && (
                  <div className="pb-3 border-b border-emerald-200 dark:border-emerald-800">
                    <p className="font-medium">Package Inclusions</p>
                    <div className="text-xs space-y-1 mt-1">
                      <p className="text-slate-600 dark:text-slate-400">✈️ Flight: {file.includesFlight ? 'Yes' : 'No'}</p>
                      <p className="text-slate-600 dark:text-slate-400">🚗 Pick & Drop: {file.includesPickDrop ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                )}
                {(file.numberOfPersons || file.mainPersonPassport) && (
                  <div className="pb-3 border-b border-emerald-200 dark:border-emerald-800">
                    <p className="font-medium">Passenger Information</p>
                    {file.numberOfPersons && <p className="text-xs"><span className="font-medium">Number of Persons:</span> {file.numberOfPersons}</p>}
                    {file.mainPersonPassport && <p className="text-xs"><span className="font-medium">Main Person Passport:</span> {file.mainPersonPassport}</p>}
                  </div>
                )}
                {file.flightPnr && (
                  <div className="pb-3 border-b border-emerald-200 dark:border-emerald-800">
                    <p className="font-medium">Flight Booking</p>
                    <p className="text-xs"><span className="font-medium">PNR:</span> {file.flightPnr}</p>
                    {file.flightPortal && <p className="text-xs"><span className="font-medium">Portal:</span> {file.flightPortal}</p>}
                  </div>
                )}
                {file.hotelName && (
                  <div className="pb-3 border-b border-emerald-200 dark:border-emerald-800">
                    <p className="font-medium">Hotel Booking</p>
                    <p className="text-xs"><span className="font-medium">Hotel:</span> {file.hotelName}</p>
                    {file.hotelFromDate && <p className="text-xs"><span className="font-medium">Dates:</span> {file.hotelFromDate} to {file.hotelToDate}</p>}
                  </div>
                )}
                {file.routes && file.routes.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Pick & Drop Routes</p>
                    <div className="space-y-2">
                      {file.routes.map((route, idx) => (
                        <div key={idx} className="text-xs bg-white dark:bg-slate-800 p-2 rounded border border-emerald-100 dark:border-emerald-700">
                          <p><span className="font-medium">Trip {idx + 1}:</span> {route.from} → {route.to}</p>
                          <p><span className="font-medium">Vendor:</span> {route.vendor}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Audit Trail</h4>
          <div className="space-y-4">
            {file.history.map((entry, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="mt-1 flex flex-col items-center">
                  <div className={`h-2 w-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
                  {idx !== file.history.length - 1 && <div className={`w-px h-full my-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>}
                </div>
                <div>
                  <p className={`text-sm font-medium ${textMain}`}>{entry.action}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(entry.timestamp)} • <span className="text-blue-500">{entry.performedBy}</span>
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

function StatusUpdateModal({ isOpen, onClose, onConfirm, file, newStatus, allUsers, darkMode, userRole }) {
    const [note, setNote] = useState('');
    const [result, setResult] = useState(null); 
    const [assignee, setAssignee] = useState(''); 
    const [reminderDate, setReminderDate] = useState(''); 
    const [cost, setCost] = useState('');
  
    if (!isOpen) return null;
  
    const isSendToProcessing = newStatus === 'SEND_TO_PROCESSING';
    const isAcknowledgeProcessing = newStatus === 'ACKNOWLEDGE_PROCESSING';
    const isDone = newStatus === 'DONE';
    const isSubmitted = newStatus === 'SUBMITTED';
    const isAdminOrProcessor = userRole === ROLES.ADMIN || userRole === ROLES.PROCESSING;

    const cardClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
    const inputClass = darkMode 
      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
      : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';
  
    const handleSubmit = () => {
       if (isDone && !result) {
         alert("Please select a result (Approved or Rejected)");
         return;
       }
       
       if (isSendToProcessing && !assignee) {
         alert("Please select a processing agent to assign this file");
         return;
       }
       
       if (isSendToProcessing) {
         onConfirm(note, null, assignee, null, null, false);
       } else if (isAcknowledgeProcessing) {
         onConfirm(note, null, null, null, null, true);
       } else {
         onConfirm(note, result, assignee, reminderDate, cost, false);
       }
    };
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className={`rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 ${cardClass}`}>
          {isSendToProcessing && (
            <>
              <h3 className="text-lg font-bold mb-2">Send to Processing</h3>
              <p className="text-sm text-slate-500 mb-6">
                Assign <b>{file.applicantName}</b>'s file to a processing agent
              </p>
            </>
          )}
          
          {isAcknowledgeProcessing && (
            <>
              <h3 className="text-lg font-bold mb-2">Acknowledge Processing</h3>
              <p className="text-sm text-slate-500 mb-6">
                Start processing <b>{file.applicantName}</b>'s file. This will move it to your active tasks.
              </p>
            </>
          )}
          
          {!isSendToProcessing && !isAcknowledgeProcessing && (
            <>
              <h3 className="text-lg font-bold mb-2">Update File Status</h3>
              <p className="text-sm text-slate-500 mb-6">
                Marking <b>{file.applicantName}</b> as <span className="font-semibold">{STATUS[newStatus].label}</span>
              </p>
            </>
          )}
  
          <div className="space-y-4">
             {isDone && (
                <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={() => setResult('APPROVED')}
                     className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${result === 'APPROVED' ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-slate-200 hover:border-green-200 dark:border-slate-700'}`}
                   >
                      <ThumbsUp className="h-6 w-6"/>
                      <span className="font-bold text-sm">Approved</span>
                   </button>
                   <button 
                     onClick={() => setResult('REJECTED')}
                     className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${result === 'REJECTED' ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-slate-200 hover:border-red-200 dark:border-slate-700'}`}
                   >
                      <ThumbsDown className="h-6 w-6"/>
                      <span className="font-bold text-sm">Rejected</span>
                   </button>
                </div>
             )}

             {/* Send to Processing - Show only Processing Agents dropdown */}
             {isSendToProcessing && (
                <div>
                   <label className="block text-sm font-medium mb-2 opacity-80">Assign to Processing Agent</label>
                   <div className="relative">
                      <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <select
                         className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
                         value={assignee}
                         onChange={(e) => setAssignee(e.target.value)}
                      >
                         <option value="">Select Agent</option>
                         {allUsers.filter(u => u.role === ROLES.PROCESSING).map(u => (
                            <option key={u.id} value={u.fullName || u.username}>
                               {u.fullName} ({u.role})
                            </option>
                         ))}
                      </select>
                   </div>
                </div>
             )}

             {/* Cost Input (Only for Submission & Admin/Processor) */}
             {isSubmitted && isAdminOrProcessor && (
                 <div>
                    <label className="block text-sm font-medium mb-2 opacity-80">Finalize File Cost (Optional)</label>
                    <div className="relative">
                       <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                       <input
                          type="number"
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
                          placeholder="Enter actual cost incurred..."
                          value={cost}
                          onChange={(e) => setCost(e.target.value)}
                       />
                    </div>
                 </div>
             )}

             {/* Assign To Dropdown - Only for non-special actions */}
             {!isSendToProcessing && !isAcknowledgeProcessing && (
                <div>
                   <label className="block text-sm font-medium mb-2 opacity-80">Assign To (Optional)</label>
                   <div className="relative">
                      <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <select
                         className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
                         value={assignee}
                         onChange={(e) => setAssignee(e.target.value)}
                      >
                         <option value="">Keep current / Default</option>
                         {allUsers.map(u => (
                            <option key={u.id} value={u.fullName || u.username}>
                               {u.fullName} ({u.role})
                            </option>
                         ))}
                      </select>
                   </div>
                </div>
             )}

             {/* Reminder Date Option - Only for non-special actions */}
             {!isSendToProcessing && !isAcknowledgeProcessing && (
                <div>
                   <label className="block text-sm font-medium mb-2 opacity-80">Set Reminder (Optional)</label>
                   <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                         type="date"
                         className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
                         value={reminderDate}
                         onChange={(e) => setReminderDate(e.target.value)}
                      />
                   </div>
                </div>
             )}
  
             <div>
               <label className="block text-sm font-medium mb-2 opacity-80">Add Note (Optional)</label>
               <textarea
                 className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[100px] ${inputClass}`}
                 placeholder="Any important details about this action..."
                 value={note}
                 onChange={(e) => setNote(e.target.value)}
               />
             </div>
  
             <div className="flex justify-end gap-3 pt-2">
               <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
               <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                 {isSendToProcessing ? 'Send to Processing' : isAcknowledgeProcessing ? 'Start Processing' : 'Confirm Update'}
               </button>
             </div>
          </div>
        </div>
      </div>
    );
}

// Air Ticket - BOOKED Status Modal
function AirTicketBookedModal({ isOpen, onClose, onConfirm, file, darkMode, portals }) {
  const [pnr, setPnr] = useState(file?.pnr || '');
  const [portal, setPortal] = useState(file?.portal || '');
  const [bookingDate, setBookingDate] = useState(file?.bookingValidity?.date || '');
  const [bookingTime, setBookingTime] = useState(file?.bookingValidity?.time || '');

  if (!isOpen) return null;

  const cardClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  const handleSubmit = () => {
    if (!pnr || !portal || !bookingDate || !bookingTime) {
      alert("Please fill in all fields");
      return;
    }
    onConfirm({ pnr, portal, bookingValidity: { date: bookingDate, time: bookingTime } });
    setPnr('');
    setPortal('');
    setBookingDate('');
    setBookingTime('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 ${cardClass}`}>
        <h3 className="text-lg font-bold mb-2">Flight Ticket Booked</h3>
        <p className="text-sm text-slate-500 mb-6">Enter booking details for <b>{file?.applicantName}</b></p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">PNR / Booking Reference</label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="e.g., ABC123"
              value={pnr}
              onChange={(e) => setPnr(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Portal</label>
            <select
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              value={portal}
              onChange={(e) => setPortal(e.target.value)}
            >
              <option value="">Select Portal</option>
              {portals.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Booking Validity Date</label>
            <input
              type="date"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Booking Validity Time</label>
            <input
              type="time"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Save Booking</button>
        </div>
      </div>
    </div>
  );
}

// Air Ticket - ISSUED Status Modal
function AirTicketIssuedModal({ isOpen, onClose, onConfirm, file, darkMode, portals }) {
  const [pnr, setPnr] = useState(file?.pnr || '');
  const [portal, setPortal] = useState(file?.portal || '');
  const [bookingDate, setBookingDate] = useState(file?.bookingValidity?.date || '');
  const [bookingTime, setBookingTime] = useState(file?.bookingValidity?.time || '');

  if (!isOpen) return null;

  const cardClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  const handleSubmit = () => {
    if (!pnr || !portal || !bookingDate || !bookingTime) {
      alert("Please fill in all fields");
      return;
    }
    onConfirm({ pnr, portal, bookingValidity: { date: bookingDate, time: bookingTime } });
    setPnr('');
    setPortal('');
    setBookingDate('');
    setBookingTime('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 ${cardClass}`}>
        <h3 className="text-lg font-bold mb-2">Flight Ticket Issued</h3>
        <p className="text-sm text-slate-500 mb-6">Update ticket details for <b>{file?.applicantName}</b></p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">PNR / Booking Reference</label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="e.g., ABC123"
              value={pnr}
              onChange={(e) => setPnr(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Portal</label>
            <select
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              value={portal}
              onChange={(e) => setPortal(e.target.value)}
            >
              <option value="">Select Portal</option>
              {portals.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Booking Validity Date</label>
            <input
              type="date"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Booking Validity Time</label>
            <input
              type="time"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Update Ticket</button>
        </div>
      </div>
    </div>
  );
}

// Package - FLIGHT_ISSUED Status Modal
function PackageFlightIssuedModal({ isOpen, onClose, onConfirm, file, darkMode, portals }) {
  const [pnr, setPnr] = useState(file?.flightPnr || '');
  const [portal, setPortal] = useState(file?.flightPortal || '');

  if (!isOpen) return null;

  const cardClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  const handleSubmit = () => {
    if (!pnr || !portal) {
      alert("Please fill in all fields");
      return;
    }
    onConfirm({ flightPnr: pnr, flightPortal: portal });
    setPnr('');
    setPortal('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 ${cardClass}`}>
        <h3 className="text-lg font-bold mb-2">Flight Issued</h3>
        <p className="text-sm text-slate-500 mb-6">Enter flight details for <b>{file?.applicantName}</b></p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">PNR / Booking Reference</label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="e.g., ABC123"
              value={pnr}
              onChange={(e) => setPnr(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Portal</label>
            <select
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              value={portal}
              onChange={(e) => setPortal(e.target.value)}
            >
              <option value="">Select Portal</option>
              {portals.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Save Flight Details</button>
        </div>
      </div>
    </div>
  );
}

// Package - HOTELS_BOOKED Status Modal
function PackageHotelsBookedModal({ isOpen, onClose, onConfirm, file, darkMode }) {
  const [hotelName, setHotelName] = useState(file?.hotelName || '');
  const [fromDate, setFromDate] = useState(file?.hotelFromDate || '');
  const [toDate, setToDate] = useState(file?.hotelToDate || '');

  if (!isOpen) return null;

  const cardClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  const handleSubmit = () => {
    if (!hotelName || !fromDate || !toDate) {
      alert("Please fill in all fields");
      return;
    }
    onConfirm({ hotelName, hotelFromDate: fromDate, hotelToDate: toDate });
    setHotelName('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 ${cardClass}`}>
        <h3 className="text-lg font-bold mb-2">Hotels Booked</h3>
        <p className="text-sm text-slate-500 mb-6">Enter hotel details for <b>{file?.applicantName}</b></p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Hotel Name</label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="Hotel name..."
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">From Date</label>
            <input
              type="date"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">To Date</label>
            <input
              type="date"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Save Hotel Details</button>
        </div>
      </div>
    </div>
  );
}

// Package - PICKUP_DROPOFF Status Modal
function PackagePickupDropoffModal({ isOpen, onClose, onConfirm, file, darkMode }) {
  const [numTrips, setNumTrips] = useState(1);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [routes, setRoutes] = useState(file?.routes || []);

  if (!isOpen) return null;

  const cardClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  const handleSetNumTrips = () => {
    if (numTrips <= 0) {
      alert("Please enter a valid number of trips");
      return;
    }
    setRoutes(Array(numTrips).fill(null).map((_, i) => routes[i] || { from: '', to: '', vendor: '' }));
    setShowRouteForm(true);
  };

  const updateRoute = (index, field, value) => {
    const newRoutes = [...routes];
    newRoutes[index] = { ...newRoutes[index], [field]: value };
    setRoutes(newRoutes);
  };

  const handleSubmit = () => {
    if (routes.some(r => !r.from || !r.to || !r.vendor)) {
      alert("Please fill in all route details");
      return;
    }
    onConfirm({ routes });
    setRoutes([]);
    setNumTrips(1);
    setShowRouteForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto ${cardClass}`}>
        <h3 className="text-lg font-bold mb-2">Pick & Drop Details</h3>
        <p className="text-sm text-slate-500 mb-6">Enter pickup & dropoff information for <b>{file?.applicantName}</b></p>
        
        {!showRouteForm ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 opacity-80">Number of Trips</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
                  placeholder="e.g., 2"
                  value={numTrips}
                  onChange={(e) => setNumTrips(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleSetNumTrips} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Continue</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {routes.map((route, index) => (
              <div key={index} className={`p-4 rounded-lg border ${darkMode ? 'border-slate-700 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
                <h4 className="font-semibold text-sm mb-3">Trip {index + 1}</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
                    placeholder="From (e.g., Bangkok)"
                    value={route.from}
                    onChange={(e) => updateRoute(index, 'from', e.target.value)}
                  />
                  <input
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
                    placeholder="To (e.g., Pattaya)"
                    value={route.to}
                    onChange={(e) => updateRoute(index, 'to', e.target.value)}
                  />
                  <input
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
                    placeholder="Vendor Name"
                    value={route.vendor}
                    onChange={(e) => updateRoute(index, 'vendor', e.target.value)}
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setShowRouteForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Back</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Save Routes</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteModal({ isOpen, onClose, onConfirm, file, darkMode }) {
    const [note, setNote] = useState('');
    
    if (!isOpen) return null;

    const cardClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
    const inputClass = darkMode 
      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
      : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 ${cardClass}`}>
                <h3 className="text-lg font-bold mb-4">Add Note to {file.applicantName}</h3>
                <textarea
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[150px] ${inputClass}`}
                    placeholder="Write your note here..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    autoFocus
                />
                <div className="flex justify-end gap-3 pt-4">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
                    <button onClick={() => onConfirm(note)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Add Note</button>
                </div>
            </div>
        </div>
    );
}

function EditFileModal({ isOpen, onClose, onConfirm, file, destinations, darkMode, allUsers, currentUser }) {
    const [editData, setEditData] = useState({});
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (isOpen && file && !initialized) {
            // Only initialize once when modal opens
            if (file.fileType === FILE_TYPES.VISA) {
                setEditData({
                    applicantName: file.applicantName || '',
                    passportNo: file.passportNo || '',
                    contactNo: file.contactNo || '',
                    destination: file.destination || '',
                    serviceCharge: file.serviceCharge || '',
                    cost: file.cost || '',
                    reminderDate: file.reminderDate || '',
                    createdBy: file.createdBy || ''
                });
            } else if (file.fileType === FILE_TYPES.AIR_TICKET) {
                setEditData({
                    applicantName: file.applicantName || '',
                    contactNo: file.contactNo || '',
                    airlineRoute: file.airlineRoute || '',
                    airlineSalePrice: file.airlineSalePrice || '',
                    airlineCostPrice: file.airlineCostPrice || '',
                    pnr: file.pnr || '',
                    portal: file.portal || '',
                    createdBy: file.createdBy || ''
                });
            } else if (file.fileType === FILE_TYPES.PACKAGE) {
                setEditData({
                    applicantName: file.applicantName || '',
                    contactNo: file.contactNo || '',
                    numberOfPersons: file.numberOfPersons || '',
                    mainPersonPassport: file.mainPersonPassport || '',
                    packageCountries: file.packageCountries || [],
                    packageNights: file.packageNights || {},
                    includesFlight: file.includesFlight || false,
                    includesPickDrop: file.includesPickDrop || false,
                    packageSalePrice: file.packageSalePrice || '',
                    packageCostPrice: file.packageCostPrice || '',
                    createdBy: file.createdBy || ''
                });
            }
            setInitialized(true);
        } else if (!isOpen) {
            // Reset when modal closes
            setInitialized(false);
        }
    }, [isOpen, file?.id]);

    const handleCountryToggle = (country) => {
        const updated = editData.packageCountries.includes(country)
          ? editData.packageCountries.filter(c => c !== country)
          : [...editData.packageCountries, country];
        setEditData({...editData, packageCountries: updated});
    };

    const handleNightsChange = (country, nights) => {
        setEditData({
            ...editData, 
            packageNights: {
                ...editData.packageNights,
                [country]: nights
            }
        });
    };

    if (!isOpen) return null;

    const cardClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
    const inputClass = darkMode 
      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
      : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

    const renderVISAFields = () => (
        <>
            <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Applicant Name</label>
                <input className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} value={editData.applicantName} onChange={e => setEditData({...editData, applicantName: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-80">Passport No</label>
                    <input className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} value={editData.passportNo} onChange={e => setEditData({...editData, passportNo: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-80">Contact No</label>
                    <input className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} value={editData.contactNo} onChange={e => setEditData({...editData, contactNo: e.target.value})} />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Destination</label>
                <select className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} value={editData.destination} onChange={e => setEditData({...editData, destination: e.target.value})}>
                    <option value="">Select destination</option>
                    {destinations.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-80">Service Charge (৳)</label>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} 
                      value={editData.serviceCharge} 
                      onChange={e => setEditData({...editData, serviceCharge: e.target.value})} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-80">Cost (৳)</label>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} 
                      value={editData.cost} 
                      onChange={e => setEditData({...editData, cost: e.target.value})} 
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Reminder Date</label>
                <input type="date" className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} value={editData.reminderDate || ''} onChange={e => setEditData({...editData, reminderDate: e.target.value})} />
            </div>
        </>
    );

    const renderAIR_TICKETFields = () => (
        <>
            <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Applicant Name</label>
                <input className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} value={editData.applicantName} onChange={e => setEditData({...editData, applicantName: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Contact No</label>
                <input className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} value={editData.contactNo} onChange={e => setEditData({...editData, contactNo: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Airline Route</label>
                <input className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} placeholder="e.g., DHK-NYC-DHK" value={editData.airlineRoute} onChange={e => setEditData({...editData, airlineRoute: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-80">Sale Price (৳)</label>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} 
                      value={editData.airlineSalePrice} 
                      onChange={e => setEditData({...editData, airlineSalePrice: e.target.value})} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-80">Cost Price (৳)</label>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} 
                      value={editData.airlineCostPrice} 
                      onChange={e => setEditData({...editData, airlineCostPrice: e.target.value})} 
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 opacity-80">PNR</label>
                <input className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} value={editData.pnr} onChange={e => setEditData({...editData, pnr: e.target.value})} />
            </div>
        </>
    );

    const renderPACKAGEFields = () => (
        <>
            <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Applicant Name</label>
                <input className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} value={editData.applicantName} onChange={e => setEditData({...editData, applicantName: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Contact No</label>
                <input className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} value={editData.contactNo} onChange={e => setEditData({...editData, contactNo: e.target.value})} />
            </div>
            <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium mb-2 opacity-80">Destinations</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border rounded-lg bg-opacity-50">
                    {destinations.map(country => (
                        <label key={country} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                            <input
                                type="checkbox"
                                checked={editData.packageCountries?.includes(country) || false}
                                onChange={() => handleCountryToggle(country)}
                                className="h-4 w-4"
                            />
                            <span className="text-sm">{country}</span>
                        </label>
                    ))}
                </div>
            </div>

            {editData.packageCountries?.map(country => (
                <div key={country}>
                    <label className="block text-sm font-medium mb-1 opacity-80">{country} - Nights</label>
                    <input
                        type="number"
                        min="1"
                        className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`}
                        value={editData.packageNights?.[country] || ''}
                        onChange={e => handleNightsChange(country, e.target.value)}
                    />
                </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-80">Number of Persons</label>
                    <input 
                      type="number"
                      min="1"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} 
                      value={editData.numberOfPersons} 
                      onChange={e => setEditData({...editData, numberOfPersons: e.target.value})} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-80">Main Person Passport</label>
                    <input className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} value={editData.mainPersonPassport} onChange={e => setEditData({...editData, mainPersonPassport: e.target.value})} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-80">Sale Price (৳)</label>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} 
                      value={editData.packageSalePrice} 
                      onChange={e => setEditData({...editData, packageSalePrice: e.target.value})} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-80">Cost Price (৳)</label>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} 
                      value={editData.packageCostPrice} 
                      onChange={e => setEditData({...editData, packageCostPrice: e.target.value})} 
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={editData.includesFlight}
                      onChange={e => setEditData({...editData, includesFlight: e.target.checked})}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium">Includes Flight</span>
                </label>
                <label className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={editData.includesPickDrop}
                      onChange={e => setEditData({...editData, includesPickDrop: e.target.checked})}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium">Includes Pick & Drop</span>
                </label>
            </div>
        </>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto ${cardClass}`}>
                <h3 className="text-lg font-bold mb-6">Edit File Details ({file?.fileType || 'File'})</h3>
                <div className="space-y-4">
                    {/* Sales Rep - Admin Only */}
                    {currentUser?.role === ROLES.ADMIN && (
                        <div>
                            <label className="block text-sm font-medium mb-1 opacity-80">Sales Rep</label>
                            <select 
                                className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} 
                                value={editData.createdBy} 
                                onChange={e => setEditData({...editData, createdBy: e.target.value})}
                            >
                                <option value="">Select Sales Rep</option>
                                {allUsers && allUsers.map(u => (
                                    <option key={u.id} value={u.fullName}>{u.fullName} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    {file?.fileType === FILE_TYPES.VISA && renderVISAFields()}
                    {file?.fileType === FILE_TYPES.AIR_TICKET && renderAIR_TICKETFields()}
                    {file?.fileType === FILE_TYPES.PACKAGE && renderPACKAGEFields()}
                </div>
                <div className="flex justify-end gap-3 pt-6">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
                    <button onClick={() => onConfirm(editData)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Save Changes</button>
                </div>
            </div>
        </div>
    );
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, darkMode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className={`rounded-xl shadow-xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
            <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                    <Trash2 className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold">Delete File?</h3>
                    <p className="text-sm text-slate-500 mt-1">This action cannot be undone. The file record will be permanently removed.</p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                    <button onClick={onClose} className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Cancel</button>
                    <button onClick={onConfirm} className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors">Delete</button>
                </div>
            </div>
        </div>
    </div>
  );
}

function ResultModal({ isOpen, onClose, message, darkMode }) {
  if (!isOpen) return null;
  
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pointer-events-none">
        <div className={`rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in duration-300 text-center ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
            <p className="text-4xl mb-4 animate-bounce">{message}</p>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>This message will close automatically</p>
        </div>
    </div>
  );
}

function NotificationModal({ isOpen, onClose, tasks, onOpenTask, darkMode }) {
  if (!isOpen) return null;

  const cardClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
  const headerClass = darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100';
  const footerClass = darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100';
  const itemHover = darkMode ? 'hover:bg-slate-800 hover:border-slate-700' : 'hover:bg-slate-50 hover:border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-xl w-full max-w-lg p-0 overflow-hidden animate-in fade-in zoom-in duration-200 ${cardClass}`}>
        <div className={`px-6 py-4 border-b flex justify-between items-center ${headerClass}`}>
           <div>
             <h3 className="text-lg font-bold flex items-center gap-2">
               <Bell className="h-5 w-5 text-blue-600"/>
               Incoming Workload
             </h3>
             <p className="text-xs text-slate-500">Files assigned to you requiring attention</p>
           </div>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5"/></button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {tasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
               <CheckCircle className="h-10 w-10 text-slate-200"/>
               <p>You're all caught up! No pending tasks.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className={`p-3 rounded-xl border border-transparent transition-all group cursor-pointer ${itemHover}`} onClick={() => onOpenTask(task)}>
                   <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold">{task.applicantName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${darkMode && STATUS[task.status].darkColor ? STATUS[task.status].darkColor : STATUS[task.status].color}`}>
                        {STATUS[task.status].label}
                      </span>
                   </div>
                   <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>{task.fileId} • {task.destination}</span>
                      <span>{formatDate(task.updatedAt)}</span>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className={`p-4 border-t flex justify-end ${footerClass}`}>
           <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
             Acknowledge & View Dashboard
           </button>
        </div>
      </div>
    </div>
  );
}

function StatisticalReports({ files, currentUser, darkMode, onOpenInvoiceModal }) {
  const [timeRange, setTimeRange] = useState('today');
  const [userFilter, setUserFilter] = useState(currentUser.name);
  const [allUsers, setAllUsers] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [customReportOpen, setCustomReportOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100' 
    : 'bg-white border-slate-200 text-slate-900';

  useEffect(() => {
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'agency_users');
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(d => ({ name: d.data().fullName, role: d.data().role }));
      setAllUsers(users);
    });

    const attQ = collection(db, 'artifacts', appId, 'public', 'data', 'attendance');
    const unsubscribeAtt = onSnapshot(attQ, (snapshot) => {
       const att = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       setAttendanceData(att);
    });

    return () => {
        unsubscribeUsers();
        unsubscribeAtt();
    };
  }, []);

  const stats = useMemo(() => {
    const start = getStartOf(timeRange, customStartDate ? new Date(customStartDate) : null);
    const end = getEndOf(timeRange, customEndDate ? new Date(customEndDate) : null);
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
      finances: {
        revenue: 0,
        cost: 0,
        profit: 0
      },
      notes: [],
      attendance: []
    };

    files.forEach(file => {
      if (file.assignedTo === userFilter) {
        if (!['DONE', 'RECEIVED_SALES'].includes(file.status)) {
          reportData.processing.inProcess++;
        }
      }

      // Financial & Sales Calculations - ALWAYS include all files regardless of userFilter
      // (Financial overview should show company-wide totals, not filtered by staff member)
      const fileCreationDate = file.createdAt?.toDate ? file.createdAt.toDate() : new Date(file.createdAt?.seconds * 1000 || 0);
      
      // Revenue and Cost are both based on when file was created (within the selected timeframe)
      // Include ALL files that have revenue/cost data (regardless of type or isNewSale flag)
      if (fileCreationDate >= start && fileCreationDate <= end) {
         if (file.fileType === FILE_TYPES.VISA) {
           reportData.finances.revenue += Number(file.serviceCharge || 0);
           reportData.finances.cost += Number(file.cost || 0);
         } else if (file.fileType === FILE_TYPES.AIR_TICKET) {
           reportData.finances.revenue += Number(file.airlineSalePrice || 0);
           reportData.finances.cost += Number(file.airlineCostPrice || 0);
         } else if (file.fileType === FILE_TYPES.PACKAGE) {
           reportData.finances.revenue += Number(file.packageSalePrice || 0);
           reportData.finances.cost += Number(file.packageCostPrice || 0);
         } else {
           // Fallback for backward compatibility
           reportData.finances.revenue += Number(file.serviceCharge || 0);
           reportData.finances.cost += Number(file.cost || 0);
         }
      }

      // New Deals count: based on createdBy field (which sales rep created the file)
      // Count files created within date range by the selected sales rep, if marked as new sale
      if (fileCreationDate >= start && fileCreationDate <= end && file.isNewSale !== false) {
        if (userFilter === 'ALL' || file.createdBy === userFilter) {
          reportData.sales.successfulDeals++;
          // Use appropriate field based on file type: destination for VISA/PACKAGE, airlineRoute for AIR_TICKET
          let dest = 'Unknown';
          if (file.fileType === FILE_TYPES.AIR_TICKET) {
            // Handle both undefined and the string "undefined"
            dest = (file.airlineRoute && file.airlineRoute !== 'undefined' && file.airlineRoute.trim()) ? file.airlineRoute : 'Unknown';
          } else {
            dest = (file.destination && file.destination.trim()) ? file.destination : 'Unknown';
          }
          reportData.sales.destinations[dest] = (reportData.sales.destinations[dest] || 0) + 1;
        }
      }

      file.history.forEach(entry => {
        const entryTime = new Date(entry.timestamp);
        if (entryTime >= start && entryTime <= end && (userFilter === 'ALL' || entry.performedBy === userFilter)) {
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

          // Only count actual customer communications (FOLLOW_UP, DOCS_PENDING)
          // PAYMENT_PENDING is internal embassy payment, not customer communication
          if (['FOLLOW_UP', 'DOCS_PENDING'].includes(entry.status)) {
            reportData.sales.clientComms++;
          }
        }
      });
    });
    
    reportData.finances.profit = reportData.finances.revenue - reportData.finances.cost;

    reportData.attendance = attendanceData.filter(a => {
        if (!a.date) return false;
        const [y, m, d] = a.date.split('-').map(Number);
        const aDate = new Date(y, m - 1, d); 
        
        return (userFilter === 'ALL' || a.userName === userFilter) && aDate >= start && aDate <= end;
    }).sort((a,b) => b.loginTime?.seconds - a.loginTime?.seconds); 

    return reportData;
  }, [files, attendanceData, timeRange, userFilter, customStartDate, customEndDate]);

  const handlePrint = () => {
    window.print();
  };

  const selectedUserRole = allUsers.find(u => u.name === userFilter)?.role || 'SALES'; 
  const showSales = currentUser.role === ROLES.ADMIN || (currentUser.role === ROLES.SALES && selectedUserRole === ROLES.SALES);
  const showProcessing = currentUser.role === ROLES.ADMIN || (currentUser.role === ROLES.PROCESSING && selectedUserRole === ROLES.PROCESSING);

  const isAdmin = currentUser.role === ROLES.ADMIN;
  const isAll = userFilter === 'ALL';
  
  let renderSales = false;
  let renderProcessing = false;

  if (isAdmin) {
     if (isAll) {
        renderSales = true;
        renderProcessing = true;
     } else {
        const role = allUsers.find(u => u.name === userFilter)?.role;
        renderSales = role === ROLES.SALES;
        renderProcessing = role === ROLES.PROCESSING;
     }
  } else {
     renderSales = currentUser.role === ROLES.SALES;
     renderProcessing = currentUser.role === ROLES.PROCESSING;
  }

  return (
    <div className={`rounded-xl border min-h-[800px] ${cardClass}`}>
      <div className={`p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <div>
          <h2 className={`text-2xl font-bold ${textMain}`}>Statistical Reports</h2>
          <p className={textSub}>Productivity Analysis</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
           <select 
             value={userFilter}
             onChange={(e) => setUserFilter(e.target.value)}
             className={`px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`}
           >
             {currentUser.role === ROLES.ADMIN && <option value="ALL">All Staff Overview</option>}
             {allUsers.length > 0 ? allUsers.map(u => <option key={u.name} value={u.name}>{u.name}</option>) : <option>{currentUser.name}</option>}
           </select>

           <div className={`flex p-1 rounded-lg flex-wrap gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
             {['today', 'week', 'month', 'alltime'].map(t => (
               <button
                 key={t}
                 onClick={() => { setTimeRange(t); setCustomStartDate(''); setCustomEndDate(''); }}
                 className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${timeRange === t ? (darkMode ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
               >
                 {t === 'alltime' ? 'All Time' : t}
               </button>
             ))}
             <button
               onClick={() => setTimeRange('custom')}
               className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${timeRange === 'custom' ? (darkMode ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
             >
               Custom
             </button>
           </div>

           {timeRange === 'custom' && (
             <div className="flex gap-2 items-center">
               <input
                 type="date"
                 value={customStartDate}
                 onChange={(e) => setCustomStartDate(e.target.value)}
                 className={`px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`}
                 placeholder="Start Date"
               />
               <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>to</span>
               <input
                 type="date"
                 value={customEndDate}
                 onChange={(e) => setCustomEndDate(e.target.value)}
                 className={`px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`}
                 placeholder="End Date"
               />
             </div>
           )}

           <button 
             onClick={handlePrint}
             className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
           >
             <Printer className="h-4 w-4" /> Export PDF
           </button>

           <button 
             onClick={() => setCustomReportOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
           >
             <FileText className="h-4 w-4" /> Custom Report
           </button>
        </div>
      </div>

      <div className="p-8 print:p-0" id="printable-report">
        <div className="mb-8 hidden print:block">
          <h1 className="text-3xl font-bold mb-2">Performance Summary</h1>
          <div className="text-sm text-slate-500 flex justify-between">
             <span>Employee: <b>{userFilter === 'ALL' ? 'All Staff' : userFilter}</b></span>
             <span>Period: <b>{timeRange.toUpperCase()}</b></span>
             <span>Generated: {new Date().toLocaleString()}</span>
          </div>
          <hr className="my-4"/>
        </div>

        {/* Financial Overview (Admins Only) */}
        {currentUser.role === ROLES.ADMIN && (
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-100'}`}>
                    <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>Total Revenue</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>{formatCurrency(stats.finances.revenue)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100'}`}>
                    <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-red-400' : 'text-red-800'}`}>Total Cost</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-red-200' : 'text-red-900'}`}>{formatCurrency(stats.finances.cost)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                    <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>Net Profit</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>{formatCurrency(stats.finances.profit)}</p>
                </div>
            </div>
        )}

        {/* Working Hours Summary */}
        {stats.attendance.length > 0 && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            {(() => {
              let totalHours = 0, totalShift = 0, totalOvertime = 0, daysWorked = 0;
              const uniqueDays = new Set(); // Track unique days worked
              
              stats.attendance.forEach(att => {
                if (att.logoutTime) {
                  // Extract date from loginTime (YYYY-MM-DD format for unique day tracking)
                  const loginDate = att.loginTime?.toDate ? att.loginTime.toDate() : new Date(att.loginTime?.seconds * 1000);
                  const dateKey = `${loginDate.getFullYear()}-${loginDate.getMonth()}-${loginDate.getDate()}`;
                  uniqueDays.add(dateKey); // Add to set to track unique days
                  
                  const workHours = calculateWorkingHours(att.loginTime, att.logoutTime);
                  totalHours += workHours.hours;
                  totalShift += workHours.shift;
                  totalOvertime += workHours.overtime;
                }
              });
              
              daysWorked = uniqueDays.size; // Count unique days only
              
              return (
                <>
                  <div className={`p-5 rounded-xl border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                    <p className={`text-xs font-semibold uppercase mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>Days Worked</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>{daysWorked}</p>
                  </div>
                  
                  <div className={`p-5 rounded-xl border ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-100'}`}>
                    <p className={`text-xs font-semibold uppercase mb-1 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Total Hours</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-900'}`}>{formatHours(totalHours)}</p>
                  </div>
                  
                  <div className={`p-5 rounded-xl border ${darkMode ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-100'}`}>
                    <p className={`text-xs font-semibold uppercase mb-1 ${darkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>Shift Hours</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-900'}`}>{formatHours(totalShift)}</p>
                  </div>
                  
                  <div className={`p-5 rounded-xl border ${totalOvertime > 0 ? (darkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-100') : (darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200')}`}>
                    <p className={`text-xs font-semibold uppercase mb-1 ${totalOvertime > 0 ? (darkMode ? 'text-orange-400' : 'text-orange-700') : 'text-slate-500'}`}>Overtime</p>
                    <p className={`text-2xl font-bold ${totalOvertime > 0 ? (darkMode ? 'text-orange-300' : 'text-orange-900') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>{formatHours(totalOvertime)}</p>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        <div className={`mb-8 p-6 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                <Timer className="h-5 w-5 text-blue-500"/> Attendance Log
            </h3>
            {stats.attendance.length === 0 ? (
                <p className={`text-sm ${textSub}`}>No attendance records found for this period.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className={`text-xs uppercase ${darkMode ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-100'}`}>
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Date</th>
                                {userFilter === 'ALL' && <th className="px-4 py-3">Employee</th>}
                                <th className="px-4 py-3">Login Time</th>
                                <th className="px-4 py-3">Logout Time</th>
                                <th className="px-4 py-3">Total Hours</th>
                                <th className="px-4 py-3">Shift (8h)</th>
                                <th className="px-4 py-3">Overtime</th>
                                <th className="px-4 py-3 rounded-r-lg">Status</th>
                            </tr>
                        </thead>
                        <tbody className={textMain}>
                            {stats.attendance.map((att) => {
                              const workHours = calculateWorkingHours(att.loginTime, att.logoutTime);
                              return (
                                <tr key={att.id} className={`border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                    <td className="px-4 py-3 font-medium">{att.date}</td>
                                    {userFilter === 'ALL' && <td className="px-4 py-3 font-medium">{att.userName}</td>}
                                    <td className="px-4 py-3 text-green-600 font-mono">{formatTimeOnly(att.loginTime)}</td>
                                    <td className="px-4 py-3 text-red-500 font-mono">{att.logoutTime ? formatTimeOnly(att.logoutTime) : '-'}</td>
                                    <td className="px-4 py-3 font-mono font-medium">{formatHours(workHours.hours)}</td>
                                    <td className={`px-4 py-3 font-mono font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>{formatHours(workHours.shift)}</td>
                                    <td className={`px-4 py-3 font-mono font-medium ${workHours.overtime > 0 ? (darkMode ? 'text-orange-400' : 'text-orange-700') : 'text-slate-400'}`}>{formatHours(workHours.overtime)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${att.logoutTime ? (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600') : 'bg-green-100 text-green-700'}`}>
                                            {att.logoutTime ? 'Completed' : 'Active'}
                                        </span>
                                    </td>
                                </tr>
                              );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          
          {renderSales && (
            <div className={`col-span-2 md:col-span-1 border rounded-xl p-6 ${darkMode ? 'bg-blue-900/10 border-blue-900/30' : 'bg-blue-50/50 border-blue-100'}`}>
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-blue-200' : 'text-slate-800'}`}><Briefcase className="h-5 w-5 text-blue-600"/> Sales Performance</h3>
                <div className="space-y-4">
                    <div className={`flex justify-between items-center p-3 rounded-lg shadow-sm ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <span className={textSub}>New Deals / Files Registered</span>
                    <span className={`text-xl font-bold ${textMain}`}>{stats.sales.successfulDeals}</span>
                    </div>
                    <div className={`flex justify-between items-center p-3 rounded-lg shadow-sm ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <span className={textSub}>Client Interactions (Follow-ups)</span>
                    <span className={`text-xl font-bold ${textMain}`}>{stats.sales.clientComms}</span>
                    </div>
                    <div className={`p-3 rounded-lg shadow-sm ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Deals by Destination</span>
                    <div className="mt-2 space-y-1">
                        {Object.entries(stats.sales.destinations).length > 0 ? (
                        Object.entries(stats.sales.destinations).map(([dest, count]) => (
                            <div key={dest} className={`flex justify-between text-sm ${textMain}`}>
                            <span>{dest}</span>
                            <span className="font-medium">{count}</span>
                            </div>
                        ))
                        ) : <div className="text-sm text-slate-400">No deals yet</div>}
                    </div>
                    </div>
                </div>
            </div>
          )}

          {renderProcessing && (
            <div className={`col-span-2 md:col-span-1 border rounded-xl p-6 ${darkMode ? 'bg-purple-900/10 border-purple-900/30' : 'bg-purple-50/50 border-purple-100'}`}>
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-purple-200' : 'text-slate-800'}`}><Activity className="h-5 w-5 text-purple-600"/> Processing Metrics</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={`p-3 rounded-lg shadow-sm ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className={`text-2xl font-bold ${textMain}`}>{stats.processing.inProcess}</div>
                    <div className="text-xs text-slate-500">Currently in Process</div>
                    </div>
                    <div className={`p-3 rounded-lg shadow-sm ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className={`text-2xl font-bold ${textMain}`}>{stats.processing.submittedToday}</div>
                    <div className="text-xs text-slate-500">Submitted Today</div>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className={`flex justify-between text-sm py-1 border-b ${darkMode ? 'border-purple-900/30 text-slate-300' : 'border-purple-100 text-slate-600'}`}>
                    <span>Docs Pending Marked</span>
                    <span className="font-medium">{stats.processing.docsPendingToday}</span>
                    </div>
                    <div className={`flex justify-between text-sm py-1 border-b ${darkMode ? 'border-purple-900/30 text-slate-300' : 'border-purple-100 text-slate-600'}`}>
                    <span>Files Completed</span>
                    <span className="font-medium">{stats.processing.completedToday}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <span className={`flex-1 text-center py-1 rounded text-xs font-bold ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>{stats.processing.approvals} Approved</span>
                        <span className={`flex-1 text-center py-1 rounded text-xs font-bold ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'}`}>{stats.processing.rejections} Rejected</span>
                    </div>
                </div>
            </div>
          )}
        </div>

        <div>
           <h3 className={`text-lg font-bold mb-4 ${textMain}`}>Activity Notes Log</h3>
           {stats.notes.length === 0 ? (
             <div className={`text-center py-8 rounded-lg text-sm ${darkMode ? 'bg-slate-900 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>No notes recorded in this period.</div>
           ) : (
             <div className="space-y-3">
               {stats.notes.map((n, idx) => (
                 <div key={idx} className={`p-3 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between mb-1">
                      <span className={`font-semibold ${textMain}`}>{n.file}</span>
                      <span className="text-slate-400 text-xs">{formatDate({seconds: n.time/1000})}</span>
                    </div>
                    <p className={textSub}>{n.note}</p>
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
            background: white;
            color: black;
          }
          nav, button, select {
            display: none !important;
          }
        }
      `}</style>

      {customReportOpen && (
        <CustomReportModal
          isOpen={customReportOpen}
          onClose={() => setCustomReportOpen(false)}
          files={files}
          userFilter={userFilter}
          timeRange={timeRange}
          darkMode={darkMode}
          stats={stats}
          attendanceData={attendanceData}
          currentUser={currentUser}
          allUsers={allUsers}
        />
      )}
    </div>
  );
}

function CustomReportModal({ isOpen, onClose, files, userFilter, timeRange, darkMode, stats, attendanceData, currentUser, allUsers }) {
  const [reportType, setReportType] = useState('all');

  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputClass = darkMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300';
  const isAdmin = currentUser.role === ROLES.ADMIN;

  const generateReport = () => {
    const doc = new jsPDF();
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // Helper function to add section
    const addSection = (title) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin, yPosition);
      yPosition += 8;
      doc.setDrawColor(100, 150, 255);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;
    };

    // Helper function to add text
    const addText = (label, value, isBold = false) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(11);
      doc.setFont(undefined, isBold ? 'bold' : 'normal');
      doc.text(`${label}: ${value}`, margin, yPosition);
      yPosition += 6;
    };

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('VISA TRACK - REPORT', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Period: ${timeRange.toUpperCase()} | Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 8;

    // Financial Summary (Admin Only)
    if (isAdmin && (reportType === 'all' || reportType === 'financial')) {
      addSection('💰 FINANCIAL SUMMARY');
      addText('Total Revenue', `Tk ${stats.finances.revenue.toFixed(2)}`, true);
      addText('Total Cost', `Tk ${stats.finances.cost.toFixed(2)}`, true);
      addText('Net Profit', `Tk ${stats.finances.profit.toFixed(2)}`, true);
      yPosition += 4;
    }

    // Sales Report
    if (reportType === 'all' || reportType === 'sales') {
      addSection('📈 SALES REPORT');
      addText('Successful Deals', stats.sales.successfulDeals.toString());
      addText('Client Communications', stats.sales.clientComms.toString());
      addText('Total Sales Actions', stats.sales.totalActions.toString());
      
      if (Object.keys(stats.sales.destinations).length > 0) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Destinations Breakdown:', margin, yPosition);
        yPosition += 5;
        
        Object.entries(stats.sales.destinations).forEach(([dest, count]) => {
          doc.setFont(undefined, 'normal');
          doc.text(`  • ${dest}: ${count}`, margin + 5, yPosition);
          yPosition += 5;
        });
      }
      yPosition += 2;
    }

    // Processing Report
    if (reportType === 'all' || reportType === 'processing') {
      addSection('⚙️ PROCESSING REPORT');
      addText('In Process', stats.processing.inProcess.toString());
      addText('Submitted', stats.processing.submittedToday.toString());
      addText('Docs Pending', stats.processing.docsPendingToday.toString());
      addText('Completed', stats.processing.completedToday.toString());
      addText('Approvals', stats.processing.approvals.toString());
      addText('Rejections', stats.processing.rejections.toString());
      addText('Total Processing Actions', stats.processing.totalActions.toString());
      yPosition += 2;
    }

    // Attendance Log
    if (reportType === 'all' || reportType === 'attendance') {
      addSection('📅 ATTENDANCE LOG');
      
      if (stats.attendance.length === 0) {
        doc.setFont(undefined, 'normal');
        doc.text('No attendance records found.', margin, yPosition);
        yPosition += 6;
      } else {
        stats.attendance.slice(0, 20).forEach(att => {
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
          doc.text(`Date: ${att.date}`, margin, yPosition);
          yPosition += 4;
          if (userFilter === 'ALL') {
            doc.text(`Employee: ${att.userName}`, margin + 5, yPosition);
            yPosition += 4;
          }
          const loginTime = att.loginTime ? new Date(att.loginTime?.seconds * 1000).toLocaleTimeString() : 'N/A';
          const logoutTime = att.logoutTime ? new Date(att.logoutTime?.seconds * 1000).toLocaleTimeString() : 'N/A';
          doc.text(`Login: ${loginTime}`, margin + 5, yPosition);
          yPosition += 4;
          doc.text(`Logout: ${logoutTime}`, margin + 5, yPosition);
          yPosition += 4;
          doc.text(`Status: ${att.logoutTime ? 'Completed' : 'Active'}`, margin + 5, yPosition);
          yPosition += 5;
        });
      }
    }

    // Notes Log (if available)
    if ((reportType === 'all' || reportType === 'notes') && stats.notes.length > 0) {
      addSection('📝 NOTES LOG');
      
      stats.notes.slice(0, 15).forEach(note => {
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`File: ${note.file}`, margin, yPosition);
        yPosition += 4;
        doc.text(`Note: ${note.note}`, margin + 5, yPosition, { maxWidth: contentWidth - 10 });
        yPosition += 6;
        doc.text(`Time: ${new Date(note.time).toLocaleString()}`, margin + 5, yPosition);
        yPosition += 6;
      });
    }

    // Download PDF
    doc.save(`visa-track-${reportType}-report-${Date.now()}.pdf`);
    onClose();
  };

  if (!isOpen) return null;

  let reportOptions = [
    { value: 'all', label: 'Complete Report', icon: '📋' },
    { value: 'sales', label: 'Sales Report', icon: '📈' },
    { value: 'processing', label: 'Processing Report', icon: '⚙️' },
    { value: 'attendance', label: 'Attendance Logs', icon: '📅' },
    ...(stats.notes.length > 0 ? [{ value: 'notes', label: 'Notes Log', icon: '📝' }] : [])
  ];

  // Add financial report only for admins
  if (isAdmin) {
    reportOptions = [
      { value: 'all', label: 'Complete Report', icon: '📋' },
      { value: 'financial', label: 'Financial Summary', icon: '💰' },
      { value: 'sales', label: 'Sales Report', icon: '📈' },
      { value: 'processing', label: 'Processing Report', icon: '⚙️' },
      { value: 'attendance', label: 'Attendance Logs', icon: '📅' },
      ...(stats.notes.length > 0 ? [{ value: 'notes', label: 'Notes Log', icon: '📝' }] : [])
    ];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 ${cardClass}`}>
        <h3 className="text-lg font-bold mb-2">Download Report (PDF)</h3>
        <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Select report type for {userFilter === 'ALL' ? 'all staff' : userFilter} ({timeRange.toUpperCase()})
        </p>
        
        <div className="space-y-2 mb-6 max-h-72 overflow-y-auto">
          {reportOptions.map(option => (
            <label key={option.value} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors ${reportType === option.value ? (darkMode ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-600') : (darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50')}`}>
              <input
                type="radio"
                name="reportType"
                value={option.value}
                checked={reportType === option.value}
                onChange={(e) => setReportType(e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-lg">{option.icon}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={generateReport} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Download PDF</button>
        </div>
      </div>
    </div>
  );
}

function PublicTrackingPage({ fileId, files, loading, darkMode, toggleDarkMode }) {
  const [foundFile, setFoundFile] = useState(null);
  const [searchId, setSearchId] = useState(fileId || '');
  const [searched, setSearched] = useState(!!fileId);

  useEffect(() => {
    if (fileId) {
      const file = files.find(f => f.fileId?.toLowerCase() === fileId.toLowerCase());
      setFoundFile(file || null);
    }
  }, [fileId, files]);

  const handleSearch = (e) => {
    e.preventDefault();
    const file = files.find(f => f.fileId?.toLowerCase() === searchId.toLowerCase());
    setFoundFile(file || null);
    setSearched(true);
  };

  const getStatusMessage = (status) => {
    const messages = {
      RECEIVED_SALES: 'Your application has been received and registered.',
      HANDOVER_PROCESSING: 'Your file is now being processed by our team.',
      DOCS_PENDING: 'We are waiting for additional documents from you.',
      PAYMENT_PENDING: 'Payment is pending for this application.',
      SUBMITTED: 'Your documents have been submitted to the embassy. Please wait for their response.',
      FOLLOW_UP: 'We are following up on your application.',
      DONE: 'Your application has been completed!'
    };
    return messages[status] || 'Status unknown';
  };

  const containerClass = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputClass = darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${containerClass} p-4 sm:p-6`}>
      {/* Header */}
      <div className={`max-w-2xl mx-auto mb-8 p-6 rounded-xl border ${cardClass}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-lg shadow-lg shadow-blue-500/20">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>VisaTrack</h1>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>File Tracking System</p>
            </div>
          </div>
          <button 
            onClick={toggleDarkMode}
            className={`p-2 rounded-full transition-colors ${darkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Enter Your VT ID Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                placeholder="e.g., VT-12345"
                className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
              />
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Track
              </button>
            </div>
            <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Your VT ID was provided when your file was registered.
            </p>
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="max-w-2xl mx-auto">
        {searched && !foundFile ? (
          <div className={`p-6 rounded-xl border text-center ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
            <h2 className="text-lg font-bold mb-2">File Not Found</h2>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
              No file found with ID: <span className="font-mono font-bold">{searchId}</span>
            </p>
            <p className={`text-sm mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              Please check your VT ID and try again.
            </p>
          </div>
        ) : foundFile ? (
          <div className={`p-6 rounded-xl border space-y-6 ${cardClass}`}>
            {/* File Info */}
            <div>
              <h2 className="text-xl font-bold mb-4">Application Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>VT ID</p>
                  <p className="text-lg font-mono font-bold text-blue-600">{foundFile.fileId}</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Applicant Name</p>
                  <p className="text-lg font-semibold">{foundFile.applicantName}</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Destination</p>
                  <p className="text-lg font-semibold">{foundFile.destination}</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Contact</p>
                  <p className="text-lg font-semibold">{foundFile.contactNo}</p>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <h3 className="font-semibold mb-3">Current Status</h3>
              <div className="flex items-center gap-3 mb-3">
                {STATUS[foundFile.status]?.icon && React.createElement(STATUS[foundFile.status].icon, {
                  className: `h-8 w-8 ${STATUS[foundFile.status].color?.split(' ')[1] || 'text-slate-600'}`
                })}
                <span className={`px-3 py-1 rounded-full font-medium ${darkMode && STATUS[foundFile.status].darkColor ? STATUS[foundFile.status].darkColor : STATUS[foundFile.status].color}`}>
                  {STATUS[foundFile.status]?.label}
                </span>
              </div>
              <p className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                {getStatusMessage(foundFile.status)}
              </p>
            </div>

            {/* Visa Result if applicable */}
            {foundFile.visaResult && (
              <div className={`p-4 rounded-lg ${foundFile.visaResult === 'APPROVED' ? (darkMode ? 'bg-green-900/30 border border-green-800' : 'bg-green-50 border border-green-200') : (darkMode ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200')}`}>
                <div className="flex items-center gap-3 mb-2">
                  {foundFile.visaResult === 'APPROVED' ? (
                    <>
                      <ThumbsUp className="h-6 w-6 text-green-600" />
                      <span className="font-bold text-green-700 dark:text-green-400">Visa Approved! 🎉</span>
                    </>
                  ) : (
                    <>
                      <ThumbsDown className="h-6 w-6 text-red-600" />
                      <span className="font-bold text-red-700 dark:text-red-400">Visa Rejected</span>
                    </>
                  )}
                </div>
                <p className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                  {foundFile.visaResult === 'APPROVED' ? 'Congratulations! Your visa has been approved.' : 'Unfortunately, your visa application was not approved. Please contact us for more information.'}
                </p>
              </div>
            )}

            {/* Registered Date */}
            <div className={`text-center py-4 border-t ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
              <p className="text-sm">
                File registered on {formatDate(foundFile.createdAt)}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <footer className={`max-w-2xl mx-auto mt-12 py-6 text-center text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        <p>For further assistance, please contact our support team.</p>
        <p className="mt-2">© MD Rokibul Islam . All rights reserved.</p>
      </footer>
    </div>
  );
}

function LoginScreen({ onLogin, darkMode, toggleDarkMode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Admin Setup State
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');

  const cardClass = darkMode ? 'bg-slate-900 text-slate-100 shadow-xl border border-slate-800' : 'bg-white text-slate-900 shadow-xl';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  useEffect(() => {
    const checkUsers = async () => {
      const q = collection(db, 'artifacts', appId, 'public', 'data', 'agency_users');
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

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
        Checking configuration...
    </div>
  );

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${darkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
      <div className={`p-8 rounded-2xl w-full max-w-md relative ${cardClass}`}>
        
        {/* Theme Toggle on Login Screen */}
        <button 
            onClick={toggleDarkMode}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${darkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
        >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold">
            {isFirstRun ? 'System Setup' : 'Staff Login'}
          </h2>
          <p className="text-slate-500">
            {isFirstRun ? 'Create the first Admin account' : 'Access your workspace'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 text-red-600 border border-red-500/20 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {isFirstRun ? (
          <form onSubmit={handleFirstRunSetup} className="space-y-4">
              <div>
              <label className="block text-sm font-medium mb-1 opacity-80">Full Name</label>
              <input 
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                value={newAdminName}
                onChange={e => setNewAdminName(e.target.value)}
                placeholder="e.g. Agency Manager"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 opacity-80">Username (User ID)</label>
              <input 
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                value={newAdminUser}
                onChange={e => setNewAdminUser(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 opacity-80">Password</label>
              <input 
                required
                type="password"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                value={newAdminPass}
                onChange={e => setNewAdminPass(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20">
              Create Admin Account
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 opacity-80">User ID / Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                  placeholder="Enter your ID"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 opacity-80">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="password"
                  required
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all mt-4"
            >
              Sign In
            </button>
          </form>
        )}
        
        <div className={`mt-8 text-center text-xs pt-6 border-t ${darkMode ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
           <p className="flex items-center justify-center gap-1.5">
            <Code2 className="h-3 w-3"/> 
            Developed by <span className={`font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>MD Rokibul Islam</span>
           </p>
        </div>
      </div>
    </div>
  );
}

// Invoice Modal Component
function InvoiceModal({ isOpen, onClose, file, darkMode, onGenerateInvoice }) {
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [paidAmount, setPaidAmount] = useState('');
  const [showPaidAmountInput, setShowPaidAmountInput] = useState(false);

  if (!isOpen || !file) return null;

  const handleStatusChange = (status) => {
    setPaymentStatus(status);
    setShowPaidAmountInput(status === 'Partially Paid');
  };

  const handleGenerateInvoice = async () => {
    if (paymentStatus === 'Partially Paid') {
      if (!paidAmount || parseFloat(paidAmount) < 0) {
        alert('Please enter a valid paid amount');
        return;
      }
      await onGenerateInvoice(file, paymentStatus, paidAmount);
    } else {
      await onGenerateInvoice(file, paymentStatus);
    }
    onClose();
  };

  const bgClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass = darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`${bgClass} rounded-xl border max-w-md w-full mx-4 overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
          <h3 className={`text-lg font-bold ${textMain} flex items-center gap-2`}>
            <FileText className="h-5 w-5" />
            Generate Invoice
          </h3>
          <p className={`text-sm ${textSub} mt-1`}>Invoice #{file.fileId}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Client Info */}
          <div>
            <p className={`text-sm font-semibold ${textSub} uppercase tracking-wider mb-2`}>Client</p>
            <p className={`text-sm ${textMain}`}>{file.applicantName}</p>
            <p className={`text-xs ${textSub} mt-1`}>{file.passportNo}</p>
          </div>

          {/* Amount */}
          <div>
            <p className={`text-sm font-semibold ${textSub} uppercase tracking-wider mb-2`}>Service Charge</p>
            <p className={`text-2xl font-bold text-green-600`}>৳{(parseFloat(file.serviceCharge) || 0).toFixed(2)}</p>
          </div>

          {/* Payment Status */}
          <div>
            <p className={`text-sm font-semibold ${textSub} uppercase tracking-wider mb-3`}>Payment Status</p>
            <div className="space-y-2">
              {['Paid', 'Unpaid', 'Partially Paid'].map(status => (
                <label key={status} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentStatus"
                    value={status}
                    checked={paymentStatus === status}
                    onChange={() => handleStatusChange(status)}
                    className="h-4 w-4"
                  />
                  <span className={`text-sm ${paymentStatus === status ? textMain : textSub}`}>{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Paid Amount Input */}
          {showPaidAmountInput && (
            <div>
              <label className={`block text-sm font-semibold ${textSub} uppercase tracking-wider mb-2`}>
                Paid Amount
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                max={parseFloat(file.serviceCharge) || 0}
                className={`w-full px-3 py-2 rounded-lg border ${inputClass} text-sm`}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${darkMode ? 'border-slate-800 bg-slate-800/30' : 'border-slate-100 bg-slate-50'} flex gap-2 justify-end`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateInvoice}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2`}
          >
            <Printer className="h-4 w-4" />
            Generate Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountingPanel({ currentUser, files, miscCosts, onAddMiscCost, onDeleteMiscCost, darkMode, isAdmin }) {
  const [newMiscCost, setNewMiscCost] = useState({
    description: '',
    amount: '',
    category: 'Operational',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  // Calculate financial totals including all file types
  const totalRevenue = files.reduce((sum, f) => {
    if (f.fileType === FILE_TYPES.VISA) return sum + (Number(f.serviceCharge) || 0);
    if (f.fileType === FILE_TYPES.AIR_TICKET) return sum + (Number(f.airlineSalePrice) || 0);
    if (f.fileType === FILE_TYPES.PACKAGE) return sum + (Number(f.packageSalePrice) || 0);
    return sum + (Number(f.serviceCharge) || 0); // Default to visa for backward compatibility
  }, 0);
  
  const totalCost = files.reduce((sum, f) => {
    if (f.fileType === FILE_TYPES.VISA) return sum + (Number(f.cost) || 0);
    if (f.fileType === FILE_TYPES.AIR_TICKET) return sum + (Number(f.airlineCostPrice) || 0);
    if (f.fileType === FILE_TYPES.PACKAGE) return sum + (Number(f.packageCostPrice) || 0);
    return sum + (Number(f.cost) || 0); // Default to visa for backward compatibility
  }, 0);
  
  const totalMiscCosts = miscCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const totalExpenditure = totalCost + totalMiscCosts;
  const netProfit = totalRevenue - totalExpenditure;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;

  const handleAddMiscCost = (e) => {
    e.preventDefault();
    if (!newMiscCost.description || !newMiscCost.amount) {
      alert('Please fill in description and amount');
      return;
    }
    onAddMiscCost(newMiscCost);
    setNewMiscCost({
      description: '',
      amount: '',
      category: 'Operational',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${textMain}`}>Accounting & Finance</h2>
          <p className={textSub}>Comprehensive financial overview of the business</p>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={`p-5 rounded-xl border ${darkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-100'}`}>
          <p className={`text-xs font-semibold uppercase mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Total Income</p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-900'}`}>৳{totalRevenue.toFixed(2)}</p>
          <p className={`text-xs mt-2 ${textSub}`}>{files.length} files</p>
        </div>

        <div className={`p-5 rounded-xl border ${darkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-100'}`}>
          <p className={`text-xs font-semibold uppercase mb-1 ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>File Costs</p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-900'}`}>৳{totalCost.toFixed(2)}</p>
          <p className={`text-xs mt-2 ${textSub}`}>Direct costs</p>
        </div>

        <div className={`p-5 rounded-xl border ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-xs font-semibold uppercase mb-1 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Misc Expenses</p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-red-300' : 'text-red-900'}`}>৳{totalMiscCosts.toFixed(2)}</p>
          <p className={`text-xs mt-2 ${textSub}`}>{miscCosts.length} entries</p>
        </div>

        <div className={`p-5 rounded-xl border ${darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-100'}`}>
          <p className={`text-xs font-semibold uppercase mb-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>Total Expenditure</p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-yellow-300' : 'text-yellow-900'}`}>৳{totalExpenditure.toFixed(2)}</p>
          <p className={`text-xs mt-2 ${textSub}`}>All costs combined</p>
        </div>

        <div className={`p-5 rounded-xl border ${netProfit >= 0 ? (darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100') : (darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100')}`}>
          <p className={`text-xs font-semibold uppercase mb-1 ${netProfit >= 0 ? (darkMode ? 'text-blue-400' : 'text-blue-700') : (darkMode ? 'text-red-400' : 'text-red-700')}`}>Net Profit</p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? (darkMode ? 'text-blue-300' : 'text-blue-900') : (darkMode ? 'text-red-300' : 'text-red-900')}`}>৳{netProfit.toFixed(2)}</p>
          <p className={`text-xs mt-2 ${textSub}`}>Margin: {profitMargin}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Misc Cost Form - Available to all users with accounting access */}
        <div className={`rounded-xl border p-6 ${cardClass}`}>
          <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textMain}`}>
            <Plus className="h-5 w-5 text-blue-500"/> Add Expense Entry
          </h3>
          <form onSubmit={handleAddMiscCost} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textMain}`}>Description *</label>
              <input
                type="text"
                required
                placeholder="e.g., Office supplies, Travel cost"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                value={newMiscCost.description}
                onChange={e => setNewMiscCost({...newMiscCost, description: e.target.value})}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${textMain}`}>Amount (Tk) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                value={newMiscCost.amount}
                onChange={e => setNewMiscCost({...newMiscCost, amount: e.target.value})}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${textMain}`}>Category</label>
              <select
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                value={newMiscCost.category}
                onChange={e => setNewMiscCost({...newMiscCost, category: e.target.value})}
              >
                <option value="Operational">Operational</option>
                <option value="Travel">Travel</option>
                <option value="Supplies">Supplies</option>
                <option value="Utilities">Utilities</option>
                <option value="Equipment">Equipment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${textMain}`}>Date</label>
              <input
                type="date"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${inputClass}`}
                value={newMiscCost.date}
                onChange={e => setNewMiscCost({...newMiscCost, date: e.target.value})}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${textMain}`}>Notes (Optional)</label>
              <textarea
                placeholder="Additional details..."
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] ${inputClass}`}
                value={newMiscCost.notes}
                onChange={e => setNewMiscCost({...newMiscCost, notes: e.target.value})}
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Expense
            </button>
          </form>
        </div>

        {/* Misc Costs List */}
        <div className={`lg:col-span-2 rounded-xl border p-6 ${cardClass}`}>
          <h3 className={`text-lg font-bold mb-4 ${textMain}`}>Expense Entries ({miscCosts.length})</h3>
          
          {miscCosts.length === 0 ? (
            <p className={`text-center py-8 ${textSub}`}>No expense entries yet. Add one to get started.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {miscCosts.map(cost => (
                <div key={cost.id} className={`p-4 rounded-lg border flex items-center justify-between ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-medium ${textMain}`}>{cost.description}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        cost.category === 'Operational' ? (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700') :
                        cost.category === 'Travel' ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') :
                        cost.category === 'Supplies' ? (darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
                        darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {cost.category}
                      </span>
                    </div>
                    <p className={`text-sm ${textSub}`}>{cost.date} • {cost.createdBy}</p>
                    {cost.notes && <p className={`text-xs mt-1 ${textSub}`}>{cost.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`font-bold text-lg ${darkMode ? 'text-red-400' : 'text-red-600'}`}>৳{Number(cost.amount).toFixed(2)}</p>
                    {isAdmin && (
                      <button
                        onClick={() => onDeleteMiscCost(cost.id)}
                        className={`p-1.5 rounded transition-colors ${darkMode ? 'text-slate-400 hover:text-red-500 hover:bg-slate-700' : 'text-slate-400 hover:text-red-500 hover:bg-slate-100'}`}
                        title="Delete entry"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Table */}
      <div className={`rounded-xl border p-6 ${cardClass}`}>
        <h3 className={`text-lg font-bold mb-4 ${textMain}`}>Financial Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: darkMode ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.1)'}}>
            <span className={textMain}>Total Income (All Files)</span>
            <span className={`font-bold text-lg ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>৳{totalRevenue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: darkMode ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.1)'}}>
            <span className={textMain}>File Processing Costs</span>
            <span className={`font-bold text-lg ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>৳{totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: darkMode ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.1)'}}>
            <span className={textMain}>Miscellaneous Expenses</span>
            <span className={`font-bold text-lg ${darkMode ? 'text-red-400' : 'text-red-700'}`}>৳{totalMiscCosts.toFixed(2)}</span>
          </div>
          <div className={`flex justify-between items-center p-4 rounded-lg font-bold ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-slate-100 border border-slate-300'}`}>
            <span className={`text-lg ${textMain}`}>Net Profit / (Loss)</span>
            <span className={`text-2xl ${netProfit >= 0 ? (darkMode ? 'text-blue-400' : 'text-blue-700') : (darkMode ? 'text-red-400' : 'text-red-700')}`}>৳{netProfit.toFixed(2)}</span>
          </div>
          <div className={`flex justify-between items-center p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <span className={textMain}>Profit Margin</span>
            <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{profitMargin}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}