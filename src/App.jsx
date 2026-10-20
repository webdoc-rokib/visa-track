import React, { useState, useEffect, useMemo, useRef } from 'react';
import logoImage from './assets/logo.jpg';
import ErrorBoundary from './ErrorBoundary';
import { validateDateFormat, parseDateSafe } from './utils/dateValidation';
import { storeSecureUserSession, getSecureUserSession, logoutUser } from './utils/sessionManager';
import { sanitizeInput, validateFileData, validateNote } from './utils/sanitization';
import { getDhakaDate, getStartOf, getEndOf, getDhakaTodayString, toDhakaTime } from './utils/timezoneUtils';
import { findPossibleFileDuplicates, findPossibleFileDuplicatePairs } from './utils/duplicateDetection';
import {
  calculateProcessingAgentWorkloads,
  chooseProcessingAgent,
  isProcessingAgentEligibleForDestinations,
  MAX_VISA_FAMILY_SIZE,
  WORK_RANK_WEIGHTS
} from './utils/assignmentRouting';
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
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Timer,
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
  PACKAGE: 'Package',
  PICK_DROP: 'Pick & Drop'
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
  
  // Pick & Drop statuses
  PICKUP_DROP_INITIATED: { label: 'Pick & Drop Service Initiated', color: 'bg-blue-100 text-blue-800', darkColor: 'bg-blue-900/30 text-blue-200', icon: Briefcase },
  PICKUP_DROP_BOOKED: { label: 'Booked', color: 'bg-purple-100 text-purple-800', darkColor: 'bg-purple-900/30 text-purple-200', icon: CheckCircle },
  PICKUP_DROP_CONFIRMED: { label: 'Pick & Drop Confirmed', color: 'bg-purple-100 text-purple-800', darkColor: 'bg-purple-900/30 text-purple-200', icon: CheckCircle },
  PICKUP_DROP_COMPLETED: { label: 'Pick & Drop Completed', color: 'bg-green-100 text-green-800', darkColor: 'bg-green-900/30 text-purple-200', icon: CheckCircle },
};

const RESULTS = {
  APPROVED: { label: 'Visa Approved', color: 'text-green-600', icon: ThumbsUp },
  REJECTED: { label: 'Visa Rejected', color: 'text-red-600', icon: ThumbsDown },
};

const isFileCompletedAtStatus = (file, status = file?.status) => {
  if (!file || !status) return false;
  const fileType = file.fileType || FILE_TYPES.VISA;

  if (fileType === FILE_TYPES.VISA) return status === 'DONE';
  if (fileType === FILE_TYPES.PACKAGE) return status === 'PACKAGE_READY';
  if (fileType === FILE_TYPES.AIR_TICKET) return status === 'ISSUED';
  if (fileType === FILE_TYPES.PICK_DROP) return status === 'PICKUP_DROP_COMPLETED';
  return false;
};

const isFileCompleted = (file) => isFileCompletedAtStatus(file);

// --- Helper Functions ---
const formatDate = (timestamp) => {
  try {
    const date = getTimestampDate(timestamp);
    if (!date) return '-';
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
};

const formatSimpleDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Timezone functions now imported from utils/timezoneUtils.js
// Old functions removed - using corrected UTC+6 implementation

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

// Incentive calculation helper
function calculateIncentive(profit, incentiveConfig) {
  if (!incentiveConfig || profit <= 0) return 0;

  const target = Number(incentiveConfig.target || 0);
  let surplus = Math.max(0, profit - target);
  if (surplus <= 0) return 0;

  const tiers = Array.isArray(incentiveConfig.tiers) ? [...incentiveConfig.tiers] : [];
  tiers.sort((a,b) => Number(a.amount) - Number(b.amount));

  let incentive = 0;
  let priorThreshold = 0;

  tiers.forEach((tier) => {
    if (surplus <= 0) return;
    const tierAmount = Number(tier.amount) - priorThreshold;
    if (tierAmount <= 0) {
      priorThreshold = Number(tier.amount);
      return;
    }
    const amountInTier = Math.min(surplus, tierAmount);
    incentive += amountInTier * (Number(tier.percent || 0) / 100);
    surplus -= amountInTier;
    priorThreshold = Number(tier.amount);
  });

  return Math.round(incentive * 100) / 100;
}

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
  name: 'Alif Global Tours & Travels',
  tagline: 'Connecting You to the World!',
  iataCode: '42347056',
  tradeNum: 'TRAD/DNCC/046978/2023',
  caabNum: '0015752',
  address: 'N.I Tower (9th Floor), House 01, Road 10, Block E, Banani, Dhaka 1213',
  phone: '+880 1901-467290',
  email: 'info@alifglobaltours.com',
  website: 'alifglobaltours.com',
  logo: logoImage,
};

// Invoice helpers (fresh implementation)
const AUTO_APPROVE_DISCOUNT_PERCENT = 5;

const getBaseInvoiceAmount = (file) => {
  if (!file) return 0;
  if (file.fileType === FILE_TYPES.AIR_TICKET) {
    return Number(file.airlineSalePrice || file.serviceCharge || 0) || 0;
  }
  if (file.fileType === FILE_TYPES.PACKAGE) {
    return Number(file.packageSalePrice || file.serviceCharge || 0) || 0;
  }
  if (file.fileType === FILE_TYPES.PICK_DROP) {
    return Number(file.salePrice || file.serviceCharge || 0) || 0;
  }
  return Number(file.serviceCharge || 0) || 0;
};

const getInvoiceAdjustments = (file) => (Array.isArray(file?.priceAdjustments) ? file.priceAdjustments : []);

const getInvoiceAmount = (file) => {
  if (!file) return 0;
  const adjustmentTotal = getInvoiceAdjustments(file).reduce((sum, item) => sum + (Number(item.delta) || 0), 0);
  return Math.max(Math.round((getBaseInvoiceAmount(file) + adjustmentTotal) * 100) / 100, 0);
};

const isAutoApprovableDiscount = (file, newAmount) => {
  const current = getInvoiceAmount(file);
  const base = getBaseInvoiceAmount(file);
  return newAmount > 0 && newAmount < current && newAmount >= base * (1 - AUTO_APPROVE_DISCOUNT_PERCENT / 100);
};

const getInvoiceDescription = (file) => {
  if (!file) return 'Service';
  if (file.fileType === FILE_TYPES.VISA) {
    const country = file.destination || file.packageCountries?.[0] || file.airlineRoute || 'Visa';
    return `${country} Visa Processing`;
  }
  if (file.fileType === FILE_TYPES.AIR_TICKET) {
    const route = file.airlineRoute || file.destination || 'Ticket';
    return `${route} Air Ticket`;
  }
  if (file.fileType === FILE_TYPES.PACKAGE) {
    const countries = file.packageCountries?.length ? file.packageCountries.join(', ') : file.destination || 'Tour';
    return `${countries} Tour Package`;
  }
  if (file.fileType === FILE_TYPES.PICK_DROP) {
    const from = file.pickupLocation || 'Origin';
    const to = file.dropoffLocation || 'Destination';
    return `${from} to ${to} Pick Drop Service`;
  }
  return file.destination || file.airlineRoute || 'Service';
};

const getFileComplianceInfo = (file) => {
  const requiredFields = [];
  if (!file) return { requiredCount: 0, missing: [], score: 1 };

  if (file.fileType === FILE_TYPES.VISA) {
    requiredFields.push('destination', 'passportNo', 'serviceCharge', 'invoiceNo');
  } else if (file.fileType === FILE_TYPES.AIR_TICKET) {
    requiredFields.push('airlineRoute', 'airlineSalePrice', 'airlineCostPrice', 'invoiceNo');
  } else if (file.fileType === FILE_TYPES.PACKAGE) {
    requiredFields.push('packageCountries', 'packageSalePrice', 'packageCostPrice', 'mainPersonPassport', 'invoiceNo');
  } else if (file.fileType === FILE_TYPES.PICK_DROP) {
    requiredFields.push('pickupLocation', 'dropoffLocation', 'salePrice', 'costPrice', 'invoiceNo');
  } else {
    requiredFields.push('serviceCharge', 'invoiceNo');
  }

  const missing = requiredFields.filter(key => {
    const value = file[key];
    if (value === undefined || value === null || value === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  });

  const score = requiredFields.length ? Math.max(0, 1 - missing.length / requiredFields.length) : 1;
  return { requiredCount: requiredFields.length, missing, score };
};

const ACCOUNTING_CUTOFF_DATE = new Date('2026-08-09T00:00:00+06:00');

const getTimestampDate = (value) => {
  if (!value) return null;

  if (typeof value === 'object' && typeof value.toDate === 'function') {
    const parsed = value.toDate();
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }

  if (typeof value === 'object' && typeof value.seconds === 'number') {
    const parsed = new Date(value.seconds * 1000);
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }

  const parsed = new Date(value);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const isAccountingEligibleFile = (file) => {
  if (!file) return false;

  const createdAt = getTimestampDate(file.createdAt);
  const invoiceCreatedAt = getTimestampDate(file.invoiceCreatedAt);
  const anchorDate = invoiceCreatedAt || createdAt;

  if (!anchorDate) return true;
  return anchorDate >= ACCOUNTING_CUTOFF_DATE;
};

const isAccountingEligibleMiscCost = (cost) => {
  if (!cost) return false;

  const dateValue = cost.date;
  const createdAt = getTimestampDate(cost.createdAt);

  if (dateValue) {
    const parsedCostDate = new Date(`${dateValue}T00:00:00+06:00`);
    if (!Number.isNaN(parsedCostDate.getTime())) {
      return parsedCostDate >= ACCOUNTING_CUTOFF_DATE;
    }
  }

  if (createdAt) {
    return createdAt >= ACCOUNTING_CUTOFF_DATE;
  }

  return true;
};

const getInvoiceSummary = (file) => {
  const amount = getInvoiceAmount(file);
  const paidAmount = Number(file?.invoicePaidAmount || file?.invoice?.paidAmount || 0) || 0;
  const paymentStatus = file?.invoicePaymentStatus || file?.invoice?.paymentStatus || 'Unpaid';
  const resolvedPaid = paymentStatus === 'Paid' ? amount : paymentStatus === 'Partially Paid' ? paidAmount : 0;
  const dueAmount = Math.max(amount - resolvedPaid, 0);
  return { amount, paidAmount: resolvedPaid, dueAmount, paymentStatus };
};

const createInvoiceNumber = (fileId) => {
  const now = getDhakaDate();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = String(Math.floor(1000 + Math.random() * 9000));
  return `INV-${stamp}-${random}`;
};

const isCashPaymentMethod = (method) => String(method?.name || '').trim().toLowerCase() === 'cash';

const normalizePaymentReference = (reference) => String(reference || '').trim().replace(/\s+/g, ' ').toLowerCase();

const getPaymentReferenceDocumentId = (reference) => {
  const normalized = normalizePaymentReference(reference);
  const encoded = Array.from(new TextEncoder().encode(normalized), byte => byte.toString(16).padStart(2, '0')).join('');
  return `ref_${encoded}`;
};

const findDuplicatePaymentReference = (files, reference) => {
  const normalized = normalizePaymentReference(reference);
  if (!normalized) return null;
  for (const file of files) {
    const payments = Array.isArray(file.invoicePayments) ? file.invoicePayments : Array.isArray(file.invoice?.payments) ? file.invoice.payments : [];
    const payment = payments.find(item => normalizePaymentReference(item.transactionRef) === normalized);
    if (payment) return { file, payment };
  }
  return null;
};

const getDuplicatePaymentReferenceMessage = (duplicate) =>
  `This transaction reference was already used on file ${duplicate.file.fileId || duplicate.file.id}. Enter a unique reference.`;

const buildCashPaymentMail = (file, payment, recipients) => {
  const fileId = file.fileId || file.id || 'N/A';
  const applicantName = file.applicantName || file.mainPersonName || 'N/A';
  const country = file.destination || file.country || file.packageCountries?.join(', ') || file.airlineRoute || 'N/A';
  const fileType = file.fileType || FILE_TYPES.VISA;
  const receivedAt = payment.receivedAt?.toDate ? payment.receivedAt.toDate() : new Date();
  const lines = [
    'A cash payment has been received.',
    '',
    `Amount: ${formatCurrency(Number(payment.amount) || 0)}`,
    `File ID: ${fileId}`,
    `Name: ${applicantName}`,
    `Country: ${country}`,
    `File type: ${fileType}`,
    `Payment/Transaction reference: ${payment.transactionRef || 'N/A'}`,
    `Received by: ${payment.receivedBy || 'N/A'}`,
    `Received at: ${receivedAt.toLocaleString()}`
  ];
  return {
    to: recipients,
    message: {
      subject: `Cash payment received - ${fileId}`,
      text: lines.join('\n')
    }
  };
};

const buildInvoicePrintHtml = (file, invoice) => {
  const trackingId = file?.fileId || '';
  const adjustments = getInvoiceAdjustments(file);
  const trackingUrl = `${window.location.origin}/?track=${encodeURIComponent(trackingId)}`;
  const amount = Number(invoice?.amount || getInvoiceAmount(file) || 0);
  const paidAmount = Number(invoice?.paidAmount || 0);
  const dueAmount = Math.max(amount - paidAmount, 0);
  const statusLabel = invoice?.paymentStatus || 'Unpaid';
  const paymentRecords = invoice?.invoicePayments || file?.invoicePayments || file?.invoice?.payments || [];
  const latestPayment = paymentRecords[paymentRecords.length - 1];
  const paymentMethodText = latestPayment
    ? [latestPayment.methodName, latestPayment.institution, latestPayment.accountName, latestPayment.accountNumber].filter(Boolean).join(' · ')
    : paidAmount > 0 ? 'Not recorded for historical payments' : 'No payment received yet';
  const invoiceNo = invoice?.invoiceNo || file?.invoiceNo || `INV-${file?.fileId || 'NEW'}`;
  const issuedDate = getDhakaDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const customerName = file?.applicantName || 'Customer';
  const passport = file?.passportNo || file?.mainPersonPassport || 'N/A';
  const contact = file?.contactNo || 'N/A';
  const invoiceCreatedBy = invoice?.invoiceCreatedBy || file?.invoiceCreatedBy || 'N/A';
  const invoiceDescription = getInvoiceDescription(file);
  const destination = file?.destination || file?.airlineRoute || file?.packageCountries?.join(', ') || 'N/A';
  const notesText = invoice?.notes?.trim() || 'No additional notes provided.';
  const termsText = `All payments are subject to our service policy. Embassy, government, airline, hotel, and third-party fees are non-refundable. Visa approval is solely at the discretion of the respective authority. Customers are responsible for providing genuine documents and verifying all travel documents upon receipt. Processing times are estimates only. Refunds, cancellations, and amendments are subject to the policies of the respective service providers. The company is not liable for visa refusals, delays, or force majeure events.`;

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${invoiceNo}</title>
      <style>
        :root {
          color-scheme: light;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #ffffff; color: #111111; }
        @page { size: A4 portrait; margin: 12mm; }
        :root {
          color-scheme: light;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        * { box-sizing: border-box; }
        html, body { min-height: 100%; }
        body { margin: 0; padding: 0; background: #ffffff; color: #111111; }
        .invoice-shell { width: 100%; padding: 10px; }
        .invoice-card { background: #ffffff; border-radius: 12px; border: 1px solid #d1d5db; overflow: hidden; margin-bottom: 10px; }
        .invoice-header { display: flex; justify-content: space-between; gap: 14px; padding: 18px 20px; background: #f3f4f6; color: #111111; }
        .brand { display: flex; gap: 12px; align-items: center; }
        .brand-logo { width: 58px; height: 58px; border-radius: 12px; overflow: hidden; background: #ffffff; display: grid; place-items: center; border: 1px solid #d1d5db; }
        .brand-logo img { width: 54px; height: 54px; object-fit: contain; }
        .brand-text { line-height: 1.05; }
        .brand-text h1 { margin: 0; font-size: 18px; letter-spacing: -0.03em; }
        .brand-text p { margin: -3px 0 0; color: #4b5563; font-size: 12px; }
        .company-meta { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 3px; text-align: right; font-size: 10px; color: #374151; }
        .company-meta strong { display: block; font-weight: 700; color: #111111; }
        .invoice-details { padding: 16px 20px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .invoice-title { margin: -3px 0 6px; font-size: 16px; font-weight: 700; letter-spacing: -0.03em; }
        .tag { display: inline-flex; align-items: center; gap: 6px; background: #e5e7eb; color: #111111; padding: 6px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; }
        .section { padding: 16px 20px; }
        .section-row { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; margin-bottom: 12px; }
        .section-row:last-child { margin-bottom: 0; }
        .section-block { min-width: 0; }
        .section-block h2 { margin: 0 0 4px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; }
        .section-block p, .section-block div { margin: 0; font-size: 12px; color: #111111; line-height: 1.5; }
        .invoice-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        .invoice-table th, .invoice-table td { padding: 10px 12px; border-bottom: 1px solid #d1d5db; }
        .invoice-table th { background: #f9fafb; font-size: 11px; color: #374151; text-align: left; }
        .invoice-table td { font-size: 12px; color: #111111; }
        .total-row td { font-weight: 700; }
        .summary { display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: end; margin-top: 18px; }
        .summary-card { background: #f9fafb; border-radius: 12px; padding: 14px 18px; min-width: 200px; border: 1px solid #e5e7eb; }
        .summary-card p { margin: 0; font-size: 11px; color: #4b5563; }
        .summary-card strong { display: block; margin-top: 4px; font-size: 16px; color: #111111; }
        .status-pill { display: inline-flex; align-items: center; justify-content: center; padding: 6px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.02em; border: 1px solid #d1d5db; }
        .status-paid { background: #ffffff; color: #111111; }
        .status-partial { background: #f3f4f6; color: #111111; }
        .status-unpaid { background: #f9fafb; color: #111111; }
        .note-box { min-height: 52px; border: 1px solid #d1d5db; border-radius: 12px; padding: 12px 14px; background: #ffffff; color: #111111; white-space: pre-wrap; }
        .terms { margin-top: 8px; font-size: 10px; color: #4b5563; line-height: 1.45; }
        .track-box { border: 1px dashed #94a3b8; border-radius: 12px; padding: 10px 14px; background: #f8fafc; font-size: 12px; color: #111111; }
        .track-box a { color: #0f4c81; word-break: break-all; }
        .footer { border-top: 1px solid #d1d5db; padding: 14px 20px 18px; display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap; font-size: 10px; color: #6b7280; }
        .footer a { color: #111111; text-decoration: none; }
        .copy-stamp { font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.12em; }
        @media print {
          body { background: #ffffff; }
          .invoice-shell { padding: 0; }
          .invoice-card { box-shadow: none; border-radius: 0; margin-bottom: 0; page-break-after: always; }
          .invoice-header, .section, .footer { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-shell">
        ${buildInvoiceCopy('Office Copy')}
        ${buildInvoiceCopy('Customer Copy')}
      </div>
    </body>
  </html>`;

  function buildInvoiceCopy(copyLabel) {
    return `
      <div class="invoice-card">
        <div class="invoice-header">
          <div class="brand">
            <div class="brand-logo"><img src="${COMPANY_INFO.logo}" alt="Logo" /></div>
            <div class="brand-text">
              <h1>${COMPANY_INFO.name}</h1>
              <p>${COMPANY_INFO.tagline}</p>
            </div>
          </div>
          <div class="company-meta">
            <div class="tag">${copyLabel}</div>
            <strong>IATA ${COMPANY_INFO.iataCode}</strong>
            <div>Trade License: ${COMPANY_INFO.tradeNum}</div>
            <div>CAAB No: ${COMPANY_INFO.caabNum}</div>
            <div>${COMPANY_INFO.address}</div>
            <div>Hotline: ${COMPANY_INFO.phone}</div>
            <div>Email: ${COMPANY_INFO.email}</div>
            <div>Website: ${COMPANY_INFO.website}</div>
          </div>
        </div>

        <div class="invoice-details">
          <div class="section-block">
            <h2>Invoice</h2>
            <div><strong>#${invoiceNo}</strong></div>
            <div style="margin-top:6px; color:#475569;">Issued ${issuedDate}</div>
            <div style="margin-top:6px; color:#475569; font-size:12px;">VT ID: <strong>${file?.fileId || file?.id || '-'}</strong></div>
            <div style="margin-top:6px; color:#475569; font-size:12px;">Created by: <strong>${invoiceCreatedBy}</strong></div>
          </div>
          <div class="section-block">
            <h2>Payment Status</h2>
            <div class="status-pill ${statusLabel === 'Paid' ? 'status-paid' : statusLabel === 'Partially Paid' ? 'status-partial' : 'status-unpaid'}">${statusLabel}</div>
            <div style="margin-top:8px; color:#475569; font-size:12px;">Payment method: <strong>${paymentMethodText}</strong></div>
          </div>
        </div>

        <div class="section">
          <div class="section-row">
            <div class="section-block">
              <h2>Bill To</h2>
              <div>${customerName}</div>
              <div>Passport: ${passport}</div>
              <div>Contact: ${contact}</div>
            </div>
            <div class="section-block">
              <h2>Service Details</h2>
              <div>${invoiceDescription}</div>
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${invoiceDescription}</td>
                <td style="text-align:right;">৳${(amount - adjustments.reduce((sum, item) => sum + (Number(item.delta) || 0), 0)).toFixed(2)}</td>
              </tr>
              ${adjustments.map(item => `<tr>
                <td style="color:#475569;">${Number(item.delta) < 0 ? 'Discount' : 'Price adjustment'}</td>
                <td style="text-align:right;">${Number(item.delta) < 0 ? '-' : '+'}৳${Math.abs(Number(item.delta) || 0).toFixed(2)}</td>
              </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td>Total</td>
                <td style="text-align:right;">৳${amount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="summary">
            <div class="summary-card">
              <p>Amount Paid</p>
              <strong>৳${paidAmount.toFixed(2)}</strong>
            </div>
            <div class="summary-card">
              <p>Remaining Due</p>
              <strong>৳${dueAmount.toFixed(2)}</strong>
            </div>
          </div>

          <div class="section">
            <div class="section-block">
              <h2>Notes</h2>
              <div class="note-box">${notesText}</div>
            </div>
          </div>

          ${trackingId ? `<div class="section">
            <div class="section-block">
              <h2>Track Your Progress</h2>
              <div class="track-box">Follow your file status online anytime. Open <a href="${trackingUrl}">${trackingUrl}</a></div>
            </div>
          </div>` : ''}

          <div class="section">
            <div class="section-block">
              <h2>Terms & Conditions</h2>
              <div class="terms">${termsText}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>${COMPANY_INFO.name} | ${COMPANY_INFO.tagline}</div>
          <div>Hotline: ${COMPANY_INFO.phone} • ${COMPANY_INFO.email} • ${COMPANY_INFO.website}</div>
        </div>
      </div>
    `;
  }
};

const printInvoiceCopies = (file, invoice) => {
  const notes = window.prompt('Add optional notes for this invoice before printing:', invoice?.notes || '');
  if (notes === null) {
    return;
  }

  const invoiceWithNotes = {
    ...invoice,
    notes: notes.trim()
  };

  const printWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!printWindow) {
    alert('Please allow pop-ups to print invoice copies.');
    return;
  }
  printWindow.document.write(buildInvoicePrintHtml(file, invoiceWithNotes));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
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
  const [visaWorkRanks, setVisaWorkRanks] = useState({});
  const [visaDestinationAgents, setVisaDestinationAgents] = useState({});
  const [visaFamilyGroups, setVisaFamilyGroups] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cashPaymentNotificationEmails, setCashPaymentNotificationEmails] = useState([]);
  const [allPortals, setAllPortals] = useState(AIR_TICKET_PORTALS);
  const [allUsers, setAllUsers] = useState([]); 
  const [duplicateReviews, setDuplicateReviews] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [fileRequests, setFileRequests] = useState([]);
  const [cleanupComplete, setCleanupComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [trackingMode, setTrackingMode] = useState(false);
  const [trackingFileId, setTrackingFileId] = useState('');
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('visaTrackDarkMode');
    return saved === 'true';
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false); 
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [leaveFormData, setLeaveFormData] = useState({ startDate: '', endDate: '', reason: '' });
  
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
  const [pickDropBookedModalOpen, setPickDropBookedModalOpen] = useState(false);
  
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
    const visaWorkRanksRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'visa_work_ranks');
    const unsubVisaWorkRanks = onSnapshot(visaWorkRanksRef, snapshot => {
      setVisaWorkRanks(snapshot.exists() ? snapshot.data().ranks || {} : {});
    }, error => {
      console.error('Error loading Visa work ranks:', error);
      alert('Unable to load Visa workload rankings. New handoffs will use Moderate until this is resolved.');
    });
    const visaDestinationAgentsRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'visa_destination_agents');
    const unsubVisaDestinationAgents = onSnapshot(visaDestinationAgentsRef, snapshot => {
      setVisaDestinationAgents(snapshot.exists() ? snapshot.data().agentsByDestination || {} : {});
    }, error => {
      console.error('Error loading Visa destination agent assignments:', error);
      alert('Unable to load Visa destination routing rules. Please refresh before handing off a Visa file.');
    });
    const visaFamilyGroupsRef = collection(db, 'artifacts', appId, 'public', 'data', 'visa_family_groups');
    const unsubVisaFamilyGroups = onSnapshot(visaFamilyGroupsRef, snapshot => {
      setVisaFamilyGroups(snapshot.docs.map(groupDoc => ({ id: groupDoc.id, ...groupDoc.data() })));
    }, error => {
      console.error('Error loading Visa family groups:', error);
      alert('Unable to load family groups. Family linking may be unavailable until you refresh.');
    });
    const paymentMethodsRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'payment_methods');
    const unsubPaymentMethods = onSnapshot(paymentMethodsRef, (docSnap) => {
      setPaymentMethods(docSnap.exists() ? docSnap.data().items || [] : []);
    }, (error) => {
      console.error('Error loading payment methods:', error);
    });
    const cashPaymentNotificationRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'cash_payment_notifications');
    const unsubCashPaymentNotifications = onSnapshot(cashPaymentNotificationRef, (docSnap) => {
      const recipients = docSnap.exists() ? docSnap.data().recipients : [];
      setCashPaymentNotificationEmails(Array.isArray(recipients) ? recipients : []);
    }, (error) => {
      console.error('Error loading cash payment notification settings:', error);
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
    // Fetch leave requests
    const qLeaveRequests = collection(db, 'artifacts', appId, 'public', 'data', 'leave_requests');
    const unsubLeaveRequests = onSnapshot(qLeaveRequests, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeaveRequests(requests);
    });

    // Fetch approved leaves
    const qApprovedLeaves = collection(db, 'artifacts', appId, 'public', 'data', 'approved_leaves');
    const unsubApprovedLeaves = onSnapshot(qApprovedLeaves, (snapshot) => {
      const leaves = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApprovedLeaves(leaves);
    });

    return () => { unsubFiles(); unsubDest(); unsubVisaWorkRanks(); unsubVisaDestinationAgents(); unsubVisaFamilyGroups(); unsubPaymentMethods(); unsubCashPaymentNotifications(); unsubPortals(); unsubUsers(); unsubLeaveRequests(); unsubApprovedLeaves(); };
  }, [user, cleanupComplete]);

  useEffect(() => {
    if (!user || !appUser?.id) {
      setFileRequests([]);
      return;
    }
    const requestsRef = collection(db, 'artifacts', appId, 'public', 'data', 'file_requests');
    const requestsQuery = appUser.role === ROLES.ADMIN ? requestsRef : query(requestsRef, where('createdById', '==', appUser.id));
    return onSnapshot(requestsQuery, (snapshot) => {
      setFileRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error('Error loading requests:', error));
  }, [user, appUser?.id, appUser?.role]);

  const applyPriceAdjustment = async ({ fileDocId, newAmount, expectedAmount, reason, ticketNo, requestedBy, auto }) => {
    const fileDoc = doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', fileDocId);
    return runTransaction(db, async transaction => {
      const snapshot = await transaction.get(fileDoc);
      if (!snapshot.exists()) throw new Error('File no longer exists.');
      const current = { id: snapshot.id, ...snapshot.data() };
      const oldAmount = getInvoiceAmount(current);
      if (Math.abs(oldAmount - expectedAmount) > 0.005) {
        throw new Error('The invoice amount changed after this request was made. Please submit a new request.');
      }
      if (!(newAmount > 0) || Math.abs(newAmount - oldAmount) < 0.005) throw new Error('Invalid new amount.');
      const summary = getInvoiceSummary(current);
      const hasInvoice = Boolean(current.invoiceNo || current.invoice?.invoiceNo);
      if (hasInvoice && newAmount < summary.paidAmount) {
        throw new Error('The new amount is lower than what has already been paid on this invoice.');
      }
      const adjustment = {
        id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ticketNo: ticketNo || '',
        type: newAmount < oldAmount ? 'DISCOUNT' : 'INCREASE',
        oldAmount,
        newAmount,
        delta: Math.round((newAmount - oldAmount) * 100) / 100,
        reason: reason || '',
        requestedBy: requestedBy || '',
        approvedBy: auto ? 'Auto-approved (within limit)' : appUser.name,
        auto: Boolean(auto),
        at: Date.now()
      };
      const update = { priceAdjustments: [...getInvoiceAdjustments(current), adjustment] };
      if (hasInvoice) {
        const paid = summary.paidAmount;
        update.invoiceAmount = newAmount;
        update.invoicePaidAmount = paid;
        update.invoicePaymentStatus = paid >= newAmount ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid';
        update.invoiceUpdatedAt = serverTimestamp();
      }
      transaction.update(fileDoc, update);
      return adjustment;
    });
  };

  const submitFileRequest = async ({ type, fileId, details, requestedAmount }) => {
    const matchedFile = files.find(f => f.fileId === fileId);
    const cleanDetails = sanitizeInput(details || '', { maxLength: 1000 }).trim();
    if (!matchedFile || !cleanDetails) return false;
    const ticketNo = `REQ-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const isPrice = type === 'PRICE';
    const newAmount = Math.round((Number(requestedAmount) || 0) * 100) / 100;
    const currentAmount = getInvoiceAmount(matchedFile);
    if (isPrice && (appUser.role !== ROLES.SALES || !(newAmount > 0) || Math.abs(newAmount - currentAmount) < 0.005)) {
      alert('Enter a valid new amount that differs from the current invoice amount.');
      return false;
    }
    try {
      const autoApprove = isPrice && isAutoApprovableDiscount(matchedFile, newAmount);
      if (autoApprove) {
        await applyPriceAdjustment({
          fileDocId: matchedFile.id,
          newAmount,
          expectedAmount: currentAmount,
          reason: cleanDetails,
          ticketNo,
          requestedBy: appUser.name,
          auto: true
        });
      }
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'file_requests'), {
        ticketNo,
        type,
        fileId: matchedFile.fileId,
        fileDocId: matchedFile.id,
        applicantName: matchedFile.applicantName || '',
        details: cleanDetails,
        ...(isPrice ? { currentAmount, requestedAmount: newAmount, priceApplied: autoApprove, autoApproved: autoApprove } : {}),
        status: autoApprove ? 'COMPLETED' : 'OPEN',
        createdBy: appUser.name,
        createdById: appUser.id,
        createdAt: serverTimestamp(),
        adminNote: '',
        resolvedBy: autoApprove ? 'System (auto-approved)' : null,
        resolvedAt: autoApprove ? serverTimestamp() : null,
        requesterSeen: true
      });
      if (autoApprove) alert(`Discount applied automatically (within ${AUTO_APPROVE_DISCOUNT_PERCENT}%) and logged on the invoice.`);
      return true;
    } catch (e) {
      console.error('Error submitting request:', e);
      alert(`Failed to submit request: ${e.message || ''}`);
      return false;
    }
  };

  const approvePriceRequest = async (request, message) => {
    if (appUser?.role !== ROLES.ADMIN || request.type !== 'PRICE' || request.priceApplied) return false;
    try {
      await applyPriceAdjustment({
        fileDocId: request.fileDocId,
        newAmount: request.requestedAmount,
        expectedAmount: request.currentAmount,
        reason: request.details,
        ticketNo: request.ticketNo,
        requestedBy: request.createdBy,
        auto: false
      });
    } catch (e) {
      alert(e.message || 'Failed to apply the price change.');
      return false;
    }
    const text = sanitizeInput(message || '', { maxLength: 500 }).trim();
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'file_requests', request.id), {
        status: 'COMPLETED',
        priceApplied: true,
        requesterSeen: false,
        resolvedBy: appUser.name,
        resolvedAt: serverTimestamp(),
        ...(text ? { messages: arrayUnion({ by: appUser.name, role: appUser.role, text, at: Date.now() }) } : {})
      });
    } catch (e) {
      console.error('Price applied but ticket update failed:', e);
      alert('The price change was applied, but the ticket could not be updated. Please mark it completed manually.');
    }
    return true;
  };

  const updateFileRequestStatus = async (requestId, status, message) => {
    try {
      const closed = status === 'COMPLETED' || status === 'REJECTED';
      const text = sanitizeInput(message || '', { maxLength: 500 }).trim();
      const update = {
        status,
        requesterSeen: appUser.role !== ROLES.ADMIN,
        resolvedBy: closed ? appUser.name : null,
        resolvedAt: closed ? serverTimestamp() : null
      };
      if (text) {
        update.messages = arrayUnion({ by: appUser.name, role: appUser.role, text, at: Date.now() });
      }
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'file_requests', requestId), update);
      return true;
    } catch (e) {
      console.error('Error updating request:', e);
      alert('Failed to update request');
      return false;
    }
  };

  useEffect(() => {
    if (!user || appUser?.role !== ROLES.ADMIN) {
      setDuplicateReviews([]);
      return;
    }
    const reviewsRef = collection(db, 'artifacts', appId, 'public', 'data', 'file_duplicate_reviews');
    const unsubscribe = onSnapshot(reviewsRef, snapshot => {
      setDuplicateReviews(snapshot.docs.map(review => ({ id: review.id, ...review.data() })));
    }, error => {
      console.error('Error loading duplicate review decisions:', error);
      alert('Unable to load duplicate review decisions. Check Firestore access and try again.');
    });
    return () => unsubscribe();
  }, [user, appUser?.role]);

  const myTasks = useMemo(() => {
    if (!appUser || files.length === 0) return [];

    const isVisibleTask = (file) => {
      if (!file || file.assignedTo !== appUser.name) return false;
      if (isFileCompleted(file)) return false;

      // Processing Agent-specific suppression for tracked terminal/moved-on statuses
      if (appUser.role === ROLES.PROCESSING) {
        return !['SUBMITTED'].includes(file.status) && !file.acknowledgedByProcessingAgent;
      }

      return true;
    };

    return files.filter(isVisibleTask);
  }, [files, appUser]);
  const possibleDuplicatePairs = useMemo(() => findPossibleFileDuplicatePairs(files), [files]);
  const openRequestCount = appUser?.role === ROLES.ADMIN
    ? fileRequests.filter(r => r.status === 'OPEN').length
    : fileRequests.filter(r => r.status === 'NEEDS_INFO' || r.requesterSeen === false).length;

  useEffect(() => {
    if (activeTab !== 'requests' || !appUser || appUser.role === ROLES.ADMIN) return;
    fileRequests
      .filter(r => r.requesterSeen === false && r.status !== 'NEEDS_INFO')
      .forEach(r => {
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'file_requests', r.id), { requesterSeen: true })
          .catch(e => console.error('Error marking request seen:', e));
      });
  }, [activeTab, fileRequests, appUser]);
  const moreBadgeCount = appUser?.role === ROLES.ADMIN
    ? leaveRequests.filter(request => request.status === 'PENDING').length +
      possibleDuplicatePairs.filter(pair => !duplicateReviews.some(review => review.id === pair.reviewId)).length +
      openRequestCount
    : openRequestCount;

  useEffect(() => {
    if (appUser && !loading && !hasCheckedIn) {
        if (myTasks.length > 0) setShowNotifications(true);
        setHasCheckedIn(true);
    }
  }, [appUser, loading, hasCheckedIn, myTasks.length]);

  // Initialize app - check for existing user session
  useEffect(() => {
    const initializeApp = async () => {
      setCleanupComplete(true);

      const userProfile = getSecureUserSession();
      if (userProfile) {
        
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
        
        // Attendance is now tracked per-day per-user in Firestore
        // No session ID restoration needed in localStorage

      }
    };
    
    initializeApp();
  }, []);

  const handleLogin = async (userProfile) => {
    setAppUser(userProfile);
    storeSecureUserSession(userProfile);
    setHasCheckedIn(false);
    
    // Trigger welcome animation
    setTimeout(() => {
      triggerConfetti();
    }, 300);
  };

  const handleLogout = async () => {
    logoutUser();
    setAppUser(null);
    setActiveTab('dashboard'); 
    setHasCheckedIn(false);
  };

  // Leave Request Functions
  const handleRequestLeave = async (e) => {
    e.preventDefault();
    if (!appUser || !leaveFormData.startDate || !leaveFormData.endDate) {
      alert('Please fill all fields');
      return;
    }

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leave_requests'), {
        userName: appUser.name,
        userId: appUser.id,
        role: appUser.role,
        startDate: leaveFormData.startDate,
        endDate: leaveFormData.endDate,
        reason: leaveFormData.reason || '',
        status: 'PENDING', // PENDING, APPROVED, REJECTED
        requestedAt: serverTimestamp(),
        approvedAt: null,
        approvedBy: null
      });
      setLeaveFormData({ startDate: '', endDate: '', reason: '' });
      setShowLeaveRequestModal(false);
      alert('Leave request submitted successfully!');
    } catch (e) {
      console.error('Error submitting leave request:', e);
      alert('Failed to submit leave request');
    }
  };

  const approveLeaveRequest = async (requestId, request) => {
    try {
      // Update leave request status
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leave_requests', requestId), {
        status: 'APPROVED',
        approvedAt: serverTimestamp(),
        approvedBy: appUser.name
      });

      // Create approved leave record
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'approved_leaves'), {
        userName: request.userName,
        userId: request.userId,
        role: request.role,
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason || '',
        approvedAt: serverTimestamp(),
        approvedBy: appUser.name,
        type: 'REQUESTED' // REQUESTED or DIRECT
      });

      alert('Leave request approved!');
    } catch (e) {
      console.error('Error approving leave request:', e);
      alert('Failed to approve leave request');
    }
  };

  const rejectLeaveRequest = async (requestId) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leave_requests', requestId), {
        status: 'REJECTED',
        approvedAt: serverTimestamp(),
        approvedBy: appUser.name
      });
      alert('Leave request rejected!');
    } catch (e) {
      console.error('Error rejecting leave request:', e);
      alert('Failed to reject leave request');
    }
  };

  const grantDirectLeave = async (userName, startDate, endDate, reason) => {
    if (!userName || !startDate || !endDate) {
      alert('Please fill all fields');
      return;
    }

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'approved_leaves'), {
        userName,
        userId: allUsers.find(u => u.fullName === userName)?.id || '',
        role: allUsers.find(u => u.fullName === userName)?.role || '',
        startDate,
        endDate,
        reason: reason || '',
        approvedAt: serverTimestamp(),
        approvedBy: appUser.name,
        type: 'DIRECT' // REQUESTED or DIRECT
      });
      alert('Leave granted successfully!');
    } catch (e) {
      console.error('Error granting leave:', e);
      alert('Failed to grant leave');
    }
  };

  const deleteApprovedLeave = async (leaveId, userName) => {
    if (confirm(`Delete approved leave for ${userName}? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'approved_leaves', leaveId));
        alert('Leave deleted successfully!');
      } catch (e) {
        console.error('Error deleting leave:', e);
        alert('Failed to delete leave');
      }
    }
  };

  // Handle logout on browser close or shutdown
  useEffect(() => {
    // Session now persists across browser closes
    // Only explicit logout button clears the session
    // No beforeunload or pagehide handlers needed
  }, [appUser]);

  // Fetch misc costs for accounting
  useEffect(() => {
    if (!appUser || (appUser.role !== ROLES.ADMIN && appUser.role !== ROLES.ACCOUNTS)) return;
    
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
    if (data.familyGroupId && ![ROLES.SALES, ROLES.ADMIN].includes(appUser.role)) {
      alert('Only Sales Representatives can add files to a family group.');
      return false;
    }
    if (data.familyGroupId && (data.fileType || FILE_TYPES.VISA) !== FILE_TYPES.VISA) {
      alert('Family groups can only contain Visa files.');
      return false;
    }
    if (data.createFamilyGroup && !data.familyGroupId) {
      alert('Could not create the family group ID. Please try again.');
      return false;
    }
    
    // Validate and sanitize input data
    const validation = validateFileData(data);
    if (!validation.isValid) {
      const errorList = Object.entries(validation.errors)
        .map(([field, error]) => `${field}: ${error}`)
        .join('\n');
      alert(`Validation errors:\n${errorList}`);
      return;
    }

    const fileId = data.fileId || `VT-${Math.floor(10000 + Math.random() * 90000)}`;
    const isNewSale = appUser.role !== ROLES.PROCESSING;
    
    let newFile = {
      fileId: fileId,
      applicantName: sanitizeInput(data.applicantName, { maxLength: 100 }),
      contactNo: sanitizeInput(data.contactNo, { maxLength: 20 }),
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
        passportNo: sanitizeInput(data.passportNo, { maxLength: 30 }).toUpperCase(),
        destination: sanitizeInput(data.destination, { maxLength: 50 }),
        serviceCharge: Number(data.serviceCharge) || 0,
        cost: Number(data.cost) || 0,
        reminderDate: data.reminderDate || null,
        status: 'RECEIVED_SALES',
        visaResult: null,
        acknowledgedByProcessingAgent: false,
        ...(data.familyGroupId ? {
          familyGroupId: data.familyGroupId,
          familyGroupLabel: sanitizeInput(data.familyGroupLabel || `${data.applicantName} family`, { maxLength: 80 })
        } : {}),
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
    } else if (data.fileType === FILE_TYPES.PICK_DROP) {
      newFile = {
        ...newFile,
        pickupLocation: sanitizeInput(data.pickupLocation, { maxLength: 100 }),
        dropoffLocation: sanitizeInput(data.dropoffLocation, { maxLength: 100 }),
        numberOfPersons: Number(data.numberOfPersons) || 0,
        salePrice: Number(data.salePrice) || 0,
        costPrice: Number(data.costPrice) || 0,
        status: 'PICKUP_DROP_INITIATED',
        history: [{
          action: 'Pick & Drop Service Initiated',
          status: 'PICKUP_DROP_INITIATED',
          performedBy: appUser.name,
          timestamp: Date.now()
        }]
      };
    }

    const reviewedDuplicateFileIds = Array.isArray(data.reviewedDuplicateFileIds)
      ? [...new Set(data.reviewedDuplicateFileIds.filter(id => typeof id === 'string' && id))]
      : [];
    if (reviewedDuplicateFileIds.length > 0) {
      newFile = {
        ...newFile,
        duplicateReview: {
          matchedFileIds: reviewedDuplicateFileIds,
          reviewedBy: appUser.name,
          reviewedAt: Date.now()
        },
        history: [{
          action: `Possible duplicate reviewed; new file created after checking ${reviewedDuplicateFileIds.join(', ')}`,
          status: newFile.status,
          performedBy: appUser.name,
          timestamp: Date.now()
        }, ...newFile.history]
      };
    }

    const invoiceNumber = createInvoiceNumber(fileId);
    newFile = {
      ...newFile,
      invoiceNo: invoiceNumber,
      invoiceAmount: getInvoiceAmount(newFile),
      invoicePaymentStatus: 'Unpaid',
      invoicePaidAmount: 0,
      invoiceCreatedAt: serverTimestamp(),
      invoiceCreatedBy: appUser.name,
      statusChangedAt: serverTimestamp(),
      invoiceUpdatedAt: serverTimestamp(),
      creationRequestId: data.creationRequestId
    };

    const fileRef = doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', data.documentId);
    try {
      await runTransaction(db, async transaction => {
        const familyGroupRef = data.familyGroupId
          ? doc(db, 'artifacts', appId, 'public', 'data', 'visa_family_groups', data.familyGroupId)
          : null;
        const [existingFile, familyGroupSnapshot] = await Promise.all([
          transaction.get(fileRef),
          familyGroupRef ? transaction.get(familyGroupRef) : Promise.resolve(null)
        ]);
        if (existingFile.exists()) {
          if (existingFile.data().creationRequestId === data.creationRequestId) return;
          throw new Error('The file could not be safely created. Please try registering it again.');
        }
        if (familyGroupRef) {
          const memberFileIds = familyGroupSnapshot?.exists()
            ? familyGroupSnapshot.data().memberFileIds || []
            : [];
          if (data.createFamilyGroup) {
            if (familyGroupSnapshot?.exists()) throw new Error('This family group ID is already in use. Please try again.');
            transaction.set(familyGroupRef, {
              label: newFile.familyGroupLabel,
              createdBy: appUser.name,
              createdByUserId: appUser.id || '',
              status: 'OPEN',
              assignedAgent: '',
              memberFileIds: [fileRef.id],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } else {
            if (!familyGroupSnapshot?.exists()) throw new Error('This family group no longer exists. Refresh and select an available group.');
            const familyGroup = familyGroupSnapshot.data();
            if (familyGroup.status !== 'OPEN' || familyGroup.assignedAgent) {
              throw new Error('This family group is already assigned and locked. Ask an admin to review it.');
            }
            if (memberFileIds.length >= MAX_VISA_FAMILY_SIZE) {
              throw new Error(`A family group can contain up to ${MAX_VISA_FAMILY_SIZE} files.`);
            }
            transaction.update(familyGroupRef, {
              memberFileIds: arrayUnion(fileRef.id),
              updatedAt: serverTimestamp()
            });
          }
        }
        transaction.set(fileRef, newFile);
      });
    } catch (error) {
      console.error('Error creating file:', error);
      alert(`Failed to create file: ${error.message || 'Please try again.'}`);
      return false;
    }
    
    // Trigger new file creation animation
    triggerConfetti();
    setResultMessage(data.familyGroupId
      ? `New file created. Family Group ID: ${data.familyGroupId}`
      : '🎊 New File Created Successfully! 🎊');
    setResultModalOpen(true);
    
    setTimeout(() => {
      setActiveTab('dashboard');
    }, 1500);
    return true;
  };

  const generateInvoice = async (file, paymentStatus, paidAmount = null, paymentMethodId = '', transactionRef = '') => {
    if (!file || !file.id) return;
    const selectedMethod = paymentMethods.find(method => method.id === paymentMethodId);
    const requestedPaidAmount = paymentStatus === 'Paid'
      ? getInvoiceAmount(file) || 0
      : paymentStatus === 'Partially Paid'
        ? Math.min(Math.max(Number(paidAmount) || 0, 0), getInvoiceAmount(file) || 0)
        : 0;
    if (requestedPaidAmount > getInvoiceSummary(file).paidAmount) {
      const duplicate = findDuplicatePaymentReference(files, transactionRef);
      if (duplicate) {
        alert(getDuplicatePaymentReferenceMessage(duplicate));
        return false;
      }
    }

    try {
      const fileDoc = doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', file.id);
      const result = await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(fileDoc);
        if (!snapshot.exists()) throw new Error('Invoice file no longer exists.');
        const current = { id: snapshot.id, ...snapshot.data() };
        const amount = getInvoiceAmount(current) || 0;
        const requestedPaid = paymentStatus === 'Paid'
          ? amount
          : paymentStatus === 'Partially Paid'
            ? Math.min(Math.max(Number(paidAmount) || 0, 0), amount)
            : 0;
        const previousPaid = getInvoiceSummary(current).paidAmount;
        const resolvedPaid = Math.max(previousPaid, requestedPaid);
        const newlyCollected = Math.round(Math.max(0, resolvedPaid - previousPaid) * 100) / 100;
        if (newlyCollected > 0 && !selectedMethod) throw new Error('Select a payment method for the new payment.');
        if (newlyCollected > 0 && !transactionRef.trim()) throw new Error('Enter the payment / transaction reference for the new payment.');
        const status = resolvedPaid >= amount ? 'Paid' : resolvedPaid > 0 ? 'Partially Paid' : 'Unpaid';
        const invoiceNo = current.invoiceNo || createInvoiceNumber(current.fileId || `VT-${Date.now()}`);
        const invoicePayments = Array.isArray(current.invoicePayments) ? current.invoicePayments : Array.isArray(current.invoice?.payments) ? current.invoice.payments : [];
        const referenceRef = newlyCollected > 0
          ? doc(db, 'artifacts', appId, 'public', 'data', 'invoice_payment_refs', getPaymentReferenceDocumentId(transactionRef))
          : null;
        const referenceSnapshot = referenceRef ? await transaction.get(referenceRef) : null;
        if (referenceSnapshot?.exists()) {
          const referenceFileId = referenceSnapshot.data().fileId || referenceSnapshot.data().fileDocId || 'another file';
          throw new Error(`This transaction reference was already used on file ${referenceFileId}. Enter a unique reference.`);
        }
        const shouldNotifyCash = newlyCollected > 0 && isCashPaymentMethod(selectedMethod);
        const recipients = Array.isArray(cashPaymentNotificationEmails) ? cashPaymentNotificationEmails : [];
        const mailRef = shouldNotifyCash && recipients.length > 0 ? doc(collection(db, 'mail')) : null;
        const payment = newlyCollected > 0 ? {
          id: `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          amount: newlyCollected,
          receivedAt: Timestamp.now(),
          receivedBy: appUser.name,
          methodId: selectedMethod.id,
          methodName: selectedMethod.name || '',
          institution: selectedMethod.institution || '',
          accountName: selectedMethod.accountName || '',
          accountNumber: selectedMethod.accountNumber || '',
          transactionRef: transactionRef.trim()
        } : null;
        const invoiceData = {
          invoiceNo,
          invoiceAmount: amount,
          invoicePaymentStatus: status,
          invoicePaidAmount: resolvedPaid,
          invoiceCreatedBy: current.invoiceCreatedBy || current.invoice?.invoiceCreatedBy || appUser.name,
          invoiceUpdatedAt: serverTimestamp(),
          ...(payment ? { invoicePayments: [...invoicePayments, payment] } : {})
        };
        transaction.update(fileDoc, invoiceData);
        if (referenceRef && payment) {
          transaction.set(referenceRef, {
            transactionRef: payment.transactionRef,
            normalizedReference: normalizePaymentReference(payment.transactionRef),
            paymentId: payment.id,
            fileDocId: current.id,
            fileId: current.fileId || current.id,
            amount: payment.amount,
            createdAt: serverTimestamp()
          });
        }
        if (mailRef && payment) {
          transaction.set(mailRef, { ...buildCashPaymentMail(current, payment, recipients), createdAt: serverTimestamp() });
        }
        return {
          file: { ...current, ...invoiceData },
          invoice: { ...invoiceData, amount, paidAmount: resolvedPaid, paymentStatus: status },
          cashNotificationMissingRecipients: shouldNotifyCash && recipients.length === 0
        };
      });
      setFiles(prev => prev.map(item => item.id === file.id ? result.file : item));
      printInvoiceCopies(result.file, result.invoice);
      setResultMessage(`Invoice ${result.invoice.invoiceNo} has been prepared.${result.cashNotificationMissingRecipients ? ' Cash payment was recorded, but no notification recipient emails are configured.' : ''}`);
      setResultModalOpen(true);
      return true;
    } catch (err) {
      console.error('Error updating invoice:', err);
      alert(`Failed to save invoice details: ${err.message || 'See console for details.'}`);
      return false;
    }
  };

  const requestDeleteFile = (fileId) => { setFileToDelete(fileId); setDeleteConfirmOpen(true); };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      const fileRef = doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', fileToDelete);
      await runTransaction(db, async transaction => {
        const fileSnapshot = await transaction.get(fileRef);
        if (!fileSnapshot.exists()) return;
        const familyGroupId = fileSnapshot.data().familyGroupId;
        const familyGroupRef = familyGroupId
          ? doc(db, 'artifacts', appId, 'public', 'data', 'visa_family_groups', familyGroupId)
          : null;
        const familyGroupSnapshot = familyGroupRef ? await transaction.get(familyGroupRef) : null;
        transaction.delete(fileRef);
        if (familyGroupSnapshot?.exists()) {
          const remainingMemberIds = (familyGroupSnapshot.data().memberFileIds || []).filter(id => id !== fileToDelete);
          if (remainingMemberIds.length === 0) transaction.delete(familyGroupRef);
          else transaction.update(familyGroupRef, {
            memberFileIds: remainingMemberIds,
            updatedAt: serverTimestamp()
          });
        }
      });
      setDeleteConfirmOpen(false);
      setFileToDelete(null);
    } catch (err) {
      console.error("Error deleting file:", err);
      alert(`Failed to delete file: ${err.message || 'Please try again.'}`);
    }
  };

  const openUpdateModal = (file, action) => { 
    setSelectedFile(file); 
    setSelectedAction(action); 
    
    // Route to specialized modals for specific statuses
    const fileType = file.fileType || FILE_TYPES.VISA; // Default to VISA if fileType is missing
    
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
    } else if (fileType === FILE_TYPES.PICK_DROP) {
      if (action === 'PICKUP_DROP_BOOKED') {
        setPickDropBookedModalOpen(true);
      } else {
        setModalOpen(true);
      }
    } else {
      // Default to generic modal for VISA and any unrecognized types
      setModalOpen(true);
    }
  };
  const openNoteModal = (file) => { setSelectedFile(file); setNoteModalOpen(true); };
  const openEditModal = (file) => { setSelectedFile(file); setEditModalOpen(true); };

  const handleStatusUpdate = async (note, result = null, newAssignee = null, reminderDate = null, cost = null, acknowledgeProcessing = false, specializedData = null, trackingData = null) => {
    if (!appUser || !selectedFile) return;
    const isVisaFile = (selectedFile.fileType || FILE_TYPES.VISA) === FILE_TYPES.VISA;
    let routedProcessingAgent = '';
    let routedWorkRank = '';
    
    let updateData = {
      updatedAt: serverTimestamp(),
      history: []
    };

    // Handle "Send to Processing" action
    if (selectedAction === 'SEND_TO_PROCESSING' && isVisaFile) {
      const assignmentStateRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'visa_assignment_dispatch');
      const destinationAgentsRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'visa_destination_agents');
      const visaWorkRanksRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'visa_work_ranks');
      try {
        await runTransaction(db, async transaction => {
          const fileRef = doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', selectedFile.id);
          const familyGroupRef = selectedFile.familyGroupId
            ? doc(db, 'artifacts', appId, 'public', 'data', 'visa_family_groups', selectedFile.familyGroupId)
            : null;
          const [fileSnapshot, assignmentStateSnapshot, destinationAgentsSnapshot, workRanksSnapshot, familyGroupSnapshot] = await Promise.all([
            transaction.get(fileRef),
            transaction.get(assignmentStateRef),
            transaction.get(destinationAgentsRef),
            transaction.get(visaWorkRanksRef),
            familyGroupRef ? transaction.get(familyGroupRef) : Promise.resolve(null)
          ]);
          if (!fileSnapshot.exists()) throw new Error('This file no longer exists.');
          const currentFile = { id: fileSnapshot.id, ...fileSnapshot.data() };
          if (currentFile.status !== 'RECEIVED_SALES') {
            throw new Error('This Visa file has already been handed off or updated. Refresh the file and try again.');
          }
          const assignmentState = assignmentStateSnapshot.exists() ? assignmentStateSnapshot.data() : {};
          const agentsByDestination = destinationAgentsSnapshot.exists()
            ? destinationAgentsSnapshot.data().agentsByDestination || {}
            : {};
          const currentWorkRanks = workRanksSnapshot.exists() ? workRanksSnapshot.data().ranks || {} : {};
          let familyMemberSnapshots = [];
          let familyDestinations = [currentFile.destination].filter(Boolean);
          let processingAgent = '';
          let familyGroupData = null;
          if (familyGroupRef) {
            if (!familyGroupSnapshot?.exists()) throw new Error('This family group no longer exists. Ask an admin to review this file.');
            familyGroupData = familyGroupSnapshot.data();
            if (familyGroupData.status === 'LOCKED' && familyGroupData.assignedAgent) {
              const lockedAgent = allUsers.find(user =>
                user.role === ROLES.PROCESSING &&
                (user.fullName || user.name || user.username) === familyGroupData.assignedAgent
              );
              if (!lockedAgent) {
                throw new Error(`This family is locked to ${familyGroupData.assignedAgent}, who is not currently an active Processing Agent. Ask an admin to review the group.`);
              }
              processingAgent = familyGroupData.assignedAgent;
            } else {
              if (familyGroupData.status !== 'OPEN' || familyGroupData.assignedAgent) {
                throw new Error('This family group is not available for handoff. Ask an admin to review it.');
              }
              const memberFileIds = familyGroupData.memberFileIds || [];
              if (!memberFileIds.includes(fileSnapshot.id)) {
                throw new Error('This file is not registered as a member of its family group. Ask an admin to review it.');
              }
              const memberRefs = memberFileIds.map(id =>
                doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', id)
              );
              familyMemberSnapshots = await Promise.all(memberRefs.map(ref => transaction.get(ref)));
              const members = familyMemberSnapshots.map(snapshot => ({ id: snapshot.id, ...snapshot.data() }));
              if (familyMemberSnapshots.some((snapshot, index) =>
                !snapshot.exists() ||
                members[index].familyGroupId !== familyGroupRef.id ||
                (members[index].fileType || FILE_TYPES.VISA) !== FILE_TYPES.VISA ||
                members[index].status !== 'RECEIVED_SALES'
              )) {
                throw new Error('Every file in a family group must still be at Sales handoff before the first member is sent to Processing.');
              }
              familyDestinations = [...new Set(members.map(member => member.destination).filter(Boolean))];
              if (!familyDestinations.length) throw new Error('Family files need valid destinations before they can be handed off.');
              processingAgent = chooseProcessingAgent(
                files,
                allUsers,
                currentWorkRanks,
                assignmentState.lastAssignedAgent || '',
                currentFile.destination,
                agentsByDestination
              );
            }
          } else {
            processingAgent = chooseProcessingAgent(
              files,
              allUsers,
              currentWorkRanks,
              assignmentState.lastAssignedAgent || '',
              currentFile.destination,
              agentsByDestination
            );
          }
          if (!processingAgent) {
            const currentDestinationRule = agentsByDestination[currentFile.destination];
            if (Array.isArray(currentDestinationRule) && currentDestinationRule.length > 0) {
              throw new Error(`No active Processing Agent is configured for ${currentFile.destination}. Ask an admin to update destination routing.`);
            }
            throw new Error('No Processing Agents are available. Ask an admin to add or reactivate a Processing Agent.');
          }
          if (familyGroupRef && familyGroupData.status === 'OPEN') {
            if (!isProcessingAgentEligibleForDestinations(processingAgent, familyDestinations, agentsByDestination)) {
              const ineligibleDestinations = familyDestinations.filter(destination => {
                const eligibleAgents = agentsByDestination[destination];
                return Array.isArray(eligibleAgents) && eligibleAgents.length > 0 && !eligibleAgents.includes(processingAgent);
              });
              throw new Error(`The system selected ${processingAgent} based on the first file, but they are not eligible for every family destination (${ineligibleDestinations.join(', ')}). No files were handed off. Ask an admin to review destination routing.`);
            }
          }

          routedProcessingAgent = processingAgent;
          routedWorkRank = currentWorkRanks[currentFile.destination] || 'Moderate';
          const docsProvided = Boolean(trackingData?.documentsProvidedToProcessing);
          const nextStatus = docsProvided ? 'HANDOVER_PROCESSING' : 'DOCS_PENDING';
          const historyItem = {
            action: `File Sent to Processing - System assigned to: ${processingAgent} (${routedWorkRank} workload) - Required documents provided: ${docsProvided ? 'Yes' : 'No'}${note ? ` - Note: ${note}` : ''}`,
            status: nextStatus,
            performedBy: appUser.name,
            timestamp: Date.now()
          };

          if (familyGroupRef && familyGroupData.status === 'OPEN') {
            transaction.update(familyGroupRef, {
              status: 'LOCKED',
              assignedAgent: processingAgent,
              destinations: familyDestinations,
              lockedAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            familyMemberSnapshots.forEach(memberSnapshot => {
              if (memberSnapshot.id !== fileSnapshot.id) {
                const member = memberSnapshot.data();
                const familyAssignmentHistory = {
                  action: `Family group locked to Processing Agent: ${processingAgent}`,
                  status: member.status,
                  performedBy: appUser.name,
                  timestamp: Date.now()
                };
                transaction.update(memberSnapshot.ref, {
                  familyGroupAssignedTo: processingAgent,
                  updatedAt: serverTimestamp(),
                  history: [familyAssignmentHistory, ...(member.history || [])]
                });
              }
            });
          }

          transaction.update(fileSnapshot.ref, {
            status: nextStatus,
            assignedTo: processingAgent,
            ...(familyGroupRef ? { familyGroupAssignedTo: processingAgent } : {}),
            assignmentMode: 'automatic',
            assignmentWorkRank: routedWorkRank,
            acknowledgedByProcessingAgent: false,
            salesRepDocumentsProvided: docsProvided,
            documentsProvidedToProcessing: docsProvided,
            updatedAt: serverTimestamp(),
            statusChangedAt: serverTimestamp(),
            history: [historyItem, ...(currentFile.history || [])]
          });
          transaction.set(assignmentStateRef, {
            lastAssignedAgent: processingAgent,
            lastAssignedAt: serverTimestamp(),
            totalAssignments: (Number(assignmentState.totalAssignments) || 0) + 1
          });
        });
      } catch (error) {
        console.error('Failed to route Visa file to Processing:', error);
        alert(`Could not hand off this file: ${error.message || 'Please try again.'}`);
        return;
      }
      setResultMessage(`File assigned to ${routedProcessingAgent} (${routedWorkRank} workload).`);
      setResultModalOpen(true);
      setModalOpen(false);
      return;
    }

    if (selectedAction === 'SEND_TO_PROCESSING') {
      if (!newAssignee) {
        alert('Select a Processing Agent to continue.');
        return;
      }
      const docsProvided = Boolean(trackingData?.documentsProvidedToProcessing);
      const newHistoryItem = {
        action: `File Sent to Processing - Assigned to: ${newAssignee} - Required documents provided to processing agent: ${docsProvided ? 'Yes' : 'No'}${note ? ` - Note: ${note}` : ''}`,
        status: docsProvided ? 'HANDOVER_PROCESSING' : 'DOCS_PENDING',
        performedBy: appUser.name,
        timestamp: Date.now()
      };
      updateData = {
        ...updateData,
        status: docsProvided ? 'HANDOVER_PROCESSING' : 'DOCS_PENDING',
        assignedTo: newAssignee,
        acknowledgedByProcessingAgent: false,
        salesRepDocumentsProvided: docsProvided,
        documentsProvidedToProcessing: docsProvided,
        history: [newHistoryItem, ...selectedFile.history]
      };
    }
    // Handle "Acknowledge Processing" action
    else if (selectedAction === 'ACKNOWLEDGE_PROCESSING') {
      const docsReceived = Boolean(trackingData?.documentsReceivedFromSales);
      const nextStatus = docsReceived ? 'HANDOVER_PROCESSING' : 'DOCS_PENDING';
      const newHistoryItem = {
        action: `Processing Agent Acknowledged - Started Processing - All required documents received from sales rep: ${docsReceived ? 'Yes' : 'No'}${note ? ` - Note: ${note}` : ''}`,
        status: nextStatus,
        performedBy: appUser.name,
        timestamp: Date.now()
      };
      updateData = {
        ...updateData,
        status: nextStatus,
        assignedTo: isVisaFile ? selectedFile.assignedTo : appUser.name,
        acknowledgedByProcessingAgent: docsReceived,
        documentsReceivedFromSalesRep: docsReceived,
        processingDocumentsReceived: docsReceived,
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
        if (specializedData.airlineSalePrice !== undefined) ticketUpdate.airlineSalePrice = Number(specializedData.airlineSalePrice) || 0;
        if (specializedData.airlineCostPrice !== undefined) ticketUpdate.airlineCostPrice = Number(specializedData.airlineCostPrice) || 0;
      }

      updateData = ticketUpdate;
    }
    // Handle Pick & Drop status updates
    else if (selectedFile.fileType === FILE_TYPES.PICK_DROP && selectedAction) {
      let actionText = `Updated to ${STATUS[selectedAction].label}`;
      const newHistoryItem = {
        action: note ? `${actionText} - Note: ${note}` : actionText,
        status: selectedAction,
        performedBy: appUser.name,
        timestamp: Date.now()
      };

      const pickDropUpdate = {
        ...updateData,
        status: selectedAction,
        history: [newHistoryItem, ...selectedFile.history]
      };

      if (specializedData) {
        if (specializedData.pickupLocation) pickDropUpdate.pickupLocation = sanitizeInput(specializedData.pickupLocation, { maxLength: 100 });
        if (specializedData.dropoffLocation) pickDropUpdate.dropoffLocation = sanitizeInput(specializedData.dropoffLocation, { maxLength: 100 });
        if (specializedData.salePrice !== undefined) pickDropUpdate.salePrice = Number(specializedData.salePrice) || 0;
        if (specializedData.costPrice !== undefined) pickDropUpdate.costPrice = Number(specializedData.costPrice) || 0;
      }

      updateData = pickDropUpdate;
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
        if (specializedData.packageSalePrice !== undefined) packageUpdate.packageSalePrice = Number(specializedData.packageSalePrice) || 0;
        if (specializedData.packageCostPrice !== undefined) packageUpdate.packageCostPrice = Number(specializedData.packageCostPrice) || 0;
      }

      updateData = packageUpdate;
    }
    // Handle regular status updates (Visa workflow)
    else if (selectedAction) {
      let actionText = `Updated status to ${STATUS[selectedAction].label}`;
      if (result) actionText = `Result Received: ${RESULTS[result].label}`;
      if (!isVisaFile && newAssignee) actionText += ` (Assigned to: ${newAssignee})`;
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
      if (!isVisaFile && newAssignee) nextAssignee = newAssignee;
      else if (!isVisaFile && selectedAction === 'HANDOVER_PROCESSING' && (!selectedFile.assignedTo || selectedFile.assignedTo === appUser.name)) nextAssignee = 'Processing Team';

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

    if (updateData.status && updateData.status !== selectedFile.status) {
      updateData.statusChangedAt = serverTimestamp();
    }

    const fileRef = doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', selectedFile.id);
    await updateDoc(fileRef, updateData);
    setModalOpen(false);
    setAirTicketBookedModalOpen(false);
    setAirTicketIssuedModalOpen(false);
    setPackageFlightIssuedModalOpen(false);
    setPackageHotelsBookedModalOpen(false);
    setPackagePickupDropoffModalOpen(false);
    setPickDropBookedModalOpen(false);
  };

  const handleAddNote = async (note) => {
    if (!appUser || !selectedFile || !note.trim()) return;
    
    // Validate and sanitize note
    const noteValidation = validateNote(note);
    if (!noteValidation.isValid) {
      alert(noteValidation.error);
      return;
    }
    
    const sanitizedNote = noteValidation.value;
    const newHistoryItem = {
      action: `Note Added: ${sanitizedNote}`,
      status: selectedFile.status,
      performedBy: appUser.name,
      timestamp: Date.now()
    };
    const fileRef = doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', selectedFile.id);
    await updateDoc(fileRef, { updatedAt: serverTimestamp(), history: [newHistoryItem, ...selectedFile.history] });
    setNoteModalOpen(false);
  };

  const handleEditFile = async (data) => {
    if (!appUser || appUser.role !== ROLES.ADMIN || !selectedFile) return;
    
    try {
      const fileRef = doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', selectedFile.id);
      
      // Convert numeric strings to numbers where needed
      let updateData = { ...data };
      
      const oldCreatedBy = selectedFile.createdBy || '';
      const newCreatedBy = data.createdBy || '';
      const oldAssignee = selectedFile.assignedTo || '';
      const newAssignee = data.assignedTo || '';
      const historyEntries = [];

      if ((selectedFile.fileType || FILE_TYPES.VISA) === FILE_TYPES.VISA && oldAssignee !== newAssignee) {
        const newAssigneeIsProcessingAgent = allUsers.some(user =>
          user.role === ROLES.PROCESSING &&
          (user.fullName || user.name || user.username) === newAssignee
        );
        if (!newAssigneeIsProcessingAgent) {
          alert('Visa files can only be assigned to a Processing Agent. Choose an agent from the list.');
          return;
        }
        updateData.assignmentMode = 'admin';
        updateData.assignmentWorkRank = visaWorkRanks[selectedFile.destination] || 'Moderate';
      }

      if (newCreatedBy && oldCreatedBy !== newCreatedBy) {
        historyEntries.push({
          status: selectedFile.status,
          timestamp: Date.now(),
          performedBy: appUser.name,
          action: `Sales Rep changed from ${oldCreatedBy} to ${newCreatedBy}`,
          note: `Sales Rep changed from ${oldCreatedBy} to ${newCreatedBy}`
        });
      }

      if (oldAssignee !== newAssignee) {
        historyEntries.push({
          status: selectedFile.status,
          timestamp: Date.now(),
          performedBy: appUser.name,
          action: `File reassigned from ${oldAssignee || 'Unassigned'} to ${newAssignee || 'Unassigned'}`
        });
      }

      if (historyEntries.length > 0) {
        updateData.history = [...historyEntries, ...(selectedFile.history || [])];
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
      } else if (selectedFile.fileType === FILE_TYPES.PICK_DROP) {
        updateData.numberOfPersons = Number(data.numberOfPersons) || 0;
        updateData.salePrice = Number(data.salePrice) || 0;
        updateData.costPrice = Number(data.costPrice) || 0;
      }
      
      updateData.updatedAt = serverTimestamp();
      
      if (oldAssignee !== newAssignee && selectedFile.familyGroupId) {
        const familyGroupRef = doc(db, 'artifacts', appId, 'public', 'data', 'visa_family_groups', selectedFile.familyGroupId);
        await runTransaction(db, async transaction => {
          const destinationAgentsRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'visa_destination_agents');
          const [groupSnapshot, destinationAgentsSnapshot] = await Promise.all([
            transaction.get(familyGroupRef),
            transaction.get(destinationAgentsRef)
          ]);
          if (!groupSnapshot.exists()) throw new Error('The family group could not be found. No files were reassigned.');
          const memberFileIds = groupSnapshot.data().memberFileIds || [];
          if (!memberFileIds.includes(selectedFile.id)) {
            throw new Error('This file is not registered as a member of its family group. No files were reassigned.');
          }
          const memberRefs = memberFileIds.map(id =>
            doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', id)
          );
          const memberSnapshots = await Promise.all(memberRefs.map(ref => transaction.get(ref)));
          if (memberSnapshots.some(snapshot => !snapshot.exists())) {
            throw new Error('A family file could not be found. No files were reassigned.');
          }
          const agentsByDestination = destinationAgentsSnapshot.exists()
            ? destinationAgentsSnapshot.data().agentsByDestination || {}
            : {};
          const groupDestinations = [...new Set(memberSnapshots.map(snapshot => snapshot.data().destination).filter(Boolean))];
          if (!isProcessingAgentEligibleForDestinations(newAssignee, groupDestinations, agentsByDestination)) {
            const ineligibleDestinations = groupDestinations.filter(destination => {
              const eligibleAgents = agentsByDestination[destination];
              return Array.isArray(eligibleAgents) && eligibleAgents.length > 0 && !eligibleAgents.includes(newAssignee);
            });
            throw new Error(`${newAssignee} is not eligible for every destination in this family (${ineligibleDestinations.join(', ')}). No files were reassigned.`);
          }
          memberSnapshots.forEach(snapshot => {
            const member = snapshot.data();
            if (snapshot.id === selectedFile.id) {
              transaction.update(snapshot.ref, {
                ...updateData,
                familyGroupAssignedTo: newAssignee,
                assignmentMode: 'admin'
              });
            } else {
              const historyItem = {
                status: member.status,
                timestamp: Date.now(),
                performedBy: appUser.name,
                action: `Family file reassigned from ${member.assignedTo || member.familyGroupAssignedTo || 'Unassigned'} to ${newAssignee}`
              };
              transaction.update(snapshot.ref, {
                assignedTo: newAssignee,
                familyGroupAssignedTo: newAssignee,
                assignmentMode: 'admin',
                updatedAt: serverTimestamp(),
                history: [historyItem, ...(member.history || [])]
              });
            }
          });
          transaction.update(familyGroupRef, {
            status: 'LOCKED',
            assignedAgent: newAssignee,
            lockedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });
      } else {
        await updateDoc(fileRef, updateData);
      }
      setEditModalOpen(false);
      alert('File updated successfully!');
    } catch (err) {
      console.error('Error updating file:', err);
      alert(`Failed to update file: ${err.message || 'Please try again.'}`);
    }
  };

  const addMiscCost = async (data) => {
    if (!appUser) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'misc_costs'), {
        description: data.description,
        amount: Number(data.amount) || 0,
        category: data.category || 'Other',
        date: data.date || getDhakaTodayString(),
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

  const saveDuplicateReview = async (pair, decision) => {
    if (appUser?.role !== ROLES.ADMIN) return false;
    const reviewRef = doc(db, 'artifacts', appId, 'public', 'data', 'file_duplicate_reviews', pair.reviewId);
    try {
      if (decision) {
        await setDoc(reviewRef, {
          fileIds: pair.fileIds,
          decision,
          reviewedBy: appUser.name,
          reviewedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await deleteDoc(reviewRef);
      }
      return true;
    } catch (error) {
      console.error('Error saving duplicate review decision:', error);
      alert(`Could not save duplicate review: ${error.message || 'Check Firestore access and try again.'}`);
      return false;
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

  return (
    <ErrorBoundary>
      <div className={`min-h-screen font-sans transition-colors duration-200 flex flex-col ${containerClass}`}>
      <nav className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b sticky top-0 z-20 print:hidden`}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`xl:hidden p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
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
               <div className="hidden xl:flex items-center gap-1">
                 <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={Layout} darkMode={darkMode}>Dashboard</NavButton>
                 {appUser.role !== ROLES.ACCOUNTS && (
                   <>
                     <NavButton active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} icon={List} darkMode={darkMode}>Pipeline</NavButton>
                     <NavButton active={activeTab === 'processing'} onClick={() => setActiveTab('processing')} icon={Activity} darkMode={darkMode}>Tracker</NavButton>
                     <NavButton active={activeTab === 'add'} onClick={() => setActiveTab('add')} icon={Plus} darkMode={darkMode}>New File</NavButton>
                   </>
                 )}
                 <div className="relative">
                   <button
                     type="button"
                     onClick={() => setMoreMenuOpen(open => !open)}
                     aria-expanded={moreMenuOpen}
                     className={`relative flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                       moreMenuOpen || ['reports', 'accounting', 'leaves', 'requests', 'duplicates', 'admin'].includes(activeTab)
                         ? (darkMode ? 'bg-slate-800 text-blue-400' : 'bg-slate-100 text-blue-600')
                         : (darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                     }`}
                   >
                     More <ChevronDown className={`h-4 w-4 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
                     {moreBadgeCount > 0 && (
                       <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                         {moreBadgeCount > 99 ? '99+' : moreBadgeCount}
                       </span>
                     )}
                   </button>
                   {moreMenuOpen && (
                     <>
                       <button
                         type="button"
                         aria-label="Close more navigation menu"
                         className="fixed inset-0 z-30 cursor-default"
                         onClick={() => setMoreMenuOpen(false)}
                       />
                       <div className={`absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border p-2 shadow-xl ${
                         darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
                       }`}>
                         <NavMenuItem id="reports" icon={Activity} label="Statistical Reports" activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('reports'); setMoreMenuOpen(false); }} />
                         {(appUser.role === ROLES.ADMIN || appUser.role === ROLES.ACCOUNTS) && (
                           <NavMenuItem id="accounting" icon={DollarSign} label="Accounting" activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('accounting'); setMoreMenuOpen(false); }} />
                         )}
                         <NavMenuItem id="leaves" icon={Calendar} label="Leaves" badge={appUser.role === ROLES.ADMIN ? leaveRequests.filter(request => request.status === 'PENDING').length : 0} activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('leaves'); setMoreMenuOpen(false); }} />
                         <NavMenuItem id="requests" icon={MessageSquare} label="Requests" badge={openRequestCount} activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('requests'); setMoreMenuOpen(false); }} />
                         {appUser.role === ROLES.ADMIN && (
                           <>
                             <NavMenuItem id="duplicates" icon={Copy} label="Duplicates" badge={possibleDuplicatePairs.filter(pair => !duplicateReviews.some(review => review.id === pair.reviewId)).length} activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('duplicates'); setMoreMenuOpen(false); }} />
                             <NavMenuItem id="admin" icon={Shield} label="Admin Panel" activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('admin'); setMoreMenuOpen(false); }} />
                           </>
                         )}
                       </div>
                     </>
                   )}
                 </div>
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
          <div className={`xl:hidden absolute top-16 left-0 w-full h-[calc(100vh-4rem)] z-50 overflow-y-auto p-4 border-t ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
             <div className="space-y-1">
                <NavItem id="dashboard" icon={Layout} label="Dashboard" activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} />
                {appUser.role !== ROLES.ACCOUNTS && (
                  <>
                    <NavItem id="pipeline" icon={List} label="Work Pipeline" activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('pipeline'); setMobileMenuOpen(false); }} />
                    <NavItem id="processing" icon={Activity} label="Processing Tracker" activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('processing'); setMobileMenuOpen(false); }} />
                    <NavItem id="add" icon={Plus} label="Register New File" activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('add'); setMobileMenuOpen(false); }} />
                    <NavItem id="reports" icon={Activity} label="Statistical Reports" activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('reports'); setMobileMenuOpen(false); }} />
                  </>
                )}
                <NavItem id="leaves" icon={Calendar} label="Leaves" activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('leaves'); setMobileMenuOpen(false); }} />
                <NavItem id="requests" icon={MessageSquare} label="Requests" activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('requests'); setMobileMenuOpen(false); }} />
                {(appUser.role === ROLES.ADMIN || appUser.role === ROLES.ACCOUNTS) && (
                  <NavItem id="accounting" icon={DollarSign} label="Accounting" activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('accounting'); setMobileMenuOpen(false); }} />
                )}
                {appUser.role === ROLES.ADMIN && (
                  <>
                    <NavItem id="duplicates" icon={Copy} label="Duplicate Review" activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('duplicates'); setMobileMenuOpen(false); }} />
                    <NavItem id="admin" icon={Shield} label="Admin Panel" activeTab={activeTab} darkMode={darkMode} onSelect={() => { setActiveTab('admin'); setMobileMenuOpen(false); }} />
                  </>
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

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full">
        {activeTab === 'dashboard' && (
          <Dashboard 
            files={files} 
            user={appUser} 
            destinations={destinations}
            allUsers={allUsers}
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
        {activeTab === 'pipeline' && (
          <PipelineView
            files={files}
            darkMode={darkMode}
            onOpenFile={(file) => {
              if (file?.fileId) {
                setSearchTerm(file.fileId);
                setActiveTab('dashboard');
              }
            }}
          />
        )}
        {activeTab === 'processing' && appUser.role !== ROLES.ACCOUNTS && (
          <ProcessingTracker
            files={files}
            darkMode={darkMode}
            isAdmin={appUser.role === ROLES.ADMIN}
            processingAgents={allUsers.filter(user => user.role === ROLES.PROCESSING)}
            visaWorkRanks={visaWorkRanks}
            onOpenFile={(file) => {
              if (file?.fileId) {
                setSearchTerm(file.fileId);
                setActiveTab('dashboard');
              }
            }}
          />
        )}
        {activeTab === 'add' && (
          <AddFileForm 
            destinations={destinations} 
            files={files}
            familyGroups={visaFamilyGroups}
            currentUser={appUser}
            onSubmit={addNewFile} 
            onCancel={() => setActiveTab('dashboard')} 
            darkMode={darkMode}
          />
        )}
        {activeTab === 'reports' && <StatisticalReports files={files} currentUser={appUser} darkMode={darkMode} onOpenInvoiceModal={(f) => { setInvoiceFile(f); setInvoiceModalOpen(true); }} />}
        {activeTab === 'accounting' && (appUser.role === ROLES.ADMIN || appUser.role === ROLES.ACCOUNTS) && (
          <AccountingPanel currentUser={appUser} files={files} miscCosts={miscCosts} paymentMethods={paymentMethods} cashPaymentNotificationEmails={cashPaymentNotificationEmails} onAddMiscCost={addMiscCost} onDeleteMiscCost={deleteMiscCost} darkMode={darkMode} isAdmin={appUser.role === ROLES.ADMIN} />
        )}
        {activeTab === 'leaves' && (
          <LeavesPanel currentUser={appUser} leaveRequests={leaveRequests} approvedLeaves={approvedLeaves} allUsers={allUsers} darkMode={darkMode} onApprove={approveLeaveRequest} onReject={rejectLeaveRequest} onGrantDirect={grantDirectLeave} onDeleteLeave={deleteApprovedLeave} onRequestLeave={() => setShowLeaveRequestModal(true)} />
        )}
        {activeTab === 'requests' && (
          <RequestsPanel currentUser={appUser} requests={fileRequests} files={files} darkMode={darkMode} onSubmit={submitFileRequest} onUpdateStatus={updateFileRequestStatus} onApprovePrice={approvePriceRequest} onOpenFile={fileId => { setSearchTerm(fileId || ''); setActiveTab('dashboard'); }} />
        )}
        {activeTab === 'admin' && appUser.role === ROLES.ADMIN && (
          <AdminPanel currentUser={appUser} destinations={destinations} visaWorkRanks={visaWorkRanks} visaDestinationAgents={visaDestinationAgents} processingAgents={allUsers.filter(agent => agent.role === ROLES.PROCESSING)} paymentMethods={paymentMethods} darkMode={darkMode} />
        )}
        {activeTab === 'duplicates' && appUser.role === ROLES.ADMIN && (
          <DuplicateReviewPanel
            files={files}
            pairs={possibleDuplicatePairs}
            reviews={duplicateReviews}
            currentUser={appUser}
            darkMode={darkMode}
            onSaveReview={saveDuplicateReview}
            onOpenFile={file => {
              setSearchTerm(file.fileId || '');
              setActiveTab('dashboard');
            }}
          />
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

      {showLeaveRequestModal && (
        <LeaveRequestModal
          isOpen={showLeaveRequestModal}
          onClose={() => setShowLeaveRequestModal(false)}
          onSubmit={handleRequestLeave}
          leaveFormData={leaveFormData}
          setLeaveFormData={setLeaveFormData}
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
          paymentMethods={paymentMethods}
          cashPaymentNotificationEmails={cashPaymentNotificationEmails}
          darkMode={darkMode}
          onGenerateInvoice={generateInvoice}
        />
      )}

      {/* Specialized Status Update Modals */}
      {airTicketBookedModalOpen && (
        <AirTicketDetailsModal
          key="booked"
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
        <AirTicketDetailsModal
          key="issued"
          issued={true}
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

      {pickDropBookedModalOpen && (
        <PickDropBookedModal
          isOpen={pickDropBookedModalOpen}
          onClose={() => setPickDropBookedModalOpen(false)}
          onConfirm={(data) => {
            handleStatusUpdate(null, null, null, null, null, false, data);
            setPickDropBookedModalOpen(false);
          }}
          file={selectedFile}
          darkMode={darkMode}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}

// --- Sub-Components ---

function NavItem({ id, icon: Icon, label, activeTab, darkMode, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
        activeTab === id
          ? (darkMode ? 'bg-slate-800 text-blue-400' : 'bg-slate-100 text-blue-600')
          : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function NavMenuItem({ id, icon: Icon, label, badge = 0, activeTab, darkMode, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
        activeTab === id
          ? (darkMode ? 'bg-slate-800 text-blue-400' : 'bg-slate-100 text-blue-600')
          : (darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50')
      }`}
    >
      <span className="flex items-center gap-3"><Icon className="h-4 w-4" />{label}</span>
      {badge > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{badge > 99 ? '99+' : badge}</span>}
    </button>
  );
}

function NavButton({ active, onClick, icon: Icon, children, darkMode, badge }) {
  const baseClass = "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative";
  const activeClass = darkMode ? "bg-slate-800 text-blue-400" : "bg-slate-100 text-blue-600";
  const inactiveClass = darkMode ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

  return (
    <button onClick={onClick} className={`${baseClass} ${active ? activeClass : inactiveClass}`}>
      <Icon className="h-4 w-4" />
      {children}
      {badge && badge > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function DuplicateReviewPanel({ pairs, reviews, currentUser, darkMode, onSaveReview, onOpenFile }) {
  const [reviewFilter, setReviewFilter] = useState('needs_review');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [savingReviewId, setSavingReviewId] = useState('');
  const reviewById = useMemo(() => new Map(reviews.map(review => [review.id, review])), [reviews]);
  const textClass = darkMode ? 'text-slate-100' : 'text-slate-900';
  const subTextClass = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass = darkMode
    ? 'bg-slate-950 border-slate-700 text-slate-100'
    : 'bg-white border-slate-300 text-slate-900';

  const counts = useMemo(() => {
    const summary = { needs_review: 0, duplicate: 0, not_duplicate: 0 };
    pairs.forEach(pair => {
      const decision = reviewById.get(pair.reviewId)?.decision;
      if (decision === 'duplicate' || decision === 'not_duplicate') summary[decision]++;
      else summary.needs_review++;
    });
    return summary;
  }, [pairs, reviewById]);

  const filteredPairs = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return pairs.filter(pair => {
      const review = reviewById.get(pair.reviewId);
      const decision = review?.decision === 'duplicate' || review?.decision === 'not_duplicate'
        ? review.decision
        : 'needs_review';
      const fileType = pair.fileA.fileType || FILE_TYPES.VISA;
      if (reviewFilter !== 'all' && decision !== reviewFilter) return false;
      if (fileTypeFilter && fileType !== fileTypeFilter) return false;
      if (normalizedSearch) {
        const searchableText = [
          pair.fileA.fileId, pair.fileA.applicantName, pair.fileA.passportNo, pair.fileA.mainPersonPassport,
          pair.fileB.fileId, pair.fileB.applicantName, pair.fileB.passportNo, pair.fileB.mainPersonPassport
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchableText.includes(normalizedSearch)) return false;
      }
      return true;
    });
  }, [pairs, reviewById, reviewFilter, fileTypeFilter, searchText]);

  const handleReview = async (pair, decision) => {
    setSavingReviewId(pair.reviewId);
    try {
      await onSaveReview(pair, decision);
    } finally {
      setSavingReviewId('');
    }
  };

  const getCreatedDate = file => {
    const date = file.createdAt?.toDate ? file.createdAt.toDate() : file.createdAt ? new Date(file.createdAt) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : 'Date unavailable';
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className={`text-2xl font-bold ${textClass}`}>Duplicate Review</h2>
        <p className={`mt-1 text-sm ${subTextClass}`}>
          Review possible matching files. Decisions are saved for this pair only; files are never merged or deleted automatically.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          ['Needs review', counts.needs_review, 'needs_review'],
          ['Confirmed duplicates', counts.duplicate, 'duplicate'],
          ['Marked as distinct', counts.not_duplicate, 'not_duplicate']
        ].map(([label, count, filter]) => (
          <button
            key={filter}
            type="button"
            onClick={() => setReviewFilter(filter)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              reviewFilter === filter
                ? 'border-blue-500 ring-2 ring-blue-500/20'
                : darkMode ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'
            } ${darkMode ? 'bg-slate-900' : 'bg-white'}`}
          >
            <span className={`block text-sm ${subTextClass}`}>{label}</span>
            <span className={`mt-1 block text-2xl font-bold ${textClass}`}>{count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex-1">
          <span className="sr-only">Search duplicate candidates</span>
          <input
            type="search"
            value={searchText}
            onChange={event => setSearchText(event.target.value)}
            placeholder="Search file ID, name, or passport"
            className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`}
          />
        </label>
        <label>
          <span className="sr-only">Filter by file type</span>
          <select
            value={fileTypeFilter}
            onChange={event => setFileTypeFilter(event.target.value)}
            className={`w-full sm:w-48 rounded-lg border px-3 py-2 text-sm ${inputClass}`}
          >
            <option value="">All file types</option>
            {Object.values(FILE_TYPES).map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by review status</span>
          <select
            value={reviewFilter}
            onChange={event => setReviewFilter(event.target.value)}
            className={`w-full sm:w-48 rounded-lg border px-3 py-2 text-sm ${inputClass}`}
          >
            <option value="needs_review">Needs review</option>
            <option value="duplicate">Confirmed duplicate</option>
            <option value="not_duplicate">Marked as distinct</option>
            <option value="all">All candidates</option>
          </select>
        </label>
      </div>

      <p className={`text-sm ${subTextClass}`}>Showing {filteredPairs.length} of {pairs.length} possible matching pairs.</p>

      {filteredPairs.length === 0 ? (
        <div className={`rounded-xl border p-8 text-center ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <p className={`font-medium ${textClass}`}>
            {pairs.length === 0 ? 'No possible duplicate pairs found.' : 'No pairs match these filters.'}
          </p>
          <p className={`mt-1 text-sm ${subTextClass}`}>Possible matches are based on the identifiers and service details available on each file.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPairs.map(pair => {
            const review = reviewById.get(pair.reviewId);
            const isSaving = savingReviewId === pair.reviewId;
            const decision = review?.decision;
            const statusLabel = decision === 'duplicate'
              ? 'Confirmed duplicate'
              : decision === 'not_duplicate'
                ? 'Marked as distinct'
                : 'Needs review';
            const statusStyle = decision === 'duplicate'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
              : decision === 'not_duplicate'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200';

            return (
              <article key={pair.reviewId} className={`rounded-xl border p-4 sm:p-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}>{statusLabel}</span>
                  {review?.reviewedBy && (
                    <span className={`text-xs ${subTextClass}`}>
                      Reviewed by {review.reviewedBy}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[pair.fileA, pair.fileB].map(file => (
                    <div key={file.id} className={`rounded-lg border p-4 ${darkMode ? 'border-slate-700 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-semibold ${textClass}`}>{file.fileId || 'No file ID'} · {file.applicantName || 'Unknown applicant'}</p>
                          <p className={`mt-1 text-xs ${subTextClass}`}>
                            {file.fileType || FILE_TYPES.VISA} · {STATUS[file.status]?.label || file.status || 'Unknown status'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenFile(file)}
                          className="shrink-0 rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                        >
                          Open file
                        </button>
                      </div>
                      <dl className={`mt-3 space-y-1 text-xs ${subTextClass}`}>
                        <div>Created: {getCreatedDate(file)}</div>
                        <div>Created by: {file.createdBy || 'Unknown'} · Assigned to: {file.assignedTo || 'Unassigned'}</div>
                        {(file.passportNo || file.mainPersonPassport) && <div>Passport: {file.passportNo || file.mainPersonPassport}</div>}
                        {file.destination && <div>Destination: {file.destination}</div>}
                        {file.packageCountries?.length > 0 && <div>Countries: {file.packageCountries.join(', ')}</div>}
                        {file.airlineRoute && <div>Route: {file.airlineRoute}</div>}
                        {(file.pickupLocation || file.dropoffLocation) && <div>Journey: {file.pickupLocation || '—'} → {file.dropoffLocation || '—'}</div>}
                        <div>Contact: {file.contactNo || 'Unknown'}</div>
                      </dl>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className={`text-xs ${subTextClass}`}>
                    Matching criteria: {pair.fileA.fileType || FILE_TYPES.VISA}. {review ? `Last reviewed by ${review.reviewedBy || currentUser.name}.` : 'Confirm whether these are the same service.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {review && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleReview(pair, null)}
                        className={`rounded-lg border px-3 py-2 text-sm disabled:opacity-50 ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-50'}`}
                      >
                        Reopen review
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleReview(pair, 'not_duplicate')}
                      className={`rounded-lg border px-3 py-2 text-sm disabled:opacity-50 ${darkMode ? 'border-green-800 text-green-300 hover:bg-green-950/30' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
                    >
                      Not a duplicate
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleReview(pair, 'duplicate')}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Confirm duplicate
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Dashboard({ files, user, destinations, onOpenUpdateModal, onOpenNoteModal, onOpenEditModal, searchTerm, setSearchTerm, setActiveTab, myTasks, onDeleteFile, darkMode, onOpenInvoiceModal, allUsers }) {
  const [destFilter, setDestFilter] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [showIncompleteCosts, setShowIncompleteCosts] = useState(false);
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showLowCostOnly, setShowLowCostOnly] = useState(false);
  const [registeredByFilter, setRegisteredByFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const isAdmin = user?.role === ROLES.ADMIN;
  const activeFilterCount = [
    destFilter,
    fileTypeFilter,
    showIncompleteCosts,
    showLowCostOnly,
    ...(isAdmin ? [dateFromFilter, dateToFilter, registeredByFilter, statusFilter] : [])
  ].filter(Boolean).length;
  const activeTasks = useMemo(
    () => myTasks.filter(task => task?.status && !isFileCompleted(task)),
    [myTasks]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [destFilter, fileTypeFilter, showIncompleteCosts, dateFromFilter, dateToFilter, showLowCostOnly, registeredByFilter, statusFilter, searchTerm]);

  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  // Calculate honors board metrics - clean rebuild with proper logic
  const honorsMetrics = useMemo(() => {
    const HONORS_START_DATE = new Date(2025, 11, 16); // Reset point: Dec 16, 2025
    
    // Get current Dhaka date
    const now = getDhakaDate();
    const monthString = `${now.getFullYear()}-${now.getMonth()}`;
    
    // Helper to create month string from date object
    const getMonthString = (date) => `${date.getFullYear()}-${date.getMonth()}`;

    // Current Dhaka Y/M/D parts
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Build user roles map
    const userRoles = {};
    allUsers.forEach(u => {
      const userName = u.name || u.fullName;
      if (userName) userRoles[userName] = u.role;
    });
    
    // ===== CATEGORY 3: BEST SALES =====
    let bestSales = { user: 'N/A', count: 0 };
    const salesCounts = {};
    
    files.forEach(file => {
      const createdDate = toDhakaTime(file.createdAt);
      if (!createdDate || createdDate < HONORS_START_DATE || file.isNewSale === false) return;
      
      const fileMonthString = getMonthString(createdDate);
      if (fileMonthString !== monthString) return;
      
      const user = file.createdBy;
      if (!user) return;
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
      const completionEvent = (file.history || []).find(entry => {
        if (!isFileCompletedAtStatus(file, entry.status)) return false;
        const completedAt = getTimestampDate(entry.timestamp);
        if (!completedAt) return false;
        const completedDate = new Date(completedAt.getTime() + 6 * 60 * 60 * 1000);
        return completedDate >= HONORS_START_DATE &&
          getMonthString(completedDate) === monthString &&
          userRoles[entry.performedBy] === ROLES.PROCESSING;
      });
      if (!completionEvent) return;

      const user = completionEvent.performedBy;
      processingCounts[user] = (processingCounts[user] || 0) + 1;
    });
    
    Object.entries(processingCounts).forEach(([user, count]) => {
      if (count > bestProcessing.count) {
        bestProcessing = { user, count };
      }
    });
    
    return {
      bestSales,
      bestProcessing
    };
  }, [files, allUsers]);

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
      if (f.status !== 'RECEIVED_SALES' && !isFileCompleted(f)) {
        inProcess++;
      }
      const submittedAction = f.history.find(h => h.status === 'SUBMITTED' && h.timestamp >= today.getTime());
      if (submittedAction) submittedToday++;
    });

    return { 
      salesToday, 
      submittedToday, 
      inProcess
    };
  }, [files, isFileCompleted]);

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
            // Validate date format before parsing
            const validation = validateDateFormat(f.reminderDate);
            if (!validation.isValid) {
              console.warn(`Invalid reminder date for file ${f.fileId}: "${f.reminderDate}" - ${validation.error}`);
              return null;
            }
            
            // Parse YYYY-MM-DD to Local Date to avoid UTC timezone issues
            const rDate = parseDateSafe(f.reminderDate);
            return rDate ? { ...f, rDate } : null;
        })
        .filter(f => f !== null && f.rDate >= today) // Strict filter: Must be valid and today or future
        .sort((a, b) => a.rDate - b.rDate)
        .slice(0, 5); 
  }, [files]);
  
  const getFileCreatedDate = (file) => {
    if (!file.createdAt) return null;
    return file.createdAt.toDate ? file.createdAt.toDate() : new Date(file.createdAt);
  };

  const getFileSaleAndCost = (file) => {
    if (file.fileType === FILE_TYPES.VISA) {
      return { sale: Number(file.serviceCharge) || 0, cost: Number(file.cost) || 0 };
    }
    if (file.fileType === FILE_TYPES.AIR_TICKET) {
      return { sale: Number(file.airlineSalePrice) || 0, cost: Number(file.airlineCostPrice) || 0 };
    }
    if (file.fileType === FILE_TYPES.PACKAGE) {
      return { sale: Number(file.packageSalePrice) || 0, cost: Number(file.packageCostPrice) || 0 };
    }
    if (file.fileType === FILE_TYPES.PICK_DROP) {
      return { sale: Number(file.salePrice) || 0, cost: Number(file.costPrice) || 0 };
    }
    return { sale: Number(file.serviceCharge) || 0, cost: Number(file.cost) || 0 };
  };

  const registrars = Array.from(new Set(files.map(f => f.createdBy).filter(Boolean))).sort();
  const fileStatuses = Array.from(new Set(files.map(f => f.status).filter(Boolean))).sort();

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredFiles = files.filter(f => {
    // Search filter
      if (normalizedSearch) {
      const matchesSearch = 
        (f.applicantName && String(f.applicantName).toLowerCase().includes(normalizedSearch)) || 
        (f.passportNo && String(f.passportNo).trim().toLowerCase().includes(normalizedSearch)) ||
        (f.mainPersonPassport && String(f.mainPersonPassport).trim().toLowerCase().includes(normalizedSearch)) ||
        (f.destination && String(f.destination).toLowerCase().includes(normalizedSearch)) ||
        (f.familyGroupLabel && String(f.familyGroupLabel).toLowerCase().includes(normalizedSearch)) ||
        (f.familyGroupId && String(f.familyGroupId).toLowerCase().includes(normalizedSearch)) ||
        (f.fileId && String(f.fileId).toLowerCase().includes(normalizedSearch)) ||
        (f.invoiceNo && String(f.invoiceNo).toLowerCase().includes(normalizedSearch)) ||
        (f.invoice && f.invoice.invoiceNo && String(f.invoice.invoiceNo).toLowerCase().includes(normalizedSearch)) ||
        (f.invoice && f.invoice.invoiceId && String(f.invoice.invoiceId).toLowerCase().includes(normalizedSearch)) ||
        (f.invoicePaymentStatus && String(f.invoicePaymentStatus).toLowerCase().includes(normalizedSearch));
      if (!matchesSearch) return false;
    }

    // Destination filter
    if (destFilter && f.destination !== destFilter) return false;

    // File type filter
    if (fileTypeFilter && f.fileType !== fileTypeFilter) return false;

    // Cost filters
    const { cost } = getFileSaleAndCost(f);
    if (showIncompleteCosts && cost > 0) return false;
    if (showLowCostOnly) {
      if (f.fileType === FILE_TYPES.VISA) return false;
      const { sale, cost } = getFileSaleAndCost(f);
      if (sale <= 0 || cost < 0 || cost >= sale * 0.5) return false;
    }

    // Registrar and status filters (admin only)
    if (isAdmin && registeredByFilter && f.createdBy !== registeredByFilter) return false;
    if (isAdmin && statusFilter && f.status !== statusFilter) return false;

    // Date range filter (admin only)
    if (isAdmin && dateFromFilter) {
      const startDate = new Date(dateFromFilter);
      startDate.setHours(0, 0, 0, 0);
      const fileDate = getFileCreatedDate(f);
      if (!fileDate || fileDate < startDate) return false;
    }
    if (isAdmin && dateToFilter) {
      const endDate = new Date(dateToFilter);
      endDate.setHours(23, 59, 59, 999);
      const fileDate = getFileCreatedDate(f);
      if (!fileDate || fileDate > endDate) return false;
    }

    return true;
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
    <div className="space-y-6">
      <div className="flex flex-col gap-5">
      <div className="order-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img src={logoImage} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <h2 className={`text-xl font-bold ${textMain}`}>Dashboard</h2>
            <p className={`truncate text-xs ${textSub}`}>{COMPANY_INFO.name} · Trade License {COMPANY_INFO.tradeNum} · CAAB {COMPANY_INFO.caabNum}</p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600'}`}>
          Today · {new Intl.DateTimeFormat('en', { timeZone: 'Asia/Dhaka', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}
        </span>
      </div>

      {/* Honors Board and operational summaries */}
      <div className="order-3 space-y-4">
        <details className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <summary className={`cursor-pointer list-none px-4 py-3 text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            ⭐ Honors Board
            <span className="mt-1 block text-[11px] font-normal text-slate-500">
              Sales: {honorsMetrics.bestSales.user} · Processing: {honorsMetrics.bestProcessing.user}
            </span>
          </summary>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            {/* Best Sales */}
            <div className={`rounded-lg border p-3 ${darkMode ? 'border-purple-800/50 bg-purple-900/20' : 'border-purple-200 bg-purple-50'}`}>
              <p className={`text-[10px] font-semibold ${darkMode ? 'text-purple-400' : 'text-purple-600'} uppercase tracking-wide mb-2`}>💰 Best Sales</p>
              <p className={`text-sm font-semibold ${textMain}`}>{honorsMetrics.bestSales.user}</p>
              <p className={`text-xs ${textSub}`}>{honorsMetrics.bestSales.count} sales this month</p>
            </div>

            {/* Best Processing */}
            <div className={`rounded-lg border p-3 ${darkMode ? 'border-amber-800/50 bg-amber-900/20' : 'border-amber-200 bg-amber-50'}`}>
              <p className={`text-[10px] font-semibold ${darkMode ? 'text-amber-400' : 'text-amber-600'} uppercase tracking-wide mb-2`}>⚡ Best Processing</p>
              <p className={`text-sm font-semibold ${textMain}`}>{honorsMetrics.bestProcessing.user}</p>
              <p className={`text-xs ${textSub}`}>{honorsMetrics.bestProcessing.count} files completed this month</p>
            </div>
          </div>
        </details>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
            <div className={`px-4 py-3 border-b ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
              <h3 className={`font-semibold flex items-center gap-2 text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}><CalendarDays className="h-4 w-4"/> Upcoming Reminders</h3>
            </div>
            <div className={`divide-y max-h-64 overflow-y-auto ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {reminders.length === 0 ? (
                <p className="p-4 text-sm text-slate-400 text-center">No upcoming reminders.</p>
              ) : (
                reminders.map(r => (
                  <div key={r.id} className={`p-3 transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`} onClick={() => onOpenUpdateModal(r, r.status)}>
                    <div className="flex justify-between items-start gap-2">
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
            <div className={`px-4 py-3 border-b ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
              <h3 className={`font-semibold flex items-center gap-2 text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}><CheckSquare className="h-4 w-4"/> My Active Tasks</h3>
            </div>
            <div className={`divide-y max-h-64 overflow-y-auto ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {activeTasks.length === 0 ? (
                <p className="p-4 text-sm text-slate-400 text-center">No active files assigned to you.</p>
              ) : (
                activeTasks.map(t => (
                  <div key={t.id} className={`p-3 transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`} onClick={() => onOpenUpdateModal(t, t.status)}>
                    <div className="flex justify-between items-start gap-2">
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
            <div className={`px-4 py-3 border-b ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
              <h3 className={`font-semibold flex items-center gap-2 text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}><Clock className="h-4 w-4"/> Recent Activity</h3>
            </div>
            <div className={`divide-y max-h-64 overflow-y-auto ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {recentActivity.length === 0 ? (
                <p className="p-4 text-sm text-slate-400 text-center">No recent activity.</p>
              ) : (
                recentActivity.map((act, idx) => (
                  <div key={idx} className="p-3">
                    <p className={`text-sm ${textMain}`}><span className="font-medium">{act.performedBy}</span> {(act.action || act.note || '').split(' - ')[0]}</p>
                    <div className="flex justify-between items-center mt-1 gap-2">
                      <span className="truncate text-xs text-blue-500 font-medium">{act.fileId || 'N/A'} - {act.applicant}</span>
                      <span className="shrink-0 text-[10px] text-slate-400">{formatDate({seconds: act.timestamp/1000}).split(',')[1]}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="order-2 space-y-5">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${cardClass}`}>
          <div>
            <p className={`text-xs font-medium ${textSub}`}>Sales Today</p>
            <p className={`text-2xl font-bold ${textMain}`}>{stats.salesToday}</p>
          </div>
          <div className={`${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'} p-2 md:p-3 rounded-full w-fit`}><TrendingUp className="h-5 md:h-6 w-5 md:w-6"/></div>
        </div>
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${cardClass}`}>
          <div>
            <p className={`text-xs font-medium ${textSub}`}>In Processing</p>
            <p className={`text-2xl font-bold ${textMain}`}>{stats.inProcess}</p>
          </div>
          <div className={`${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'} p-2 md:p-3 rounded-full w-fit`}><Activity className="h-5 md:h-6 w-5 md:w-6"/></div>
        </div>
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${cardClass}`}>
          <div>
            <p className={`text-xs font-medium ${textSub}`}>Submitted Today</p>
            <p className={`text-2xl font-bold ${textMain}`}>{stats.submittedToday}</p>
          </div>
          <div className={`${darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-600'} p-2 md:p-3 rounded-full w-fit`}><Send className="h-5 md:h-6 w-5 md:w-6"/></div>
        </div>
        </div>

        <div className="space-y-4">
        {/* Main Feed / Search */}
        <div>
          <section className={`rounded-xl border p-4 ${cardClass}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className={`text-xl font-bold ${textMain}`}>All Files</h2>
                <p className={`text-sm ${textSub}`}>Showing {currentFiles.length} of {filteredFiles.length} files</p>
              </div>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && <span className="text-xs text-slate-500">{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active</span>}
                <button
                  type="button"
                  onClick={() => {
                    setDestFilter('');
                    setFileTypeFilter('');
                    setShowIncompleteCosts(false);
                    setShowLowCostOnly(false);
                    setDateFromFilter('');
                    setDateToFilter('');
                    setRegisteredByFilter('');
                    setStatusFilter('');
                    setSearchTerm('');
                  }}
                  disabled={activeFilterCount === 0 && !searchTerm}
                  className="text-xs font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={destFilter}
                  onChange={(e) => setDestFilter(e.target.value)}
                  className={`h-10 w-full appearance-none rounded-lg border py-2 pl-10 pr-8 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
                >
                  <option value="">All Countries</option>
                  {destinations.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  className={`h-10 w-full appearance-none rounded-lg border py-2 pl-10 pr-8 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
                >
                  <option value="">All Types</option>
                  {Object.values(FILE_TYPES).map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setShowIncompleteCosts(!showIncompleteCosts)}
                aria-pressed={showIncompleteCosts}
                className={`h-10 rounded-lg border px-3 text-sm font-medium transition-colors ${
                  showIncompleteCosts
                    ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                    : darkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-300 bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                ⚠️ Incomplete Costs
              </button>
              <div className="relative sm:col-span-2 xl:col-span-3">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ID, name, passport..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`h-10 w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
                />
              </div>
            </div>

            <details className={`mt-3 border-t pt-3 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <summary className={`cursor-pointer select-none text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Advanced filters{isAdmin ? ' · dates, registrar, status, low cost' : ' · low cost'}
              </summary>
              <div className={`mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 ${isAdmin ? 'xl:grid-cols-3' : ''}`}>
                {isAdmin && (
                  <>
                    <label className="space-y-1 text-xs text-slate-500">
                      <span>Created from</span>
                      <input type="date" value={dateFromFilter} onChange={(e) => setDateFromFilter(e.target.value)} className={`h-10 w-full rounded-lg border px-3 text-sm ${inputClass}`} />
                    </label>
                    <label className="space-y-1 text-xs text-slate-500">
                      <span>Created to</span>
                      <input type="date" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)} className={`h-10 w-full rounded-lg border px-3 text-sm ${inputClass}`} />
                    </label>
                    <select
                      value={registeredByFilter}
                      onChange={(e) => setRegisteredByFilter(e.target.value)}
                      aria-label="Filter by registrar"
                      className={`h-10 w-full rounded-lg border px-3 text-sm ${inputClass}`}
                    >
                      <option value="">All Registrars</option>
                      {registrars.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      aria-label="Filter by status"
                      className={`h-10 w-full rounded-lg border px-3 text-sm ${inputClass}`}
                    >
                      <option value="">All Statuses</option>
                      {fileStatuses.map(status => <option key={status} value={status}>{STATUS[status]?.label || status}</option>)}
                    </select>
                  </>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowLowCostOnly(!showLowCostOnly)}
                    aria-pressed={showLowCostOnly}
                    className={`h-10 rounded-lg border px-3 text-sm font-medium transition-colors ${
                      showLowCostOnly
                        ? 'border-amber-600 bg-amber-600 text-white hover:bg-amber-700'
                        : darkMode
                        ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'border-slate-300 bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    📉 Low Cost
                  </button>
                )}
              </div>
            </details>
          </section>

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

        </div>
      </div>
      </div>
    </div>
  );
}

function AddFileForm({ onSubmit, onCancel, destinations, files, familyGroups = [], currentUser, darkMode }) {
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
    mainPersonPassport: '',
    // Pick & Drop fields
    pickupLocation: '',
    dropoffLocation: '',
    salePrice: '',
    costPrice: ''
  });
  const [countries, setCountries] = useState([]);
  const [possibleDuplicates, setPossibleDuplicates] = useState(null);
  const [familyGroupSelection, setFamilyGroupSelection] = useState('');
  const [familyGroupSearch, setFamilyGroupSearch] = useState('');
  const [familyGroupLabel, setFamilyGroupLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pendingCreationRef = useRef(null);
  const submittingRef = useRef(false);

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
  const openFamilyGroups = familyGroups.filter(group =>
    group.status === 'OPEN' &&
    !group.assignedAgent &&
    (group.memberFileIds || []).length < MAX_VISA_FAMILY_SIZE
  );
  const matchingFamilyGroups = familyGroupSearch.trim().length >= 3
    ? openFamilyGroups
      .filter(group => group.id.toLowerCase().includes(familyGroupSearch.trim().toLowerCase()))
      .slice(0, 5)
    : [];
  const selectedFamilyGroup = openFamilyGroups.find(group => group.id === familyGroupSelection);
  const canManageFamilyGroups = [ROLES.SALES, ROLES.ADMIN].includes(currentUser?.role);

  const handleFileTypeChange = (type) => {
    setFileType(type);
    if (type !== FILE_TYPES.VISA) {
      setFamilyGroupSelection('');
      setFamilyGroupSearch('');
    }
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

  const handleSubmit = async (e, reviewedFileIds = null) => {
    e?.preventDefault();
    if (submittingRef.current) return;

    const currentFormData = { ...formData, fileType };
    if (
      fileType === FILE_TYPES.VISA &&
      familyGroupSearch.trim() &&
      familyGroupSelection !== 'CREATE' &&
      !selectedFamilyGroup
    ) {
      alert('Search for a valid open Family Group ID and select it, or clear the search to create an individual file.');
      return;
    }
    const matches = findPossibleFileDuplicates(currentFormData, files);
    const matchingIds = matches.map(file => file.id).filter(Boolean).sort();
    const approvedIds = reviewedFileIds ? [...reviewedFileIds].sort() : null;
    const confirmationMatchesCurrent = approvedIds &&
      approvedIds.length === matchingIds.length &&
      approvedIds.every((id, index) => id === matchingIds[index]);

    if (matchingIds.length > 0 && !confirmationMatchesCurrent) {
      setPossibleDuplicates(matches);
      return;
    }

    setPossibleDuplicates(null);
    if (!pendingCreationRef.current) {
      const documentId = doc(collection(db, 'artifacts', appId, 'public', 'data', 'visa_files')).id;
      pendingCreationRef.current = {
        documentId,
        creationRequestId: documentId,
        fileId: `VT-${Math.floor(10000 + Math.random() * 90000)}`
      };
    }
    const familyGroupId = fileType !== FILE_TYPES.VISA
      ? ''
      : familyGroupSelection === 'CREATE'
        ? pendingCreationRef.current.familyGroupId || (pendingCreationRef.current.familyGroupId = doc(collection(db, 'artifacts', appId, 'public', 'data', 'visa_family_groups')).id)
        : familyGroupSelection;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const created = await onSubmit({
        ...currentFormData,
        ...pendingCreationRef.current,
        familyGroupId,
        familyGroupLabel: familyGroupSelection === 'CREATE' ? familyGroupLabel.trim() || `${formData.applicantName.trim()} family` : (
          familyGroups.find(group => group.id === familyGroupId)?.label || ''
        ),
        createFamilyGroup: familyGroupSelection === 'CREATE',
        reviewedDuplicateFileIds: matchingIds
      });
      if (created) {
        pendingCreationRef.current = null;
        if (familyGroupSelection === 'CREATE') setFamilyGroupSelection(familyGroupId);
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
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
              {canManageFamilyGroups && <div className="col-span-1 sm:col-span-2 rounded-lg border border-blue-200 p-4 dark:border-blue-900">
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Family / Group (Optional)</label>
                <p className="mb-3 text-xs text-slate-500">
                Each family group gets a unique ID. Enter or paste the ID here to find an open group. Only matching results are shown.
                </p>
                {familyGroupSelection !== 'CREATE' && (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="search"
                        value={familyGroupSearch}
                        onChange={event => {
                          setFamilyGroupSearch(event.target.value);
                          setFamilyGroupSelection('');
                        }}
                        placeholder="Enter Family Group ID"
                        className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm ${inputClass}`}
                        aria-label="Search Family Group ID"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFamilyGroupSelection('CREATE');
                          setFamilyGroupSearch('');
                        }}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        Create New Group
                      </button>
                      {familyGroupSelection && (
                        <button
                          type="button"
                          onClick={() => {
                            setFamilyGroupSelection('');
                            setFamilyGroupSearch('');
                          }}
                          className={`rounded-lg border px-3 py-2 text-sm ${inputClass}`}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {familyGroupSearch.trim().length > 0 && familyGroupSearch.trim().length < 3 && (
                      <p className="mt-2 text-xs text-slate-500">Enter at least 3 characters of the group ID to search.</p>
                    )}
                    {familyGroupSearch.trim().length >= 3 && matchingFamilyGroups.length === 0 && (
                      <p className="mt-2 text-xs text-amber-600">No open family group matches that ID.</p>
                    )}
                    {matchingFamilyGroups.length > 0 && !selectedFamilyGroup && (
                      <div className={`mt-2 divide-y rounded-lg border ${darkMode ? 'divide-slate-800 border-slate-700' : 'divide-slate-200 border-slate-200'}`}>
                        {matchingFamilyGroups.map(group => (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => {
                              setFamilyGroupSelection(group.id);
                              setFamilyGroupSearch(group.id);
                            }}
                            className={`flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                          >
                            <span className="font-mono font-semibold text-indigo-500">{group.id}</span>
                            <span className="text-xs text-slate-500">
                              {group.label} · {(group.memberFileIds || []).length} existing {(group.memberFileIds || []).length === 1 ? 'file' : 'files'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {selectedFamilyGroup && (
                  <div className={`mt-3 rounded-lg border p-3 ${darkMode ? 'border-indigo-800 bg-indigo-950/30' : 'border-indigo-200 bg-indigo-50'}`}>
                    <p className="text-xs text-slate-500">Selected Family Group ID</p>
                    <p className="font-mono font-semibold text-indigo-600 dark:text-indigo-300">{selectedFamilyGroup.id}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedFamilyGroup.label} · {(selectedFamilyGroup.memberFileIds || []).length} existing {(selectedFamilyGroup.memberFileIds || []).length === 1 ? 'file' : 'files'}
                    </p>
                  </div>
                )}
                {familyGroupSelection === 'CREATE' && (
                  <>
                    <input
                      type="text"
                      maxLength={80}
                      value={familyGroupLabel}
                      onChange={event => setFamilyGroupLabel(event.target.value)}
                      placeholder={`${formData.applicantName || 'Family'} family (optional label)`}
                      className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`}
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">The Group ID is generated when you register this file.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setFamilyGroupSelection('');
                          setFamilyGroupLabel('');
                        }}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
                {selectedFamilyGroup && (
                  <p className="mt-2 text-xs text-slate-500">
                    This file will be linked to the selected unassigned group. The system selects an agent using the first handed-off file’s destination and workload, not the family membership. It must also be eligible for every group destination or the handoff is blocked. You cannot add members after the first handoff.
                  </p>
                )}
                {familyGroupSelection === 'CREATE' && (
                  <p className="mt-2 text-xs text-slate-500">
                    Create this group on the first family member’s file, then search for its generated ID for each additional member. Each person keeps a separate VT ID, invoice, and status. Maximum {MAX_VISA_FAMILY_SIZE} files per group.
                  </p>
                )}
              </div>}
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

          {fileType === FILE_TYPES.PICK_DROP && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Pickup Location</label>
                <input 
                  required
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                  placeholder="e.g., Hotel ABC, Dhaka"
                  value={formData.pickupLocation}
                  onChange={e => setFormData({...formData, pickupLocation: e.target.value})}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Dropoff Location</label>
                <input 
                  required
                  className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base ${inputClass}`}
                  placeholder="e.g., Hazrat Shahjalal Airport"
                  value={formData.dropoffLocation}
                  onChange={e => setFormData({...formData, dropoffLocation: e.target.value})}
                />
              </div>

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
                    value={formData.salePrice}
                    onChange={e => setFormData({...formData, salePrice: e.target.value})}
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
                    value={formData.costPrice}
                    onChange={e => setFormData({...formData, costPrice: e.target.value})}
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
        
        {possibleDuplicates && (
          <div className={`rounded-lg border p-4 space-y-3 ${darkMode ? 'border-amber-700 bg-amber-950/30' : 'border-amber-300 bg-amber-50'}`} role="alert">
            <div>
              <h3 className={`font-semibold ${darkMode ? 'text-amber-200' : 'text-amber-900'}`}>Possible matching files found</h3>
              <p className={`text-sm mt-1 ${darkMode ? 'text-amber-100' : 'text-amber-800'}`}>
                Review these records before creating another file. A matching record may be a legitimate repeat service, so this warning does not block creation.
              </p>
            </div>
            <ul className="space-y-2">
              {possibleDuplicates.slice(0, 5).map(file => {
                const createdAt = file.createdAt?.toDate ? file.createdAt.toDate() : file.createdAt ? new Date(file.createdAt) : null;
                const createdDate = createdAt && !Number.isNaN(createdAt.getTime())
                  ? createdAt.toLocaleDateString()
                  : 'Date unavailable';
                return (
                  <li key={file.id} className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    <strong>{file.fileId || 'No file ID'}</strong> · {file.applicantName || 'Unknown applicant'} · {file.fileType || 'Visa'} · {STATUS[file.status]?.label || file.status || 'Unknown status'} · {createdDate}
                  </li>
                );
              })}
              {possibleDuplicates.length > 5 && (
                <li className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Showing 5 of {possibleDuplicates.length} possible matches.
                </li>
              )}
            </ul>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPossibleDuplicates(null)}
                className={`px-4 py-2 rounded-lg text-sm ${darkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                Review details
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(null, possibleDuplicates.map(file => file.id).filter(Boolean))}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                Create Anyway
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className={`px-6 py-2 rounded-lg ${darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>Cancel</button>
          <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? 'Registering…' : 'Register File'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PipelineView({ files, darkMode, onOpenFile }) {
  const [filterCreatedBy, setFilterCreatedBy] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const groupedFiles = useMemo(() => {
    const groups = {};
    files.forEach(f => {
      if (isFileCompleted(f)) return;
      
      // Apply filters
      if (filterCreatedBy !== 'ALL' && f.createdBy !== filterCreatedBy) return;
      if (filterStatus !== 'ALL' && f.status !== filterStatus) return;
      
      const assignee = f.assignedTo || 'Unassigned';
      if (!groups[assignee]) groups[assignee] = [];
      groups[assignee].push(f);
    });
    return groups;
  }, [files, filterCreatedBy, filterStatus]);

  // Get unique creators and statuses for filter dropdowns
  const creators = useMemo(() => {
    const unique = new Set(files.map(f => f.createdBy).filter(Boolean));
    return Array.from(unique).sort();
  }, [files]);

  const statuses = useMemo(() => {
    const unique = new Set(files.filter(f => !isFileCompleted(f)).map(f => f.status));
    return Array.from(unique).sort();
  }, [files]);
  const visibleFileCount = Object.values(groupedFiles).reduce((count, userFiles) => count + userFiles.length, 0);

  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const columnClass = darkMode ? 'bg-slate-900/50' : 'bg-slate-100';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-800';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={`text-2xl font-bold ${textMain}`}>Work Pipeline</h2>
          <p className="text-slate-500">Current workload distribution by employee</p>
        </div>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {visibleFileCount} active files · {Object.keys(groupedFiles).length} assignees
        </p>
      </div>

      <div className={`flex flex-wrap gap-3 rounded-xl border p-3 ${cardClass}`}>
        <select 
          value={filterCreatedBy}
          onChange={(e) => setFilterCreatedBy(e.target.value)}
          className={`min-w-48 flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
        >
          <option value="ALL">All Users</option>
          {creators.map(creator => (
            <option key={creator} value={creator}>{creator}</option>
          ))}
        </select>

        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`min-w-48 flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
        >
          <option value="ALL">All Statuses</option>
          {statuses.map(status => (
            <option key={status} value={status}>{STATUS[status]?.label || status}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 pb-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Object.entries(groupedFiles).map(([user, userFiles]) => (
          <div key={user} className={`flex h-full min-w-0 max-h-[calc(100vh-200px)] flex-col rounded-xl border p-3 ${columnClass} ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
             <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <h3 className={`flex min-w-0 items-center gap-2 font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-500'}`}><User className="h-4 w-4"/></div>
                   <span className="truncate">{user}</span>
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{userFiles.length}</span>
             </div>
             
             <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
               {userFiles.map(file => (
                 <div
                   key={file.id}
                   className={`p-3 rounded-lg border transition-shadow cursor-pointer hover:ring-2 hover:ring-blue-500 ${cardClass}`}
                   onClick={() => onOpenFile?.(file)}
                   role="button"
                   tabIndex={0}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' || e.key === ' ') {
                       e.preventDefault();
                       onOpenFile?.(file);
                     }
                   }}
                 >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-mono text-slate-400">{file.fileId}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${darkMode && STATUS[file.status].darkColor ? STATUS[file.status].darkColor : STATUS[file.status].color}`}>{STATUS[file.status].label}</span>
                    </div>
                    <h4 className={`font-medium line-clamp-1 ${textMain}`}>{file.applicantName}</h4>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                       <MapPin className="h-3 w-3"/> {file.fileType === FILE_TYPES.PICK_DROP
                         ? `${file.pickupLocation || 'N/A'} → ${file.dropoffLocation || 'N/A'}`
                         : file.destination || 'N/A'}
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

function ProcessingTracker({ files, darkMode, onOpenFile, isAdmin, processingAgents, visaWorkRanks }) {
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [now, setNow] = useState(null);

  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    const initialTimer = setTimeout(updateClock, 0);
    const timer = setInterval(updateClock, 60_000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, []);

  const trackedFiles = useMemo(() => files
    .filter(file => {
      if (!file.status) return false;
      return file.status !== 'RECEIVED_SALES' && !isFileCompleted(file);
    })
    .map(file => {
      let statusDate = getTimestampDate(file.statusChangedAt);
      if (!statusDate) {
        const statusHistory = (file.history || [])
          .filter(entry =>
            entry.status === file.status &&
            !entry.action?.startsWith('Note Added:') &&
            !entry.action?.startsWith('Sales Rep changed')
          )
          .map(entry => getTimestampDate(entry.timestamp))
          .filter(Boolean)
          .sort((a, b) => b.getTime() - a.getTime());
        statusDate = statusHistory[0] || getTimestampDate(file.createdAt);
      }
      const daysInStatus = statusDate && now !== null
        ? Math.floor(Math.max(0, now - statusDate.getTime()) / 86_400_000)
        : null;
      return { ...file, statusDate, daysInStatus };
    })
    .sort((a, b) => (b.daysInStatus ?? -1) - (a.daysInStatus ?? -1)), [files, now]);

  const assignees = Array.from(new Set(trackedFiles.map(file => file.assignedTo || 'Unassigned'))).sort();
  const statuses = Array.from(new Set(trackedFiles.map(file => file.status))).sort();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleFiles = trackedFiles.filter(file => {
    if (assigneeFilter && (file.assignedTo || 'Unassigned') !== assigneeFilter) return false;
    if (statusFilter && file.status !== statusFilter) return false;
    if (normalizedSearch && !`${file.fileId || ''} ${file.applicantName || ''} ${file.familyGroupLabel || ''} ${file.familyGroupId || ''}`.toLowerCase().includes(normalizedSearch)) return false;
    return true;
  });
  const agentWorkloads = useMemo(
    () => isAdmin
      ? calculateProcessingAgentWorkloads(files, processingAgents, visaWorkRanks)
      : [],
    [files, isAdmin, processingAgents, visaWorkRanks]
  );
  const stalledCount = trackedFiles.filter(file => file.daysInStatus !== null && file.daysInStatus >= 7).length;
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const inputClass = darkMode
    ? 'bg-slate-950 border-slate-700 text-slate-100'
    : 'bg-white border-slate-300 text-slate-900';

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold ${textMain}`}>Processing Tracker</h2>
        <p className={textSub}>Active files by assignee, status, and time in the current status.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={`rounded-xl border p-4 ${cardClass}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide ${textSub}`}>Files in processing</p>
          <p className={`mt-1 text-2xl font-bold ${textMain}`}>{trackedFiles.length}</p>
        </div>
        <div className={`rounded-xl border p-4 ${cardClass}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide ${textSub}`}>In current status for 7+ days</p>
          <p className={`mt-1 text-2xl font-bold ${stalledCount ? 'text-amber-500' : textMain}`}>{stalledCount}</p>
        </div>
      </div>

      {isAdmin && (
        <section className={`overflow-hidden rounded-xl border ${cardClass}`}>
          <div className={`border-b px-4 py-3 ${darkMode ? 'border-slate-800 bg-slate-800/60' : 'border-slate-100 bg-slate-50'}`}>
            <h3 className={`font-semibold ${textMain}`}>Processing Agent Workload</h3>
            <p className={`mt-1 text-xs ${textSub}`}>
              Active Visa files, including reserved members of locked family groups, and weighted points used for automatic assignment (High 3, Moderate 2, Low 1).
            </p>
          </div>
          {agentWorkloads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className={darkMode ? 'bg-slate-950/50 text-slate-400' : 'bg-white text-slate-500'}>
                  <tr>
                    <th className="px-4 py-2">Processing Agent</th>
                    <th className="px-4 py-2 text-right">Assigned Visa Files</th>
                    <th className="px-4 py-2 text-right">Workload Points</th>
                  </tr>
                </thead>
                <tbody className={textMain}>
                  {agentWorkloads.map(agent => (
                    <tr key={agent.name} className={`border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                      <td className="px-4 py-3 font-medium">{agent.name}</td>
                      <td className="px-4 py-3 text-right">{agent.activeFiles}</td>
                      <td className="px-4 py-3 text-right font-semibold">{agent.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={`px-4 py-5 text-sm ${textSub}`}>No Processing Agents are currently listed.</p>
          )}
        </section>
      )}

      <div className={`grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-4 ${cardClass}`}>
        <select
          value={assigneeFilter}
          onChange={event => setAssigneeFilter(event.target.value)}
          className={`h-10 rounded-lg border px-3 py-2 text-sm ${inputClass}`}
          aria-label="Filter by assignee"
        >
          <option value="">All Assignees</option>
          {assignees.map(assignee => <option key={assignee} value={assignee}>{assignee}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
          className={`h-10 rounded-lg border px-3 py-2 text-sm ${inputClass}`}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          {statuses.map(status => <option key={status} value={status}>{STATUS[status]?.label || status}</option>)}
        </select>
        <input
          type="search"
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
          placeholder="Search file ID or customer"
          className={`h-10 rounded-lg border px-3 py-2 text-sm sm:col-span-2 ${inputClass}`}
        />
        <p className={`self-center text-xs ${textSub}`}>Showing {visibleFiles.length} of {trackedFiles.length} files</p>
      </div>

      <div className={`overflow-hidden rounded-xl border ${cardClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className={`text-xs uppercase tracking-wide ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
              <tr>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Status Since</th>
                <th className="px-4 py-3">Days Unchanged</th>
              </tr>
            </thead>
            <tbody className={textMain}>
              {visibleFiles.map(file => (
                <tr key={file.id} className={`border-t transition-colors ${darkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onOpenFile?.(file)}
                      className="font-mono text-blue-500 hover:underline"
                    >
                      {file.fileId || file.id}
                    </button>
                  </td>
                  <td className="px-4 py-3">{file.applicantName || '-'}</td>
                  <td className="px-4 py-3">{file.fileType || FILE_TYPES.VISA}</td>
                  <td className="px-4 py-3">{file.assignedTo || 'Unassigned'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${darkMode ? STATUS[file.status]?.darkColor : STATUS[file.status]?.color}`}>
                      {STATUS[file.status]?.label || file.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{file.statusDate ? file.statusDate.toLocaleDateString() : 'Unknown'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      file.daysInStatus !== null && file.daysInStatus >= 7
                        ? 'bg-amber-500/15 text-amber-500'
                        : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {file.daysInStatus === null ? 'Unknown' : `${file.daysInStatus} ${file.daysInStatus === 1 ? 'day' : 'days'}`}
                    </span>
                  </td>
                </tr>
              ))}
              {visibleFiles.length === 0 && (
                <tr>
                  <td colSpan="7" className={`px-4 py-10 text-center ${textSub}`}>
                    {trackedFiles.length === 0 ? 'No files are currently in processing.' : 'No files match these filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={`border-t px-4 py-3 text-xs ${textSub}`}>
          Showing {visibleFiles.length} of {trackedFiles.length} processing files
        </div>
      </div>
    </div>
  );
}

const REQUEST_TYPES = {
  EDIT: 'Edit file details',
  DELETE: 'Delete file',
  PRICE: 'Invoice price change',
  OTHER: 'Other'
};

const REQUEST_STATUSES = {
  OPEN: { label: 'Open', badge: 'bg-amber-500/15 text-amber-500' },
  IN_PROGRESS: { label: 'In Progress', badge: 'bg-blue-500/15 text-blue-500' },
  NEEDS_INFO: { label: 'Needs Info', badge: 'bg-purple-500/15 text-purple-500' },
  COMPLETED: { label: 'Completed', badge: 'bg-emerald-500/15 text-emerald-500' },
  REJECTED: { label: 'Rejected', badge: 'bg-red-500/15 text-red-500' }
};

function RequestsPanel({ currentUser, requests, files, darkMode, onSubmit, onUpdateStatus, onApprovePrice, onOpenFile }) {
  const isAdmin = currentUser.role === ROLES.ADMIN;
  const canRequestPrice = currentUser.role === ROLES.SALES;
  const requestTypeEntries = Object.entries(REQUEST_TYPES).filter(([key]) => key !== 'PRICE' || canRequestPrice);
  const [form, setForm] = useState({ type: 'EDIT', fileId: '', details: '', requestedAmount: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [notes, setNotes] = useState({});

  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass = darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900';
  const innerClass = darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200';

  const getTime = (request) => getTimestampDate(request.createdAt)?.getTime() || Number.MAX_SAFE_INTEGER;
  const sortedRequests = useMemo(() => [...requests].sort((a, b) => getTime(b) - getTime(a)), [requests]);
  const visibleRequests = sortedRequests.filter(r => {
    const query = searchText.trim().toLowerCase();
    if (query) {
      return [r.ticketNo, r.fileId, r.applicantName, r.createdBy].some(value => String(value || '').toLowerCase().includes(query));
    }
    if (statusFilter === 'ACTIVE') return r.status === 'OPEN' || r.status === 'IN_PROGRESS' || r.status === 'NEEDS_INFO';
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  const sendNote = async (req, status) => {
    const ok = await onUpdateStatus(req.id, status, notes[req.id] ?? '');
    if (ok) setNotes(prev => ({ ...prev, [req.id]: '' }));
  };

  const formFile = files.find(f => f.fileId === form.fileId.trim().toUpperCase());
  const formCurrentAmount = formFile ? getInvoiceAmount(formFile) : 0;
  const formNewAmount = Number(form.requestedAmount) || 0;
  const formAutoApproved = form.type === 'PRICE' && formFile && isAutoApprovableDiscount(formFile, formNewAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fileId = form.fileId.trim().toUpperCase();
    if (!files.some(f => f.fileId === fileId)) {
      setFormError('No file found with that VT ID.');
      return;
    }
    if (form.type === 'PRICE' && (!(formNewAmount > 0) || Math.abs(formNewAmount - formCurrentAmount) < 0.005)) {
      setFormError('Enter a new amount that differs from the current invoice amount.');
      return;
    }
    if (!form.details.trim()) {
      setFormError(form.type === 'PRICE' ? 'A reason is required for price changes.' : 'Please describe the change you need.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    const ok = await onSubmit({ ...form, fileId });
    setSubmitting(false);
    if (ok) setForm({ type: 'EDIT', fileId: '', details: '', requestedAmount: '' });
  };

  const filters = [['ACTIVE', 'Active'], ['OPEN', 'Open'], ['NEEDS_INFO', 'Needs Info'], ['IN_PROGRESS', 'In Progress'], ['COMPLETED', 'Completed'], ['REJECTED', 'Rejected'], ['ALL', 'All']];

  return (
    <div className="space-y-5">
      <div>
        <h2 className={`text-2xl font-bold ${textMain}`}>Requests</h2>
        <p className={textSub}>{isAdmin ? 'Review file change and delete requests from the team' : 'Ask an admin to edit or delete a file and track the outcome'}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className={`rounded-xl border p-4 space-y-3 lg:col-span-1 self-start ${cardClass}`}>
          <h3 className={`text-base font-bold ${textMain}`}>New Request</h3>
          <div>
            <label className={`mb-1 block text-xs font-medium ${textSub}`}>Request type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`}>
              {requestTypeEntries.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className={`mb-1 block text-xs font-medium ${textSub}`}>File VT ID</label>
            <input list="request-file-ids" value={form.fileId} onChange={e => setForm({ ...form, fileId: e.target.value })} placeholder="e.g. VT-12345" className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`} />
            <datalist id="request-file-ids">
              {files.slice(0, 500).map(f => <option key={f.id} value={f.fileId}>{f.applicantName}</option>)}
            </datalist>
          </div>
          {form.type === 'PRICE' && (
            <div>
              <label className={`mb-1 block text-xs font-medium ${textSub}`}>New invoice amount (৳)</label>
              <input type="number" min="0" step="0.01" value={form.requestedAmount} onChange={e => setForm({ ...form, requestedAmount: e.target.value })} className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`} />
              {formFile && (
                <p className={`mt-1 text-xs ${textSub}`}>
                  Current: {formatCurrency(formCurrentAmount)}
                  {formNewAmount > 0 && formCurrentAmount > 0 && ` · ${formNewAmount < formCurrentAmount ? 'Discount' : 'Increase'} ${formatCurrency(Math.abs(formNewAmount - formCurrentAmount))} (${(Math.abs(formNewAmount - formCurrentAmount) / formCurrentAmount * 100).toFixed(1)}%)`}
                </p>
              )}
              {formAutoApproved ? (
                <p className="mt-1 text-xs text-emerald-500">Within the {AUTO_APPROVE_DISCOUNT_PERCENT}% limit: applies immediately and is logged.</p>
              ) : formNewAmount > 0 && formFile && <p className="mt-1 text-xs text-amber-500">Needs admin approval before it applies.</p>}
            </div>
          )}
          <div>
            <label className={`mb-1 block text-xs font-medium ${textSub}`}>{form.type === 'PRICE' ? 'Reason (required)' : 'Details'}</label>
            <textarea rows={4} maxLength={1000} value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} placeholder="What should be changed, and why?" className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`} />
          </div>
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60">
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>

        <div className="space-y-3 lg:col-span-2">
          <input type="search" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search by ticket ID (REQ-…), VT ID, applicant or requester" className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`} />
          <div className="flex flex-wrap gap-2">
            {filters.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setStatusFilter(key)} className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${statusFilter === key ? 'bg-blue-600 text-white' : darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>
            ))}
          </div>

          {visibleRequests.length === 0 ? (
            <div className={`rounded-xl border p-6 text-center text-sm ${cardClass} ${textSub}`}>No requests to show</div>
          ) : visibleRequests.map(req => {
            const status = REQUEST_STATUSES[req.status] || REQUEST_STATUSES.OPEN;
            const closed = req.status === 'COMPLETED' || req.status === 'REJECTED';
            const liveFile = req.type === 'PRICE' ? files.find(f => f.id === req.fileDocId) : null;
            const liveAmount = liveFile ? getInvoiceAmount(liveFile) : 0;
            const priceOutdated = Boolean(liveFile) && Math.abs(liveAmount - req.currentAmount) > 0.005;
            return (
              <div key={req.id} className={`rounded-xl border p-4 ${cardClass}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${textMain}`}>{req.ticketNo} · {REQUEST_TYPES[req.type] || req.type}</p>
                    <p className={`text-xs ${textSub}`}>
                      {isAdmin ? (
                        <button type="button" onClick={() => onOpenFile(req.fileId)} title="Open this file" className="font-semibold text-blue-500 underline-offset-2 hover:underline">{req.fileId}</button>
                      ) : req.fileId}
                      {req.applicantName ? ` · ${req.applicantName}` : ''} · by {req.createdBy} · {formatDate(req.createdAt)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.badge}`}>{status.label}</span>
                </div>
                <p className={`mt-3 whitespace-pre-wrap rounded-lg border p-3 text-sm ${innerClass} ${textMain}`}>{req.details}</p>
                {req.type === 'PRICE' && (
                  <div className={`mt-2 rounded-lg border p-3 text-sm ${innerClass}`}>
                    <p className={textMain}>
                      <span className="font-semibold">{formatCurrency(req.currentAmount)}</span> → <span className="font-semibold">{formatCurrency(req.requestedAmount)}</span>
                      {' '}({req.requestedAmount < req.currentAmount ? 'discount' : 'increase'} {formatCurrency(Math.abs(req.requestedAmount - req.currentAmount))}
                      {req.currentAmount > 0 ? `, ${(Math.abs(req.requestedAmount - req.currentAmount) / req.currentAmount * 100).toFixed(1)}%` : ''})
                      {req.autoApproved && <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-500">Auto-approved</span>}
                    </p>
                    {isAdmin && !closed && priceOutdated && <p className="mt-1 text-xs text-red-500">The invoice is now {formatCurrency(liveAmount)}. This request is outdated; reject it and ask for a new one.</p>}
                  </div>
                )}
                {(req.messages || []).length > 0 && (
                  <div className="mt-3 space-y-2">
                    {req.messages.map((m, i) => (
                      <div key={i} className={`rounded-lg border px-3 py-2 text-sm ${m.role === ROLES.ADMIN ? (darkMode ? 'border-purple-500/30 bg-purple-500/10' : 'border-purple-200 bg-purple-50') : innerClass}`}>
                        <p className={`text-xs font-semibold ${textSub}`}>{m.by}{m.role === ROLES.ADMIN ? ' (Admin)' : ''} · {formatDate(new Date(m.at))}</p>
                        <p className={`whitespace-pre-wrap ${textMain}`}>{m.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                {closed && req.resolvedBy && <p className={`mt-2 text-xs ${textSub}`}>{status.label} by {req.resolvedBy} · {formatDate(req.resolvedAt)}</p>}
                {!isAdmin && req.status === 'NEEDS_INFO' && (
                  <div className="mt-3 space-y-2">
                    <textarea rows={2} maxLength={500} value={notes[req.id] ?? ''} onChange={e => setNotes({ ...notes, [req.id]: e.target.value })} placeholder="Reply to the admin's question" className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`} />
                    <button type="button" disabled={!(notes[req.id] || '').trim()} onClick={() => sendNote(req, 'OPEN')} className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50">Send Reply</button>
                  </div>
                )}
                {isAdmin && (
                  <div className="mt-3 space-y-2">
                    <input value={notes[req.id] ?? ''} onChange={e => setNotes({ ...notes, [req.id]: e.target.value })} placeholder="Message to the requester (required to ask for info)" className={`w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`} />
                    <div className="flex flex-wrap gap-2">
                      {req.status === 'OPEN' && <button type="button" onClick={() => sendNote(req, 'IN_PROGRESS')} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Start</button>}
                      {!closed && <button type="button" disabled={!(notes[req.id] || '').trim()} onClick={() => sendNote(req, 'NEEDS_INFO')} className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50">Ask for Info</button>}
                      {!closed && req.type !== 'PRICE' && <button type="button" onClick={() => sendNote(req, 'COMPLETED')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Mark Completed</button>}
                      {!closed && req.type === 'PRICE' && <button type="button" disabled={priceOutdated} title={priceOutdated ? 'Invoice amount changed since the request' : ''} onClick={async () => { const ok = await onApprovePrice(req, notes[req.id] ?? ''); if (ok) setNotes(prev => ({ ...prev, [req.id]: '' })); }} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">Approve & Apply</button>}
                      {!closed && <button type="button" disabled={!(notes[req.id] || '').trim()} title="A reason is required" onClick={() => sendNote(req, 'REJECTED')} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">Reject (reason required)</button>}
                      {closed && !req.priceApplied && <button type="button" onClick={() => sendNote(req, 'OPEN')} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${darkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Reopen</button>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LeavesPanel({ currentUser, leaveRequests, approvedLeaves, allUsers, darkMode, onApprove, onReject, onGrantDirect, onDeleteLeave, onRequestLeave }) {
  const [showDirectLeaveForm, setShowDirectLeaveForm] = useState(false);
  const [directLeaveForm, setDirectLeaveForm] = useState({ userName: '', startDate: '', endDate: '', reason: '' });
  
  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';

  const pendingRequests = leaveRequests.filter(r => r.status === 'PENDING');
  const userApprovedLeaves = approvedLeaves.filter(l => l.type === 'REQUESTED');

  const handleGrantDirect = async (e) => {
    e.preventDefault();
    await onGrantDirect(directLeaveForm.userName, directLeaveForm.startDate, directLeaveForm.endDate, directLeaveForm.reason);
    setDirectLeaveForm({ userName: '', startDate: '', endDate: '', reason: '' });
    setShowDirectLeaveForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`text-2xl font-bold ${textMain}`}>Leave Management</h2>
          <p className={textSub}>Manage leave requests and approved leaves</p>
        </div>
        {currentUser.role !== ROLES.ADMIN && (
          <button 
            onClick={onRequestLeave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Request Leave
          </button>
        )}
      </div>

      {/* Admin Leave Request Approvals */}
      {currentUser.role === ROLES.ADMIN && (
        <div className={`rounded-xl border p-4 ${cardClass}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className={`text-base font-bold ${textMain}`}>Pending Leave Requests</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pendingRequests.length ? 'bg-amber-500/15 text-amber-500' : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{pendingRequests.length}</span>
          </div>
          {pendingRequests.length === 0 ? (
            <p className={textSub}>No pending leave requests</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="min-w-0">
                    <p className={`font-bold ${textMain}`}>{req.userName}</p>
                    <p className={`text-sm ${textSub}`}>{req.startDate} to {req.endDate}</p>
                    {req.reason && <p className={`text-sm ${textSub} mt-1`}>Reason: {req.reason}</p>}
                  </div>
                  <div className="flex gap-2">
                      <button 
                        onClick={() => onApprove(req.id, req)}
                        className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => onReject(req.id)}
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                      >
                        Reject
                      </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Direct Leave Grant */}
      {currentUser.role === ROLES.ADMIN && (
        <div className={`rounded-xl border p-4 ${cardClass}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className={`text-base font-bold ${textMain}`}>Grant Direct Leave</h3>
            <button 
              onClick={() => setShowDirectLeaveForm(!showDirectLeaveForm)}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {showDirectLeaveForm ? 'Cancel' : 'Grant Leave'}
            </button>
          </div>
          
          {showDirectLeaveForm && (
            <form onSubmit={handleGrantDirect} className="space-y-3">
              <select 
                value={directLeaveForm.userName}
                onChange={(e) => setDirectLeaveForm({...directLeaveForm, userName: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`}
              >
                <option value="">Select Employee</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.fullName}>{u.fullName} ({u.role})</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="date"
                  value={directLeaveForm.startDate}
                  onChange={(e) => setDirectLeaveForm({...directLeaveForm, startDate: e.target.value})}
                  className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`}
                />
                <input 
                  type="date"
                  value={directLeaveForm.endDate}
                  onChange={(e) => setDirectLeaveForm({...directLeaveForm, endDate: e.target.value})}
                  className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>
              <input 
                type="text"
                placeholder="Reason (optional)"
                value={directLeaveForm.reason}
                onChange={(e) => setDirectLeaveForm({...directLeaveForm, reason: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`}
              />
              <button type="submit" className="w-full px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium">
                Grant Leave
              </button>
            </form>
          )}
        </div>
      )}

      {/* Approved Leaves List */}
      <div className={`rounded-xl border p-4 ${cardClass}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className={`text-base font-bold ${textMain}`}>Approved Leaves</h3>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{approvedLeaves.length}</span>
        </div>
        {approvedLeaves.length === 0 ? (
          <p className={textSub}>No approved leaves</p>
        ) : (
          <div className="space-y-3">
            {approvedLeaves.map(leave => (
              <div key={leave.id} className={`rounded-lg border p-4 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`font-bold ${textMain}`}>{leave.userName}</p>
                    <p className={`text-sm ${textSub}`}>{leave.startDate} to {leave.endDate}</p>
                    {leave.reason && <p className={`text-sm ${textSub} mt-1`}>Reason: {leave.reason}</p>}
                    <p className={`text-xs ${textSub} mt-1`}>Approved by: {leave.approvedBy} ({leave.type})</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${leave.type === 'REQUESTED' ? (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700') : (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')}`}>
                      {leave.type}
                    </span>
                    {currentUser.role === ROLES.ADMIN && (
                      <button
                        onClick={() => onDeleteLeave(leave.id, leave.userName)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                        title="Delete this leave"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminPanel({
  currentUser,
  destinations,
  visaWorkRanks = {},
  visaDestinationAgents = {},
  processingAgents = [],
  paymentMethods = [],
  darkMode
}) {
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ fullName: '', username: '', password: '', role: ROLES.SALES });
  const [newDest, setNewDest] = useState('');
  const [newPortal, setNewPortal] = useState('');
  const [portals, setPortals] = useState([]);
  const [paymentMethodForm, setPaymentMethodForm] = useState({ id: '', name: '', institution: '', accountName: '', accountNumber: '' });
  const [editingPaymentMethodId, setEditingPaymentMethodId] = useState('');
  const [cashNotificationEmailText, setCashNotificationEmailText] = useState('');
  const [savingCashNotificationEmails, setSavingCashNotificationEmails] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [incentiveSettings, setIncentiveSettings] = useState([]);
  const [selectedIncentiveUser, setSelectedIncentiveUser] = useState('');
  const [incentiveTarget, setIncentiveTarget] = useState('');
  const [incentiveTiers, setIncentiveTiers] = useState([{ amount: '', percent: '' }]);
  const [visaWorkRankDraft, setVisaWorkRankDraft] = useState(visaWorkRanks);
  const [savingVisaWorkRanks, setSavingVisaWorkRanks] = useState(false);
  const [visaDestinationAgentsDraft, setVisaDestinationAgentsDraft] = useState(visaDestinationAgents);
  const [savingVisaDestinationAgents, setSavingVisaDestinationAgents] = useState(false);
  const [destinationSearch, setDestinationSearch] = useState('');
  const [expandedDestination, setExpandedDestination] = useState('');
  
  const filteredDestinations = destinations.filter(destination =>
    destination.toLowerCase().includes(destinationSearch.trim().toLowerCase())
  );
  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  useEffect(() => {
    setVisaWorkRankDraft(visaWorkRanks);
  }, [visaWorkRanks]);

  useEffect(() => {
    setVisaDestinationAgentsDraft(visaDestinationAgents);
  }, [visaDestinationAgents]);

  const saveVisaWorkRanks = async () => {
    setSavingVisaWorkRanks(true);
    try {
      const ranks = Object.fromEntries(
        destinations.map(destination => [destination, visaWorkRankDraft[destination] || 'Moderate'])
      );
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'visa_work_ranks'), {
        ranks,
        updatedBy: currentUser.name,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to save Visa workload ranks:', error);
      alert(`Failed to save Visa workload ranks: ${error.message || 'Check Firestore access and try again.'}`);
    } finally {
      setSavingVisaWorkRanks(false);
    }
  };

  const saveVisaDestinationAgents = async () => {
    setSavingVisaDestinationAgents(true);
    try {
      const agentsByDestination = Object.fromEntries(
        destinations.map(destination => [
          destination,
          [...new Set(visaDestinationAgentsDraft[destination] || [])]
        ])
      );
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'visa_destination_agents'), {
        agentsByDestination,
        updatedBy: currentUser.name,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to save Visa destination routing:', error);
      alert(`Failed to save Visa destination routing: ${error.message || 'Check Firestore access and try again.'}`);
    } finally {
      setSavingVisaDestinationAgents(false);
    }
  };

  useEffect(() => {
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'cash_payment_notifications');
    const unsubscribe = onSnapshot(docRef, snapshot => {
      const recipients = snapshot.exists() ? snapshot.data().recipients : [];
      setCashNotificationEmailText(Array.isArray(recipients) ? recipients.join('\n') : '');
    }, error => {
      console.error('Failed to load cash payment notification recipients:', error);
    });
    return () => unsubscribe();
  }, []);

  const saveCashNotificationEmails = async (e) => {
    e.preventDefault();
    const recipients = [...new Set(cashNotificationEmailText.split(/[\s,;]+/).map(email => email.trim().toLowerCase()).filter(Boolean))];
    const invalid = recipients.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (invalid.length > 0) {
      alert(`Invalid email address${invalid.length === 1 ? '' : 'es'}: ${invalid.join(', ')}`);
      return;
    }
    setSavingCashNotificationEmails(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'cash_payment_notifications'), { recipients });
    } catch (error) {
      console.error('Failed to save cash payment notification recipients:', error);
      alert('Failed to save notification recipients. See console for details.');
    } finally {
      setSavingCashNotificationEmails(false);
    }
  };

  const savePaymentMethod = async (e) => {
    e.preventDefault();
    if (!paymentMethodForm.name.trim()) {
      alert('Enter a payment method name.');
      return;
    }
    const item = {
      id: editingPaymentMethodId || `payment-${Date.now()}`,
      name: paymentMethodForm.name.trim(),
      institution: paymentMethodForm.institution.trim(),
      accountName: paymentMethodForm.accountName.trim(),
      accountNumber: paymentMethodForm.accountNumber.trim()
    };
    const items = editingPaymentMethodId
      ? paymentMethods.map(method => method.id === editingPaymentMethodId ? item : method)
      : [...paymentMethods, item];
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'payment_methods'), { items });
      setPaymentMethodForm({ id: '', name: '', institution: '', accountName: '', accountNumber: '' });
      setEditingPaymentMethodId('');
    } catch (error) {
      console.error('Failed to save payment method:', error);
      alert('Failed to save payment method. See console for details.');
    }
  };

  const removePaymentMethod = async (methodId) => {
    if (!confirm('Remove this payment method? Existing payment records will retain their saved account details.')) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'payment_methods'), {
        items: paymentMethods.filter(method => method.id !== methodId)
      });
      if (editingPaymentMethodId === methodId) {
        setEditingPaymentMethodId('');
        setPaymentMethodForm({ id: '', name: '', institution: '', accountName: '', accountNumber: '' });
      }
    } catch (error) {
      console.error('Failed to remove payment method:', error);
      alert('Failed to remove payment method. See console for details.');
    }
  };

  useEffect(() => {
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'agency_users');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      if (!selectedIncentiveUser && usersData.length > 0) {
        setSelectedIncentiveUser(usersData[0].fullName);
      }
    });
    return () => unsubscribe();
  }, [selectedIncentiveUser]);

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

  useEffect(() => {
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'incentives');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const saved = snapshot.data().users || [];
        setIncentiveSettings(saved);
        if (!selectedIncentiveUser && saved.length > 0) {
          setSelectedIncentiveUser(saved[0].name);
        }
      } else {
        setIncentiveSettings([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedIncentiveUser) return;
    const config = incentiveSettings.find(item => item.name === selectedIncentiveUser);
    if (config) {
      setIncentiveTarget(String(config.target || ''));
      setIncentiveTiers(config.tiers?.length > 0 ? config.tiers.map((tier) => ({
        amount: String(tier.amount || ''),
        percent: String(tier.percent || '')
      })) : [{ amount: '', percent: '' }]);
    } else {
      setIncentiveTarget('');
      setIncentiveTiers([{ amount: '', percent: '' }]);
    }
  }, [selectedIncentiveUser, incentiveSettings]);

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

  const prepareIncentiveConfig = () => {
    return incentiveTiers
      .filter(t => t.amount.trim() !== '' && t.percent.trim() !== '')
      .map(t => ({ amount: Number(t.amount) || 0, percent: Number(t.percent) || 0 }));
  };

  const handleSaveIncentiveConfig = async (e) => {
    e.preventDefault();
    if (!selectedIncentiveUser) {
      alert('Please choose a user to save incentive settings.');
      return;
    }

    const preparedTiers = prepareIncentiveConfig();
    const updatedSettings = [...incentiveSettings.filter(item => item.name !== selectedIncentiveUser), {
      name: selectedIncentiveUser,
      target: Number(incentiveTarget) || 0,
      tiers: preparedTiers
    }];

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'incentives');
      await setDoc(docRef, { users: updatedSettings, lastUpdated: serverTimestamp() }, { merge: true });
      setIncentiveSettings(updatedSettings);
      alert('Incentive settings saved successfully.');
    } catch (err) {
      console.error('Error saving incentive settings:', err);
      alert(`Failed to save incentive settings: ${err?.message || JSON.stringify(err) || err}`);
    }
  };

  const handleAddIncentiveTier = () => {
    setIncentiveTiers([...incentiveTiers, { amount: '', percent: '' }]);
  };

  const handleRemoveIncentiveTier = (index) => {
    setIncentiveTiers(incentiveTiers.filter((_, idx) => idx !== index));
  };

  const handleIncentiveTierChange = (index, field, value) => {
    setIncentiveTiers(incentiveTiers.map((tier, idx) => idx === index ? { ...tier, [field]: value } : tier));
  };

  const handleIncentiveUserChange = (userName) => {
    setSelectedIncentiveUser(userName);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className={`text-2xl font-bold ${textMain}`}>Admin Control Panel</h2>
           <p className="text-slate-500">Manage system settings and user access</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* User Management Section */}
        <div className="space-y-6">
           <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
             <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
                <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}><Users className="h-5 w-5"/> Staff Accounts</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>{users.length} Users</span>
             </div>
             
             {/* Add User Form */}
             <div className={`p-6 border-b ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50/50'}`}>
               <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Create New Account</h4>
               <form onSubmit={handleAddUser} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <div className="p-3">
             <label className="sr-only" htmlFor="destination-settings-search">Search destinations</label>
             <input
               id="destination-settings-search"
               type="search"
               value={destinationSearch}
               onChange={event => setDestinationSearch(event.target.value)}
               placeholder="Search destinations..."
               className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm ${inputClass}`}
             />
             <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
               <span>{filteredDestinations.length} destinations</span>
               {destinationSearch && (
                 <button type="button" onClick={() => setDestinationSearch('')} className="text-blue-500 hover:underline">
                   Clear search
                 </button>
               )}
             </div>
             <div className="flex flex-wrap gap-2">
               {filteredDestinations.map(d => (
                 <span key={d} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {d}
                    <button onClick={() => handleDeleteDestination(d)} className="hover:text-red-600 text-slate-400 ml-1"><X className="h-3 w-3"/></button>
                 </span>
               ))}
               {destinations.length === 0 && <span className="text-slate-400 text-sm p-2">No destinations set.</span>}
             </div>
          </div>
          <div className={`border-t p-4 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="mb-3">
              <h4 className={`font-semibold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Visa Workload Ranks</h4>
              <p className="mt-1 text-xs text-slate-500">These ranks weight each active Visa file for automatic Processing Agent assignment: High 3, Moderate 2, Low 1.</p>
            </div>
            <div className="space-y-2">
            {filteredDestinations
              .map(destination => {
                const selectedAgents = visaDestinationAgentsDraft[destination] || [];
                const restricted = selectedAgents.length > 0;
                const isExpanded = expandedDestination === destination;
                return (
              <div key={destination} className={`rounded-lg border ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedDestination(isExpanded ? '' : destination)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left ${darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-medium ${textMain}`}>{destination}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {visaWorkRankDraft[destination] || 'Moderate'} · {restricted ? `${selectedAgents.length} eligible agent${selectedAgents.length === 1 ? '' : 's'}` : 'All agents eligible'}
                    </span>
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isExpanded && <div className={`space-y-4 border-t p-3 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Workload rank</span>
                    <select
                      value={visaWorkRankDraft[destination] || 'Moderate'}
                      onChange={event => setVisaWorkRankDraft(current => ({ ...current, [destination]: event.target.value }))}
                      className={`rounded-lg border px-3 py-2 text-sm ${inputClass}`}
                      aria-label={`${destination} workload rank`}
                    >
                      {Object.keys(WORK_RANK_WEIGHTS).map(rank => <option key={rank} value={rank}>{rank} ({WORK_RANK_WEIGHTS[rank]})</option>)}
                    </select>
                  </label>
                  <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">Eligible Processing Agents</p>
                    {restricted && (
                      <button
                        type="button"
                        onClick={() => setVisaDestinationAgentsDraft(current => ({ ...current, [destination]: [] }))}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Allow all agents
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {[...new Set([
                      ...processingAgents.map(agent => agent.fullName || agent.name || agent.username).filter(Boolean),
                      ...selectedAgents
                    ])].sort((a, b) => a.localeCompare(b)).map(agentName => {
                      const checked = restricted && selectedAgents.includes(agentName);
                      const isActiveAgent = processingAgents.some(agent =>
                        (agent.fullName || agent.name || agent.username) === agentName
                      );
                      return (
                        <label key={agentName} className={`flex items-center gap-2 text-xs ${isActiveAgent ? textMain : 'text-amber-500'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const nextAgents = checked
                                ? selectedAgents.filter(name => name !== agentName)
                                : [...selectedAgents, agentName];
                              setVisaDestinationAgentsDraft(current => ({ ...current, [destination]: nextAgents }));
                            }}
                          />
                          <span>{agentName}{isActiveAgent ? '' : ' (inactive/unavailable)'}</span>
                        </label>
                      );
                    })}
                    {processingAgents.length === 0 && (visaDestinationAgentsDraft[destination] || []).length === 0 && (
                      <span className="text-xs text-amber-500">No Processing Agents available yet.</span>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    No agents selected means any Processing Agent can handle this destination.
                  </p>
                  </div>
                </div>}
              </div>
                );
              })}
              {filteredDestinations.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">No destinations match your search.</p>
              )}
            </div>
            <button
              type="button"
              onClick={saveVisaWorkRanks}
              disabled={savingVisaWorkRanks}
              className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingVisaWorkRanks ? 'Saving…' : 'Save Visa Work Ranks'}
            </button>
            <button
              type="button"
              onClick={saveVisaDestinationAgents}
              disabled={savingVisaDestinationAgents}
              className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingVisaDestinationAgents ? 'Saving…' : 'Save Destination Agent Rules'}
            </button>
          </div>
        </div>

        {/* Payment Account Settings */}
        <div className={`rounded-xl border h-fit ${cardClass}`}>
          <div className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
            <h3 className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Payment Methods &amp; Accounts</h3>
          </div>
          <form onSubmit={savePaymentMethod} className={`p-4 space-y-2 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <input className={`w-full px-3 py-2 border rounded-lg text-sm ${inputClass}`} placeholder="Payment method name (e.g. Bank Transfer)" required value={paymentMethodForm.name} onChange={e => setPaymentMethodForm({ ...paymentMethodForm, name: e.target.value })} />
            <input className={`w-full px-3 py-2 border rounded-lg text-sm ${inputClass}`} placeholder="Bank / provider" value={paymentMethodForm.institution} onChange={e => setPaymentMethodForm({ ...paymentMethodForm, institution: e.target.value })} />
            <input className={`w-full px-3 py-2 border rounded-lg text-sm ${inputClass}`} placeholder="Account holder" value={paymentMethodForm.accountName} onChange={e => setPaymentMethodForm({ ...paymentMethodForm, accountName: e.target.value })} />
            <input className={`w-full px-3 py-2 border rounded-lg text-sm ${inputClass}`} placeholder="Account details / number" value={paymentMethodForm.accountNumber} onChange={e => setPaymentMethodForm({ ...paymentMethodForm, accountNumber: e.target.value })} />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">{editingPaymentMethodId ? 'Save Changes' : 'Add Payment Method'}</button>
              {editingPaymentMethodId && <button type="button" onClick={() => { setEditingPaymentMethodId(''); setPaymentMethodForm({ id: '', name: '', institution: '', accountName: '', accountNumber: '' }); }} className="px-3 py-2 rounded-lg text-sm border">Cancel</button>}
            </div>
          </form>
          <div className="p-3 space-y-2">
            {paymentMethods.map(method => (
              <div key={method.id} className={`p-3 rounded-lg border flex items-start justify-between gap-2 ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="min-w-0">
                  <div className={`font-medium text-sm ${textMain}`}>{method.name}</div>
                  <div className="text-xs text-slate-500">{[method.institution, method.accountName, method.accountNumber].filter(Boolean).join(' · ') || 'No account details'}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" className="text-blue-500 text-xs" onClick={() => { setEditingPaymentMethodId(method.id); setPaymentMethodForm({ ...method }); }}>Edit</button>
                  <button type="button" className="text-red-500 text-xs" onClick={() => removePaymentMethod(method.id)}>Remove</button>
                </div>
              </div>
            ))}
            {paymentMethods.length === 0 && <p className="text-sm text-slate-500">No payment methods configured.</p>}
          </div>
        </div>

        {/* Cash Payment Email Notifications */}
        <div className={`rounded-xl border h-fit ${cardClass}`}>
          <div className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
            <h3 className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Cash Payment Email Alerts</h3>
          </div>
          <form onSubmit={saveCashNotificationEmails} className="p-4 space-y-3">
            <p className="text-sm text-slate-500">Send an email whenever a payment method named “Cash” is used. Enter one or more recipient addresses, separated by commas, spaces, or new lines.</p>
            <textarea
              value={cashNotificationEmailText}
              onChange={e => setCashNotificationEmailText(e.target.value)}
              rows={4}
              maxLength={3000}
              placeholder="accounts@example.com&#10;manager@example.com"
              className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`}
            />
            <button type="submit" disabled={savingCashNotificationEmails} className="w-full bg-blue-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm">
              {savingCashNotificationEmails ? 'Saving…' : 'Save Notification Emails'}
            </button>
            <p className="text-xs text-slate-500">Email delivery also requires the Firebase Trigger Email extension to be configured with your Hostinger SMTP credentials.</p>
          </form>
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

      <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50'}`}>
          <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}><Sparkles className="h-5 w-5"/> Incentive Targets</h3>
        </div>
        <div className={`p-6 space-y-4 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'} `}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Staff Member</label>
              <select
                value={selectedIncentiveUser}
                onChange={(e) => handleIncentiveUserChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`}
              >
                {users.length > 0 ? users.map(u => (
                  <option key={u.id} value={u.fullName}>{u.fullName}</option>
                )) : <option value="">No users available</option>}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Profit Target (৳)</label>
              <input
                type="number"
                min="0"
                value={incentiveTarget}
                onChange={(e) => setIncentiveTarget(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`}
                placeholder="Target profit before incentive"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Tiered Incentive Plan</p>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Define above-target profit ranges and payout percentages.</p>
              </div>
              <button
                type="button"
                onClick={handleAddIncentiveTier}
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <Plus className="h-4 w-4"/> Add Tier
              </button>
            </div>
            <div className="space-y-3">
              {incentiveTiers.map((tier, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Above Profit (৳)</label>
                    <input
                      type="number"
                      min="0"
                      value={tier.amount}
                      onChange={(e) => handleIncentiveTierChange(index, 'amount', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`}
                      placeholder="Range threshold"
                    />
                  </div>
                  <div className="col-span-5">
                    <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Payout %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tier.percent}
                      onChange={(e) => handleIncentiveTierChange(index, 'percent', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`}
                      placeholder="Percent"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveIncentiveTier(index)}
                      className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {incentiveTiers.length === 0 && (
                <div className={`p-3 rounded-lg border ${darkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                  <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>No incentive tiers defined yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveIncentiveConfig}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              Save Incentive Settings
            </button>
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
    
    // Pick & Drop workflow progresses through booking, confirmation, and service completion.
    if (file.fileType === FILE_TYPES.PICK_DROP) {
      if (file.status === 'PICKUP_DROP_INITIATED') {
        actions.push({ key: 'PICKUP_DROP_BOOKED', label: STATUS['PICKUP_DROP_BOOKED'].label, isSpecial: true });
      } else if (file.status === 'PICKUP_DROP_BOOKED') {
        actions.push({ key: 'PICKUP_DROP_CONFIRMED', label: STATUS['PICKUP_DROP_CONFIRMED'].label });
      } else if (file.status === 'PICKUP_DROP_CONFIRMED') {
        actions.push({ key: 'PICKUP_DROP_COMPLETED', label: STATUS['PICKUP_DROP_COMPLETED'].label });
      }
      return actions;
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
  const invoiceSummary = getInvoiceSummary(file);
  const invoicePayments = Array.isArray(file.invoicePayments)
    ? file.invoicePayments
    : Array.isArray(file.invoice?.payments)
      ? file.invoice.payments
      : [];
  const invoiceBadgeClass = invoiceSummary.paymentStatus === 'Paid'
    ? (darkMode ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-100 text-green-700 border-green-200')
    : invoiceSummary.paymentStatus === 'Partially Paid'
      ? (darkMode ? 'bg-amber-900/30 text-amber-400 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200')
      : (darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200');
  const iconColor = statusColor.split(' ')[1] || 'text-slate-600';
  const iconBg = statusColor.split(' ')[0] || 'bg-slate-100';
  const canViewCosts = user?.role === ROLES.ADMIN;

  return (
    <div className={`rounded-xl border overflow-hidden transition-all hover:border-blue-300 hover:shadow-md ${cardClass}`}>
      <div className="p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className={`shrink-0 rounded-xl p-2.5 ${iconBg}`}>
              <StatusIcon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                 <h3 className={`min-w-0 break-words text-base font-bold sm:text-lg ${textMain}`}>{file.applicantName}</h3>
                 <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{file.fileId || 'NO-ID'}</span>
                 <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                   (file.fileType || FILE_TYPES.VISA) === FILE_TYPES.VISA ? (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700') :
                   (file.fileType || FILE_TYPES.VISA) === FILE_TYPES.AIR_TICKET ? (darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700') :
                   (file.fileType || FILE_TYPES.VISA) === FILE_TYPES.PACKAGE ? (darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') :
                   (file.fileType || FILE_TYPES.VISA) === FILE_TYPES.PICK_DROP ? (darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700') :
                   ''
                 }`}>{file.fileType || FILE_TYPES.VISA}</span>
                 {file.familyGroupId && (
                   <span className={`text-[10px] px-2 py-0.5 rounded border ${darkMode ? 'border-indigo-800 bg-indigo-900/30 text-indigo-300' : 'border-indigo-200 bg-indigo-50 text-indigo-700'}`}>
                     Family ID: {file.familyGroupId}
                   </span>
                 )}
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
                    {canViewCosts && file.packageCostPrice && <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><span className="text-sm font-bold">Cost</span> ৳{file.packageCostPrice}</span>}
                  </>
                ) : file.fileType === FILE_TYPES.AIR_TICKET ? (
                  <>
                    {file.airlineRoute && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {file.airlineRoute}</span>}
                    {file.airlineSalePrice && <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="text-sm font-bold">৳</span> {file.airlineSalePrice}</span>}
                    {canViewCosts && file.airlineCostPrice && <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><span className="text-sm font-bold">Cost</span> ৳{file.airlineCostPrice}</span>}
                  </>
                ) : file.fileType === FILE_TYPES.PICK_DROP ? (
                  <>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {file.pickupLocation || 'N/A'} → {file.dropoffLocation || 'N/A'}</span>
                    {file.numberOfPersons !== undefined && file.numberOfPersons !== null && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {file.numberOfPersons} person{Number(file.numberOfPersons) === 1 ? '' : 's'}</span>}
                    {file.salePrice !== undefined && file.salePrice !== null && <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="text-sm font-bold">৳</span> {file.salePrice}</span>}
                    {canViewCosts && file.costPrice !== undefined && file.costPrice !== null && <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><span className="text-sm font-bold">Cost</span> ৳{file.costPrice}</span>}
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {file.passportNo}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {file.destination || 'N/A'}</span>
                    {file.serviceCharge && <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><span className="text-sm font-bold">৳</span> {file.serviceCharge}</span>}
                    {canViewCosts && file.cost && <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><span className="text-sm font-bold">Cost</span> ৳{file.cost}</span>}
                  </>
                )}
                <span className="flex items-center gap-1">📞 {file.contactNo}</span>
                {file.reminderDate && <span className="flex items-center gap-1 text-orange-500"><Clock className="h-3 w-3"/> {formatSimpleDate(file.reminderDate)}</span>}
                {invoiceSummary.amount > 0 && (
                  <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${invoiceBadgeClass}`}>
                    <FileText className="h-3 w-3" />
                    {file.invoiceNo || 'Invoice'} • {invoiceSummary.paymentStatus} • ৳{invoiceSummary.paidAmount}/{invoiceSummary.amount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor}`}>
              {STATUS[file.status].label}
            </span>
            <span className="max-w-48 truncate text-xs text-slate-400">Assigned: {file.assignedTo || 'Unassigned'}</span>
          </div>
        </div>

        <div className={`mt-4 flex flex-col items-start justify-between gap-3 border-t pt-3 sm:flex-row sm:items-center ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
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

          {(isOwner || ((file.fileType === FILE_TYPES.PACKAGE || file.fileType === FILE_TYPES.AIR_TICKET) && user.role === ROLES.ADMIN)) && !isFileCompleted(file) && (
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
          {invoiceSummary.amount > 0 && (
              <section className={`mb-6 p-4 rounded-lg border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <h4 className={`text-sm font-semibold mb-3 ${textMain}`}>Invoice Payment Transactions</h4>
                {invoicePayments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                        <tr>
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Amount</th>
                          <th className="py-2 pr-3">Method / Account</th>
                          <th className="py-2 pr-3">Transaction Ref</th>
                          <th className="py-2">Received By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoicePayments.map((payment, index) => {
                          const timestamp = payment.receivedAt?.toDate
                            ? payment.receivedAt.toDate()
                            : payment.receivedAt?.seconds
                              ? new Date(payment.receivedAt.seconds * 1000)
                              : new Date(payment.receivedAt);
                          const dateLabel = Number.isNaN(timestamp.getTime()) ? 'Date unavailable' : timestamp.toLocaleString();
                          return (
                            <tr key={payment.id || index} className={`border-b last:border-0 ${darkMode ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-700'}`}>
                              <td className="py-2 pr-3 whitespace-nowrap">{dateLabel}</td>
                              <td className="py-2 pr-3 whitespace-nowrap font-semibold">{formatCurrency(Number(payment.amount) || 0)}</td>
                              <td className="py-2 pr-3">{[payment.methodName, payment.institution, payment.accountName, payment.accountNumber].filter(Boolean).join(' · ') || 'Unattributed legacy payment'}</td>
                              <td className="py-2 pr-3">{payment.transactionRef || '—'}</td>
                              <td className="py-2">{payment.receivedBy || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={`text-xs ${textSub}`}>No transaction entries are saved on this file yet. Historical paid amounts may not have transaction details.</p>
                )}
              </section>
          )}

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

          {file.fileType === FILE_TYPES.PICK_DROP && (
            <div className="mb-6 p-4 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
              <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-3">🚗 Pick &amp; Drop Booking Details</h4>
              <div className="space-y-3 text-sm">
                <div className="pb-3 border-b border-orange-200 dark:border-orange-800">
                  <p className="font-medium">Route</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <span className="font-medium">Pickup:</span> {file.pickupLocation || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Dropoff:</span> {file.dropoffLocation || 'N/A'}
                  </p>
                </div>
                <div className="pb-3 border-b border-orange-200 dark:border-orange-800">
                  <p className="font-medium">Passengers &amp; Price</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <span className="font-medium">Number of Persons:</span> {file.numberOfPersons ?? 'N/A'}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Sale Price:</span> {formatCurrency(Number(file.salePrice) || 0)}
                  </p>
                  {canViewCosts && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-medium">Cost Price:</span> {formatCurrency(Number(file.costPrice) || 0)}
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Booking Status:</span> {STATUS[file.status]?.label || file.status || 'N/A'}
                </p>
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
    const [salesDocsProvided, setSalesDocsProvided] = useState(null);
    const [processingDocsReceived, setProcessingDocsReceived] = useState(null);
  
    if (!isOpen) return null;
  
    const isSendToProcessing = newStatus === 'SEND_TO_PROCESSING';
    const isAcknowledgeProcessing = newStatus === 'ACKNOWLEDGE_PROCESSING';
    const isDone = newStatus === 'DONE';
    const isSubmitted = newStatus === 'SUBMITTED';
    const isVisaFile = (file?.fileType || FILE_TYPES.VISA) === FILE_TYPES.VISA;
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
       
       if (isSendToProcessing && !isVisaFile && !assignee) {
         alert("Please select a processing agent to assign this file");
         return;
       }

       if (isVisaFile && isSendToProcessing && salesDocsProvided === null) {
         alert("Please confirm whether the sales rep provided all required documents to processing");
         return;
       }

       if (isVisaFile && isAcknowledgeProcessing && processingDocsReceived === null) {
         alert("Please confirm whether the processing team received all required documents from the sales rep");
         return;
       }
       
       if (isSendToProcessing) {
         onConfirm(note, null, isVisaFile ? null : assignee, null, null, false, null, { documentsProvidedToProcessing: salesDocsProvided });
       } else if (isAcknowledgeProcessing) {
         onConfirm(note, null, null, null, null, true, null, { documentsReceivedFromSales: processingDocsReceived });
       } else {
         onConfirm(note, result, assignee, reminderDate, cost, false);
       }
    };
  
    return (
      <div className="modal-backdrop">
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

             {/* Visa handoffs are routed automatically; other service types retain manual assignment. */}
             {isSendToProcessing && isVisaFile && (
                <>
                  <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                    The system will assign this Visa file to the Processing Agent with the lowest weighted active workload.
                  </p>
                  <div>
                    <label className="mb-2 block text-sm font-medium opacity-80">Have all required documents been provided to the processing agent?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSalesDocsProvided(true)}
                        className={`rounded-lg border p-2 ${salesDocsProvided === true ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : ''}`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setSalesDocsProvided(false)}
                        className={`rounded-lg border p-2 ${salesDocsProvided === false ? 'border-red-500 bg-red-500/10 text-red-600' : ''}`}
                      >
                        No / Docs pending
                      </button>
                    </div>
                  </div>
                </>
             )}

             {isSendToProcessing && !isVisaFile && (
                <div className="space-y-4">
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

                </div>
             )}

             {isAcknowledgeProcessing && isVisaFile && (
               <div>
                 <label className="block text-sm font-medium mb-2 opacity-80">Did the processing agent receive all required documents from the sales rep?</label>
                 <div className="grid grid-cols-2 gap-3">
                   <button type="button" onClick={() => setProcessingDocsReceived(true)} className={`p-2 rounded-lg border ${processingDocsReceived === true ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : ''}`}>Yes, complete</button>
                   <button type="button" onClick={() => setProcessingDocsReceived(false)} className={`p-2 rounded-lg border ${processingDocsReceived === false ? 'border-red-500 bg-red-500/10 text-red-600' : ''}`}>No / Docs pending</button>
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
             {!isSendToProcessing && !isAcknowledgeProcessing && !isVisaFile && (
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

function PickDropBookedModal({ isOpen, onClose, onConfirm, file, darkMode }) {
  const [pickupLocation, setPickupLocation] = useState(file?.pickupLocation || '');
  const [dropoffLocation, setDropoffLocation] = useState(file?.dropoffLocation || '');
  const [salePrice, setSalePrice] = useState(file?.salePrice || '');
  const [costPrice, setCostPrice] = useState(file?.costPrice || '');

  if (!isOpen) return null;

  const cardClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
  const inputClass = darkMode
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500'
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  const handleSubmit = () => {
    const numericSalePrice = Number(salePrice);
    const numericCostPrice = Number(costPrice);
    if (
      !pickupLocation.trim() ||
      !dropoffLocation.trim() ||
      salePrice === '' ||
      costPrice === '' ||
      !Number.isFinite(numericSalePrice) ||
      !Number.isFinite(numericCostPrice) ||
      numericSalePrice < 0 ||
      numericCostPrice < 0
    ) {
      alert('Please fill in all Pick & Drop booking details');
      return;
    }

    onConfirm({ pickupLocation, dropoffLocation, salePrice, costPrice });
    setPickupLocation('');
    setDropoffLocation('');
    setSalePrice('');
    setCostPrice('');
  };

  return (
    <div className="modal-backdrop">
      <div className={`rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 ${cardClass}`}>
        <h3 className="text-lg font-bold mb-2">Pick & Drop Booked</h3>
        <p className="text-sm text-slate-500 mb-6">Enter booking details for <b>{file?.applicantName}</b></p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Pickup Location</label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="e.g., Hotel ABC, Dhaka"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Dropoff Location</label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="e.g., Hazrat Shahjalal Airport"
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Sale Price - ৳</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="0.00"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Cost Price - ৳</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="0.00"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
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

function AirTicketDetailsModal({ isOpen, onClose, onConfirm, file, darkMode, portals, issued }) {
  const [pnr, setPnr] = useState(file?.pnr || '');
  const [portal, setPortal] = useState(file?.portal || '');
  const [bookingDate, setBookingDate] = useState(file?.bookingValidity?.date || '');
  const [bookingTime, setBookingTime] = useState(file?.bookingValidity?.time || '');
  const [salePrice, setSalePrice] = useState(file?.airlineSalePrice || '');
  const [costPrice, setCostPrice] = useState(file?.airlineCostPrice || '');

  if (!isOpen) return null;

  const cardClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  const handleSubmit = () => {
    if (!pnr || !portal || !bookingDate || !bookingTime) {
      alert(issued ? "Please fill in all fields" : "Please fill in all booking fields");
      return;
    }
    onConfirm({ pnr, portal, bookingValidity: { date: bookingDate, time: bookingTime }, airlineSalePrice: salePrice, airlineCostPrice: costPrice });
    setPnr('');
    setPortal('');
    setBookingDate('');
    setBookingTime('');
    setSalePrice('');
    setCostPrice('');
  };

  return (
    <div className="modal-backdrop">
      <div className={`rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 ${cardClass}`}>
        <h3 className="text-lg font-bold mb-2">{issued ? 'Flight Ticket Issued' : 'Flight Ticket Booked'}</h3>
        <p className="text-sm text-slate-500 mb-6">
          {issued ? 'Update ticket details for' : 'Enter booking details for'} <b>{file?.applicantName}</b>
        </p>
        
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

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Sale Price - ৳</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="0.00"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Cost Price - ৳</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="0.00"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            {issued ? 'Update Ticket' : 'Save Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Package - FLIGHT_ISSUED Status Modal
function PackageFlightIssuedModal({ isOpen, onClose, onConfirm, file, darkMode, portals }) {
  const [pnr, setPnr] = useState(file?.flightPnr || '');
  const [portal, setPortal] = useState(file?.flightPortal || '');
  const [salePrice, setSalePrice] = useState(file?.packageSalePrice || '');
  const [costPrice, setCostPrice] = useState(file?.packageCostPrice || '');

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
    onConfirm({ flightPnr: pnr, flightPortal: portal, packageSalePrice: salePrice, packageCostPrice: costPrice });
    setPnr('');
    setPortal('');
    setSalePrice('');
    setCostPrice('');
  };

  return (
    <div className="modal-backdrop">
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

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Sale Price - ৳</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="0.00"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Cost Price - ৳</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="0.00"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
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
  const [salePrice, setSalePrice] = useState(file?.packageSalePrice || '');
  const [costPrice, setCostPrice] = useState(file?.packageCostPrice || '');

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
    onConfirm({ hotelName, hotelFromDate: fromDate, hotelToDate: toDate, packageSalePrice: salePrice, packageCostPrice: costPrice });
    setHotelName('');
    setFromDate('');
    setToDate('');
    setSalePrice('');
    setCostPrice('');
  };

  return (
    <div className="modal-backdrop">
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

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Sale Price - ৳</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="0.00"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-80">Cost Price - ৳</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
              placeholder="0.00"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
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
  const [salePrice, setSalePrice] = useState(file?.packageSalePrice || '');
  const [costPrice, setCostPrice] = useState(file?.packageCostPrice || '');

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
    onConfirm({ routes, packageSalePrice: salePrice, packageCostPrice: costPrice });
    setRoutes([]);
    setNumTrips(1);
    setShowRouteForm(false);
    setSalePrice('');
    setCostPrice('');
  };

  return (
    <div className="modal-backdrop">
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

            <div>
              <label className="block text-sm font-medium mb-2 opacity-80">Sale Price - ৳</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
                placeholder="0.00"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 opacity-80">Cost Price - ৳</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
                placeholder="0.00"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
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
        <div className="modal-backdrop">
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

function LeaveRequestModal({ isOpen, onClose, onSubmit, leaveFormData, setLeaveFormData, darkMode }) {
    if (!isOpen) return null;

    const cardClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
    const inputClass = darkMode 
      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
      : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';
    const labelClass = darkMode ? 'text-slate-300' : 'text-slate-700';

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!leaveFormData.startDate || !leaveFormData.endDate) {
            alert('Please select both start and end dates');
            return;
        }
        if (new Date(leaveFormData.startDate) > new Date(leaveFormData.endDate)) {
            alert('Start date cannot be after end date');
            return;
        }
        onSubmit(e);
    };

    return (
        <div className="modal-backdrop">
            <div className={`rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 ${cardClass}`}>
                <h3 className="text-lg font-bold mb-4">Request Leave</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>
                            Start Date
                        </label>
                        <input
                            type="date"
                            required
                            value={leaveFormData.startDate}
                            onChange={(e) => setLeaveFormData({ ...leaveFormData, startDate: e.target.value })}
                            className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>
                            End Date
                        </label>
                        <input
                            type="date"
                            required
                            value={leaveFormData.endDate}
                            onChange={(e) => setLeaveFormData({ ...leaveFormData, endDate: e.target.value })}
                            className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm ${inputClass}`}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>
                            Reason (Optional)
                        </label>
                        <textarea
                            value={leaveFormData.reason}
                            onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                            placeholder="Mention your reason for leave..."
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[100px] ${inputClass}`}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                        >
                            Request Leave
                        </button>
                    </div>
                </form>
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
            const fileType = file.fileType || FILE_TYPES.VISA; // Default to VISA if missing
            
            if (fileType === FILE_TYPES.VISA) {
                setEditData({
                    applicantName: file.applicantName || '',
                    passportNo: file.passportNo || '',
                    contactNo: file.contactNo || '',
                    destination: file.destination || '',
                    serviceCharge: file.serviceCharge || '',
                    cost: file.cost || '',
                    reminderDate: file.reminderDate || '',
                    createdBy: file.createdBy || '',
                    assignedTo: file.assignedTo || ''
                });
            } else if (fileType === FILE_TYPES.AIR_TICKET) {
                setEditData({
                    applicantName: file.applicantName || '',
                    contactNo: file.contactNo || '',
                    airlineRoute: file.airlineRoute || '',
                    airlineSalePrice: file.airlineSalePrice || '',
                    airlineCostPrice: file.airlineCostPrice || '',
                    pnr: file.pnr || '',
                    portal: file.portal || '',
                    createdBy: file.createdBy || '',
                    assignedTo: file.assignedTo || ''
                });
            } else if (fileType === FILE_TYPES.PACKAGE) {
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
                    createdBy: file.createdBy || '',
                    assignedTo: file.assignedTo || ''
                });
            } else if (fileType === FILE_TYPES.PICK_DROP) {
                setEditData({
                    applicantName: file.applicantName || '',
                    contactNo: file.contactNo || '',
                    pickupLocation: file.pickupLocation || '',
                    dropoffLocation: file.dropoffLocation || '',
                    numberOfPersons: file.numberOfPersons || '',
                    salePrice: file.salePrice || '',
                    costPrice: file.costPrice || '',
                    createdBy: file.createdBy || '',
                    assignedTo: file.assignedTo || ''
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
    const assignees = (allUsers || [])
      .map(user => ({ name: user.fullName || user.name || user.username, role: user.role, id: user.id }))
      .filter(user => user.name && user.name !== 'Processing Team');
    const isVisaFile = (file?.fileType || FILE_TYPES.VISA) === FILE_TYPES.VISA;
    const selectableAssignees = isVisaFile
      ? assignees.filter(user => user.role === ROLES.PROCESSING)
      : assignees;
    const currentAssigneeIsListed = assignees.some(user => user.name === editData.assignedTo);
    const currentVisaAssigneeIsListed = selectableAssignees.some(user => user.name === editData.assignedTo);

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

    const renderPICK_DROPFields = () => (
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
                <label className="block text-sm font-medium mb-1 opacity-80">Pickup Location</label>
                <input className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} placeholder="e.g., Hotel ABC" value={editData.pickupLocation} onChange={e => setEditData({...editData, pickupLocation: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Dropoff Location</label>
                <input className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} placeholder="e.g., Airport" value={editData.dropoffLocation} onChange={e => setEditData({...editData, dropoffLocation: e.target.value})} />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-80">Sale Price (৳)</label>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} 
                      value={editData.salePrice} 
                      onChange={e => setEditData({...editData, salePrice: e.target.value})} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 opacity-80">Cost Price (৳)</label>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`} 
                      value={editData.costPrice} 
                      onChange={e => setEditData({...editData, costPrice: e.target.value})} 
                    />
                </div>
            </div>
        </>
    );

    return (
        <div className="modal-backdrop">
            <div className={`rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto ${cardClass}`}>
                <h3 className="text-lg font-bold mb-6">Edit File Details ({file?.fileType || 'File'})</h3>
                <div className="space-y-4">
                    {/* Sales Rep - Admin Only */}
                    {currentUser?.role === ROLES.ADMIN && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1 opacity-80">Sales Rep</label>
                                <select
                                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`}
                                    value={editData.createdBy}
                                    onChange={e => setEditData({...editData, createdBy: e.target.value})}
                                >
                                    <option value="">Select Sales Rep</option>
                                    {allUsers && allUsers.map(u => (
                                        <option key={u.id} value={u.fullName || u.name || u.username}>{u.fullName || u.name || u.username} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 opacity-80">Assigned To</label>
                                <select
                                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`}
                                    value={editData.assignedTo}
                                    onChange={e => setEditData({...editData, assignedTo: e.target.value})}
                                >
                                    {!isVisaFile && <option value="">Unassigned</option>}
                                    {!isVisaFile && <option value="Processing Team">Processing Team</option>}
                                    {isVisaFile && !currentVisaAssigneeIsListed && editData.assignedTo && (
                                        <option value={editData.assignedTo}>{editData.assignedTo} (current assignment)</option>
                                    )}
                                    {!isVisaFile && !currentAssigneeIsListed && editData.assignedTo && (
                                        <option value={editData.assignedTo}>{editData.assignedTo} (current assignment)</option>
                                    )}
                                    {selectableAssignees.map(user => (
                                        <option key={user.id} value={user.name}>{user.name} ({user.role})</option>
                                    ))}
                                </select>
                                {isVisaFile && (
                                  <p className="mt-1 text-xs opacity-70">Visa files are assigned to Processing Agents. Only admins can change this assignment.</p>
                                )}
                            </div>
                        </>
                    )}
                    
                    {(file?.fileType === FILE_TYPES.VISA || !file?.fileType) && renderVISAFields()}
                    {file?.fileType === FILE_TYPES.AIR_TICKET && renderAIR_TICKETFields()}
                    {file?.fileType === FILE_TYPES.PACKAGE && renderPACKAGEFields()}
                    {file?.fileType === FILE_TYPES.PICK_DROP && renderPICK_DROPFields()}
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
    <div className="modal-backdrop">
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
    <div className="modal-backdrop pointer-events-none">
        <div className={`rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in duration-300 text-center ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
            <p className="text-4xl mb-4 animate-bounce">{message}</p>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>This message will close automatically</p>
        </div>
    </div>
  );
}

function NotificationModal({ isOpen, onClose, tasks, onOpenTask, darkMode }) {
  if (!isOpen) return null;

  const activeTasks = tasks.filter(task => task?.status && !isFileCompleted(task));
  const cardClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
  const headerClass = darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100';
  const footerClass = darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100';
  const itemHover = darkMode ? 'hover:bg-slate-800 hover:border-slate-700' : 'hover:bg-slate-50 hover:border-slate-200';

  return (
    <div className="modal-backdrop">
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
          {activeTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
               <CheckCircle className="h-10 w-10 text-slate-200"/>
               <p>You're all caught up! No pending tasks.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTasks.map(task => (
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
  const [incentiveSettings, setIncentiveSettings] = useState([]);
  const [customReportOpen, setCustomReportOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [kpiNow, setKpiNow] = useState(null);

  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100' 
    : 'bg-white border-slate-200 text-slate-900';

  useEffect(() => {
    const updateClock = () => setKpiNow(Date.now());
    const initialTimer = setTimeout(updateClock, 0);
    const timer = setInterval(updateClock, 60_000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, []);

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

    const incentiveRef = doc(db, 'artifacts', appId, 'public', 'data', 'agency_settings', 'incentives');
    const unsubscribeIncentives = onSnapshot(incentiveRef, (snapshot) => {
      if (snapshot.exists()) {
        setIncentiveSettings(snapshot.data().users || []);
      } else {
        setIncentiveSettings([]);
      }
    });

    return () => {
        unsubscribeUsers();
        unsubscribeAtt();
        unsubscribeIncentives();
    };
  }, []);

  const stats = useMemo(() => {
    const start = getStartOf(timeRange, customStartDate ? new Date(customStartDate) : null);
    const end = getEndOf(timeRange, customEndDate ? new Date(customEndDate) : null);
    
    // Safety check - ensure dates are valid
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('Invalid date range:', { start, end, timeRange });
      return {
        processing: { inProcess: 0, submittedToday: 0, docsPendingToday: 0, completedToday: 0, approvals: 0, rejections: 0, totalActions: 0 },
        sales: { successfulDeals: 0, clientComms: 0, destinations: {}, totalActions: 0 },
        finances: { revenue: 0, cost: 0, profit: 0 },
        notes: [],
        attendance: []
      };
    }

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
        profit: 0,
        totalDue: 0,
        unpaidCount: 0,
        partiallyPaidCount: 0,
        paidCount: 0
      },
      notes: [],
      attendance: []
    };

    files.forEach(file => {
      if (userFilter === 'ALL' || file.assignedTo === userFilter) {
        if (file.status !== 'RECEIVED_SALES' && !isFileCompleted(file)) {
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

        // Invoice due calculations
        try {
          const inv = getInvoiceSummary(file);
          reportData.finances.totalDue += Number(inv.dueAmount || 0);
          if (inv.paymentStatus === 'Paid') reportData.finances.paidCount++;
          else if (inv.paymentStatus === 'Partially Paid') reportData.finances.partiallyPaidCount++;
          else reportData.finances.unpaidCount++;
        } catch (e) {
          // ignore malformed invoice data
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

      if (file.history && Array.isArray(file.history)) {
        file.history.forEach(entry => {
          if (!entry || !entry.timestamp) return;
          
          const entryTime = new Date(entry.timestamp);
          if (entryTime >= start && entryTime <= end && (userFilter === 'ALL' || entry.performedBy === userFilter)) {
            reportData.processing.totalActions++;
            reportData.sales.totalActions++;

            if (entry.action && entry.action.includes('Note:')) {
              const noteContent = entry.action.split('Note:')[1].trim();
              reportData.notes.push({
                 file: file.applicantName,
                 note: noteContent,
                 time: entry.timestamp
              });
            }

            if (entry.status === 'SUBMITTED') reportData.processing.submittedToday++;
            if (entry.status === 'DOCS_PENDING') reportData.processing.docsPendingToday++;
            if (isFileCompletedAtStatus(file, entry.status)) {
              reportData.processing.completedToday++;
              if ((file.fileType || FILE_TYPES.VISA) === FILE_TYPES.VISA && entry.result === 'APPROVED') reportData.processing.approvals++;
              if ((file.fileType || FILE_TYPES.VISA) === FILE_TYPES.VISA && entry.result === 'REJECTED') reportData.processing.rejections++;
            }

            // Only count actual customer communications (FOLLOW_UP, DOCS_PENDING)
            // PAYMENT_PENDING is internal embassy payment, not customer communication
            if (entry.status && ['FOLLOW_UP', 'DOCS_PENDING'].includes(entry.status)) {
              reportData.sales.clientComms++;
            }
          }
        });
      }
    });
    
    reportData.finances.profit = reportData.finances.revenue - reportData.finances.cost;

    reportData.attendance = attendanceData.filter(a => {
        if (!a.date) return false;
        
        // Validate date format
        const validation = validateDateFormat(a.date);
        if (!validation.isValid) {
          console.warn(`Invalid attendance date: "${a.date}" for user ${a.userName} - ${validation.error}`);
          return false;
        }
        
        const aDate = parseDateSafe(a.date);
        if (!aDate) return false;
        
        return (userFilter === 'ALL' || a.userName === userFilter) && aDate >= start && aDate <= end;
    }).sort((a,b) => b.firstLoginTime?.seconds - a.firstLoginTime?.seconds);

    const userStats = allUsers.reduce((acc, user) => {
      acc[user.name] = {
        name: user.name,
        role: user.role,
        filesCreated: 0,
        actions: 0,
        invoices: 0,
        complianceTotal: 0,
        complianceCount: 0,
        incompleteFiles: 0,
      };
      return acc;
    }, {});

    files.forEach(file => {
      const fileCreator = file.createdBy || 'Unknown';
      const compliance = getFileComplianceInfo(file);
      if (!userStats[fileCreator]) {
        userStats[fileCreator] = {
          name: fileCreator,
          role: 'Unknown',
          filesCreated: 0,
          actions: 0,
          invoices: 0,
          complianceTotal: 0,
          complianceCount: 0,
          incompleteFiles: 0,
        };
      }

      userStats[fileCreator].filesCreated += 1;
      userStats[fileCreator].complianceTotal += compliance.score;
      userStats[fileCreator].complianceCount += 1;
      if (compliance.missing.length > 0) {
        userStats[fileCreator].incompleteFiles += 1;
        reportData.missingFiles = reportData.missingFiles || [];
        reportData.missingFiles.push({ file, missing: compliance.missing });
      }
      if (file.invoiceNo) {
        userStats[fileCreator].invoices += 1;
      }
    });

    files.forEach(file => {
      if (file.history && Array.isArray(file.history)) {
        file.history.forEach(entry => {
          if (!entry || !entry.timestamp) return;
          const entryTime = new Date(entry.timestamp);
          if (entryTime >= start && entryTime <= end) {
            const performer = entry.performedBy || 'Unknown';
            if (!userStats[performer]) {
              userStats[performer] = {
                name: performer,
                role: 'Unknown',
                filesCreated: 0,
                actions: 0,
                invoices: 0,
                complianceTotal: 0,
                complianceCount: 0,
                incompleteFiles: 0,
              };
            }
            userStats[performer].actions += 1;
          }
        });
      }
    });

    const userUsage = Object.values(userStats).map(user => ({
      ...user,
      complianceScore: user.complianceCount ? Math.round((user.complianceTotal / user.complianceCount) * 100) : 100,
      invoiceCompletion: user.filesCreated ? Math.round((user.invoices / user.filesCreated) * 100) : 0,
    })).sort((a, b) => b.actions - a.actions);

    reportData.userUsage = userUsage;
    reportData.missingFiles = reportData.missingFiles || [];
    reportData.missingInvoiceCount = reportData.missingFiles.filter(item => !item.file.invoiceNo).length;
    reportData.inactiveUsers = userUsage.filter(u => u.filesCreated === 0 && u.actions === 0);

    return reportData;
  }, [files, attendanceData, timeRange, userFilter, customStartDate, customEndDate, allUsers]);

  const incentiveConfigMap = useMemo(() => {
    return new Map((incentiveSettings || []).map(item => [item.name, item]));
  }, [incentiveSettings]);

  // Calculate profit by sales rep
  const profitBySalesRep = useMemo(() => {
    const start = getStartOf(timeRange, customStartDate ? new Date(customStartDate) : null);
    const end = getEndOf(timeRange, customEndDate ? new Date(customEndDate) : null);
    
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [];
    }

    const repData = {};

    files.forEach(file => {
      const fileCreationDate = file.createdAt?.toDate ? file.createdAt.toDate() : new Date(file.createdAt?.seconds * 1000 || 0);
      
      // Only include files from selected date range, created by sales users or admins only
      if (fileCreationDate >= start && fileCreationDate <= end && file.createdBy) {
        const creatorRole = allUsers.find(u => u.name === file.createdBy)?.role;
        // Only count files created by sales users or admins
        if (creatorRole !== ROLES.SALES && creatorRole !== ROLES.ADMIN) {
          return;
        }
        
        const repName = file.createdBy;
        
        if (!repData[repName]) {
          repData[repName] = { name: repName, revenue: 0, cost: 0, files: 0 };
        }

        repData[repName].files++;

        // Calculate revenue and cost based on file type
        if (file.fileType === FILE_TYPES.VISA) {
          repData[repName].revenue += Number(file.serviceCharge || 0);
          repData[repName].cost += Number(file.cost || 0);
        } else if (file.fileType === FILE_TYPES.AIR_TICKET) {
          repData[repName].revenue += Number(file.airlineSalePrice || 0);
          repData[repName].cost += Number(file.airlineCostPrice || 0);
        } else if (file.fileType === FILE_TYPES.PACKAGE) {
          repData[repName].revenue += Number(file.packageSalePrice || 0);
          repData[repName].cost += Number(file.packageCostPrice || 0);
        } else if (file.fileType === FILE_TYPES.PICK_DROP) {
          repData[repName].revenue += Number(file.salePrice || 0);
          repData[repName].cost += Number(file.costPrice || 0);
        } else {
          repData[repName].revenue += Number(file.serviceCharge || 0);
          repData[repName].cost += Number(file.cost || 0);
        }
      }
    });

    // Calculate profit and sort by profit descending
    return Object.values(repData)
      .map(rep => {
        const profit = rep.revenue - rep.cost;
        const config = incentiveConfigMap.get(rep.name);
        return {
          ...rep,
          profit,
          incentiveTarget: config?.target || 0,
          incentive: calculateIncentive(profit, config)
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }, [files, timeRange, customStartDate, customEndDate, allUsers, incentiveConfigMap]);

  const roleKpis = useMemo(() => {
    const start = getStartOf(timeRange, customStartDate ? new Date(customStartDate) : null);
    const end = getEndOf(timeRange, customEndDate ? new Date(customEndDate) : null);
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { sales: [], processing: [] };
    }

    const roleUsers = allUsers.filter(user =>
      [ROLES.SALES, ROLES.PROCESSING].includes(user.role) &&
      (currentUser.role === ROLES.ADMIN
        ? userFilter === 'ALL' || user.name === userFilter
        : user.name === currentUser.name)
    );
    if (![ROLES.SALES, ROLES.PROCESSING].includes(currentUser.role) &&
        currentUser.role !== ROLES.ADMIN && !roleUsers.some(user => user.name === currentUser.name)) {
      return { sales: [], processing: [] };
    }
    if (currentUser.role !== ROLES.ADMIN &&
        [ROLES.SALES, ROLES.PROCESSING].includes(currentUser.role) &&
        !roleUsers.some(user => user.name === currentUser.name)) {
      roleUsers.push({ name: currentUser.name, role: currentUser.role });
    }

    const metrics = new Map(roleUsers.map(user => [user.name, {
      name: user.name,
      role: user.role,
      files: 0,
      followUps: 0,
      revenue: 0,
      cost: 0,
      completenessTotal: 0,
      completenessCount: 0,
      activeAssigned: 0,
      statusActions: 0,
      submitted: 0,
      completed: 0,
      approved: 0,
      rejected: 0,
      currentStatusDaysTotal: 0,
      currentStatusDaysCount: 0
    }]));
    files.forEach(file => {
      const createdAt = getTimestampDate(file.createdAt);
      const creator = metrics.get(file.createdBy);
      if (creator?.role === ROLES.SALES && createdAt && createdAt >= start && createdAt <= end && file.isNewSale !== false) {
        creator.files++;
        const compliance = getFileComplianceInfo(file);
        creator.completenessTotal += compliance.score;
        creator.completenessCount++;
        if (file.fileType === FILE_TYPES.VISA) {
          creator.revenue += Number(file.serviceCharge) || 0;
          creator.cost += Number(file.cost) || 0;
        } else if (file.fileType === FILE_TYPES.AIR_TICKET) {
          creator.revenue += Number(file.airlineSalePrice) || 0;
          creator.cost += Number(file.airlineCostPrice) || 0;
        } else if (file.fileType === FILE_TYPES.PACKAGE) {
          creator.revenue += Number(file.packageSalePrice) || 0;
          creator.cost += Number(file.packageCostPrice) || 0;
        } else if (file.fileType === FILE_TYPES.PICK_DROP) {
          creator.revenue += Number(file.salePrice) || 0;
          creator.cost += Number(file.costPrice) || 0;
        }
      }

      const assignee = metrics.get(file.assignedTo);
      if (assignee?.role === ROLES.PROCESSING && file.status &&
          file.status !== 'RECEIVED_SALES' && !isFileCompleted(file)) {
        assignee.activeAssigned++;
        let statusDate = getTimestampDate(file.statusChangedAt);
        if (!statusDate) {
          const matchingStatusEvents = (file.history || [])
            .filter(entry =>
              entry.status === file.status &&
              !entry.action?.startsWith('Note Added:') &&
              !entry.action?.startsWith('Sales Rep changed')
            )
            .map(entry => getTimestampDate(entry.timestamp))
            .filter(Boolean)
            .sort((a, b) => b.getTime() - a.getTime());
          statusDate = matchingStatusEvents[0] || createdAt;
        }
        if (statusDate && kpiNow !== null) {
          assignee.currentStatusDaysTotal += Math.max(0, kpiNow - statusDate.getTime()) / 86_400_000;
          assignee.currentStatusDaysCount++;
        }
      }

      (file.history || []).forEach(entry => {
        const performedAt = getTimestampDate(entry.timestamp);
        if (!performedAt || performedAt < start || performedAt > end || !entry.status ||
            entry.action?.startsWith('Note Added:') ||
            entry.action?.startsWith('Sales Rep changed')) return;

        const performer = metrics.get(entry.performedBy);
        if (!performer) return;
        if (performer.role === ROLES.SALES) {
          if (['FOLLOW_UP', 'DOCS_PENDING'].includes(entry.status)) performer.followUps++;
          return;
        }

        performer.statusActions++;
        if (entry.status === 'SUBMITTED') performer.submitted++;
        if (isFileCompletedAtStatus(file, entry.status)) performer.completed++;
        if (entry.status === 'DONE' && entry.result === 'APPROVED') performer.approved++;
        if (entry.status === 'DONE' && entry.result === 'REJECTED') performer.rejected++;
      });
    });

    const rows = Array.from(metrics.values()).map(user => ({
      ...user,
      profit: user.revenue - user.cost,
      completeness: user.completenessCount
        ? Math.round((user.completenessTotal / user.completenessCount) * 100)
        : 0,
      averageStatusDays: user.currentStatusDaysCount
        ? user.currentStatusDaysTotal / user.currentStatusDaysCount
        : 0
    }));
    return {
      sales: rows.filter(user => user.role === ROLES.SALES).sort((a, b) => a.name.localeCompare(b.name)),
      processing: rows.filter(user => user.role === ROLES.PROCESSING).sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [files, timeRange, customStartDate, customEndDate, allUsers, currentUser, userFilter, kpiNow]);

  

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
             <span>Generated: {getDhakaDate().toLocaleString()}</span>
          </div>
          <hr className="my-4"/>
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

        {(roleKpis.sales.length > 0 || roleKpis.processing.length > 0) && (
          <section className={`mb-8 rounded-xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="mb-5">
              <h3 className={`text-lg font-bold ${textMain}`}>Role KPI Scorecard</h3>
              <p className={`mt-1 text-sm ${textSub}`}>
                Metrics for the selected period. No targets or composite score are applied.
                Current workload and status age reflect assignments now.
              </p>
            </div>

            {roleKpis.sales.length > 0 && (
              <div className="mb-6">
                <h4 className={`mb-3 font-semibold ${textMain}`}>Sales</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm text-left">
                    <thead className={`text-xs uppercase ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'}`}>
                      <tr>
                        <th className="px-3 py-2">Sales User</th>
                        <th className="px-3 py-2 text-right">Files / Deals</th>
                        <th className="px-3 py-2 text-right">Client Follow-ups</th>
                        <th className="px-3 py-2 text-right">Revenue</th>
                        <th className="px-3 py-2 text-right">Profit</th>
                        <th className="px-3 py-2 text-right">Avg. Completeness</th>
                      </tr>
                    </thead>
                    <tbody className={textMain}>
                      {roleKpis.sales.map(user => (
                        <tr key={user.name} className={`border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                          <td className="px-3 py-3 font-medium">{user.name}</td>
                          <td className="px-3 py-3 text-right">{user.files}</td>
                          <td className="px-3 py-3 text-right">{user.followUps}</td>
                          <td className="px-3 py-3 text-right font-mono">৳{user.revenue.toFixed(2)}</td>
                          <td className={`px-3 py-3 text-right font-mono ${user.profit < 0 ? 'text-red-500' : ''}`}>৳{user.profit.toFixed(2)}</td>
                          <td className="px-3 py-3 text-right">{user.completeness}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {roleKpis.processing.length > 0 && (
              <div>
                <h4 className={`mb-3 font-semibold ${textMain}`}>Processing</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm text-left">
                    <thead className={`text-xs uppercase ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'}`}>
                      <tr>
                        <th className="px-3 py-2">Processing User</th>
                        <th className="px-3 py-2 text-right">Active Assigned</th>
                        <th className="px-3 py-2 text-right">Status Changes</th>
                        <th className="px-3 py-2 text-right">Submitted</th>
                        <th className="px-3 py-2 text-right">Completed</th>
                        <th className="px-3 py-2 text-right">Approved</th>
                        <th className="px-3 py-2 text-right">Rejected</th>
                        <th className="px-3 py-2 text-right">Avg. Current Status Age</th>
                      </tr>
                    </thead>
                    <tbody className={textMain}>
                      {roleKpis.processing.map(user => (
                        <tr key={user.name} className={`border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                          <td className="px-3 py-3 font-medium">{user.name}</td>
                          <td className="px-3 py-3 text-right">{user.activeAssigned}</td>
                          <td className="px-3 py-3 text-right">{user.statusActions}</td>
                          <td className="px-3 py-3 text-right">{user.submitted}</td>
                          <td className="px-3 py-3 text-right">{user.completed}</td>
                          <td className="px-3 py-3 text-right">{user.approved}</td>
                          <td className="px-3 py-3 text-right">{user.rejected}</td>
                          <td className="px-3 py-3 text-right">
                            {user.currentStatusDaysCount ? `${user.averageStatusDays.toFixed(1)} days` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {isAdmin && (
          <div className={`mb-8 p-6 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              <Sparkles className="h-5 w-5 text-sky-500"/> Incentive Tracker & Profit Summary
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Track sales rep profit versus configured incentive targets and see payable incentive amounts for this reporting period.
            </p>
            {profitBySalesRep.length === 0 ? (
              <div className={`rounded-xl border p-4 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  No sales incentive data available for the selected period. Please confirm sales files are attributed to reps and incentive settings are configured.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className={`text-xs uppercase ${darkMode ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-100'}`}>
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Sales Rep</th>
                      <th className="px-4 py-3 text-right">Files</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Cost</th>
                      <th className="px-4 py-3 text-right">Target</th>
                      <th className="px-4 py-3 text-right">Profit</th>
                      <th className="px-4 py-3 rounded-r-lg text-right">Incentive</th>
                    </tr>
                  </thead>
                  <tbody className={textMain}>
                    {profitBySalesRep.map((rep) => (
                      <tr key={rep.name} className={`border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                        <td className="px-4 py-3 font-medium">{rep.name}</td>
                        <td className="px-4 py-3 text-right font-medium">{rep.files}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-mono">৳{rep.revenue.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-red-500 font-mono">৳{rep.cost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-medium font-mono">৳{rep.incentiveTarget.toFixed(2)}</td>
                        <td className={`px-4 py-3 text-right font-bold font-mono ${rep.profit >= 0 ? (darkMode ? 'text-emerald-400' : 'text-emerald-700') : (darkMode ? 'text-red-400' : 'text-red-700')}`}>
                          ৳{rep.profit.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold font-mono ${rep.incentive > 0 ? (darkMode ? 'text-blue-300' : 'text-blue-700') : (darkMode ? 'text-slate-500' : 'text-slate-600')}`}>
                          ৳{rep.incentive.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {isAdmin && stats.userUsage.length > 0 && (
          <div className={`mb-8 p-6 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}><Users className="h-5 w-5 text-indigo-500"/> Usage & Compliance</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Active Staff</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{stats.userUsage.filter(u => u.actions > 0 || u.filesCreated > 0).length}</p>
              </div>
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Incomplete Files</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{stats.missingFiles.length}</p>
              </div>
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Missing Invoices</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{stats.missingInvoiceCount}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className={`text-xs uppercase ${darkMode ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-100'}`}>
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Employee</th>
                    <th className="px-4 py-3 text-right">Files Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                    <th className="px-4 py-3 text-right">Compliance</th>
                    <th className="px-4 py-3 text-right">Invoice Rate</th>
                    <th className="px-4 py-3 rounded-r-lg text-right">Incomplete Files</th>
                  </tr>
                </thead>
                <tbody className={textMain}>
                  {stats.userUsage.map(user => (
                    <tr key={user.name} className={`border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-right">{user.filesCreated}</td>
                      <td className="px-4 py-3 text-right">{user.actions}</td>
                      <td className="px-4 py-3 text-right">{user.complianceScore}%</td>
                      <td className="px-4 py-3 text-right">{user.invoiceCompletion}%</td>
                      <td className="px-4 py-3 text-right">{user.incompleteFiles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
    const dhakaGeneratedTime = getDhakaDate();
    doc.text(`Period: ${timeRange.toUpperCase()} | Generated: ${dhakaGeneratedTime.toLocaleString()}`, margin, yPosition);
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
          const loginTime = att.firstLoginTime ? new Date(att.firstLoginTime?.seconds * 1000).toLocaleTimeString() : 'N/A';
          const logoutTime = att.lastLogoutTime ? new Date(att.lastLogoutTime?.seconds * 1000).toLocaleTimeString() : 'N/A';
          doc.text(`Login: ${loginTime}`, margin + 5, yPosition);
          yPosition += 4;
          doc.text(`Logout: ${logoutTime}`, margin + 5, yPosition);
          yPosition += 4;
          doc.text(`Status: ${att.lastLogoutTime ? 'Completed' : 'Active'}`, margin + 5, yPosition);
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
    <div className="modal-backdrop">
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
      DONE: 'Your application has been completed!',
      SALE_INITIATED: 'Your ticket or travel package request has been received and is being arranged.',
      BOOKED: 'Your flight has been booked. We will update you when the ticket is issued.',
      ISSUED: 'Your flight ticket has been issued.',
      FLIGHT_ISSUED: 'Your package flight ticket has been issued.',
      HOTELS_BOOKED: 'Your package hotel accommodation has been booked.',
      PICKUP_DROPOFF_BOOKED: 'Your package pickup and drop-off service has been booked.',
      PACKAGE_READY: 'Your travel package arrangements are complete.',
      PICKUP_DROP_INITIATED: 'Your pickup and drop-off service request has been received.',
      PICKUP_DROP_BOOKED: 'Your pickup and drop-off service has been booked.',
      PICKUP_DROP_CONFIRMED: 'Your pickup and drop-off service has been confirmed.',
      PICKUP_DROP_COMPLETED: 'Your pickup and drop-off service has been completed.'
    };
    return messages[status] || (STATUS[status]
      ? `Your current status is ${STATUS[status].label}. Please contact us if you need assistance.`
      : 'Please contact us for an update on your application.');
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
function InvoiceModal({ isOpen, onClose, file, paymentMethods = [], cashPaymentNotificationEmails = [], darkMode, onGenerateInvoice }) {
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [showPaidAmountInput, setShowPaidAmountInput] = useState(false);

  if (!isOpen || !file) return null;

  const handleStatusChange = (status) => {
    setPaymentStatus(status);
    setShowPaidAmountInput(status === 'Partially Paid');
  };

  const handleGenerateInvoice = async () => {
    const requestedAmount = paymentStatus === 'Paid'
      ? invoiceAmount
      : paymentStatus === 'Partially Paid'
        ? Math.min(Number(paidAmount) || 0, invoiceAmount)
        : 0;
    if (requestedAmount > getInvoiceSummary(file).paidAmount && !paymentMethodId) {
      alert('Select a payment method for the payment.');
      return;
    }
    if (requestedAmount > getInvoiceSummary(file).paidAmount && !transactionRef.trim()) {
      alert('Enter the payment / transaction reference.');
      return;
    }
    let saved;
    if (paymentStatus === 'Partially Paid') {
      if (!paidAmount || !Number.isFinite(Number(paidAmount)) || Number(paidAmount) < 0) {
        alert('Please enter a valid paid amount');
        return;
      }
      saved = await onGenerateInvoice(file, paymentStatus, paidAmount, paymentMethodId, transactionRef);
    } else {
      saved = await onGenerateInvoice(file, paymentStatus, null, paymentMethodId, transactionRef);
    }
    if (saved) onClose();
  };

  const bgClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass = darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900';
  const invoiceAmount = getInvoiceAmount(file) || 0;
  const requestedPaidAmount = paymentStatus === 'Paid' ? invoiceAmount : paymentStatus === 'Partially Paid' ? Number(paidAmount) || 0 : 0;
  const recordsNewPayment = requestedPaidAmount > getInvoiceSummary(file).paidAmount;
  const showPaymentDetails = paymentStatus === 'Partially Paid' || recordsNewPayment;
  const selectedMethod = paymentMethods.find(method => method.id === paymentMethodId);

  return (
    <div className="modal-backdrop">
      <div className={`${bgClass} rounded-xl border max-w-md w-full overflow-hidden`}>
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
            <p className={`text-2xl font-bold text-green-600`}>৳{invoiceAmount.toFixed(2)}</p>
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
          {showPaymentDetails && (
            <div>
              {paymentStatus === 'Partially Paid' && <p className={`text-xs ${textSub} mb-2`}>Enter the total paid so far. Payment details are saved only for any new amount collected.</p>}
              <label className={`block text-sm font-semibold ${textSub} uppercase tracking-wider mb-2`}>Payment Method / Account</label>
              <select value={paymentMethodId} onChange={e => setPaymentMethodId(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${inputClass}`} required={recordsNewPayment}>
                <option value="">Select payment method</option>
                {paymentMethods.map(method => <option key={method.id} value={method.id}>{[method.name, method.institution, method.accountNumber].filter(Boolean).join(' — ')}</option>)}
              </select>
              {paymentMethods.length === 0 && <p className="text-xs text-red-500 mt-1">An admin must configure a payment method before recording a payment.</p>}
              {isCashPaymentMethod(selectedMethod) && cashPaymentNotificationEmails.length === 0 && <p className="text-xs text-amber-600 mt-1">No cash payment notification email recipients are configured.</p>}
              <label className={`block text-sm font-semibold ${textSub} uppercase tracking-wider mt-3 mb-2`}>Payment / Transaction Reference</label>
              <input
                type="text"
                value={transactionRef}
                onChange={e => setTransactionRef(e.target.value)}
                placeholder="Receipt number, bank reference, or cash voucher"
                maxLength={120}
                required={recordsNewPayment}
                className={`w-full px-3 py-2 rounded-lg border ${inputClass}`}
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

function AccountingPanel({ currentUser, files, miscCosts, paymentMethods = [], cashPaymentNotificationEmails = [], onAddMiscCost, onDeleteMiscCost, darkMode, isAdmin }) {
  const [newMiscCost, setNewMiscCost] = useState({
    description: '',
    amount: '',
    category: 'Operational',
    date: getDhakaTodayString(),
    notes: ''
  });

  const today = new Date();
  const [reportMonth, setReportMonth] = useState(today.getMonth() + 1);
  const [reportYear, setReportYear] = useState(today.getFullYear());
  const [reportType, setReportType] = useState('monthly'); // 'monthly' or 'yearly'

  // Invoice / Accounting quick-search state (moved from Reports)
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceSearchResult, setInvoiceSearchResult] = useState(null);
  const [invoiceSearchLoading, setInvoiceSearchLoading] = useState(false);
  const [invoiceSearchError, setInvoiceSearchError] = useState('');
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentTransactionRef, setPaymentTransactionRef] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [collectionPeriod, setCollectionPeriod] = useState('daily');
  const [collectionDate, setCollectionDate] = useState(getDhakaTodayString());
  const [collectionStartDate, setCollectionStartDate] = useState(getDhakaTodayString());
  const [collectionEndDate, setCollectionEndDate] = useState(getDhakaTodayString());

  const accountingFiles = useMemo(() => {
    return files.filter(isAccountingEligibleFile);
  }, [files]);

  const accountingMiscCosts = useMemo(() => {
    return miscCosts.filter(isAccountingEligibleMiscCost);
  }, [miscCosts]);

  const invoiceStats = useMemo(() => {
    let totalDue = 0;
    let paid = 0;
    let partial = 0;
    let unpaid = 0;
    accountingFiles.forEach(f => {
      try {
        const inv = getInvoiceSummary(f);
        totalDue += Number(inv.dueAmount || 0);
        if (inv.paymentStatus === 'Paid') paid++;
        else if (inv.paymentStatus === 'Partially Paid') partial++;
        else unpaid++;
      } catch (e) {
        // ignore malformed
      }
    });
    return { totalDue, paid, partial, unpaid };
  }, [accountingFiles]);

  const cardClass = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg';
  const textMain = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass = darkMode 
    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:ring-blue-500' 
    : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500';

  const collectionReport = useMemo(() => {
    const currentYearMonth = collectionDate.slice(0, 7);
    const currentYear = collectionDate.slice(0, 4);
    let total = 0;
    let legacyPaid = 0;
    let currentDue = 0;
    const accounts = new Map();
    paymentMethods.forEach(method => {
      const key = JSON.stringify([method.id, method.name, method.institution, method.accountName, method.accountNumber]);
      accounts.set(key, { key, methodId: method.id, methodName: method.name || 'Payment method', institution: method.institution || '', accountName: method.accountName || '', accountNumber: method.accountNumber || '', amount: 0 });
    });
    accountingFiles.forEach(file => {
      const summary = getInvoiceSummary(file);
      currentDue += summary.dueAmount;
      const payments = Array.isArray(file.invoicePayments) ? file.invoicePayments : Array.isArray(file.invoice?.payments) ? file.invoice.payments : [];
      const recordedPaid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
      legacyPaid += Math.max(0, summary.paidAmount - recordedPaid);
      payments.forEach(payment => {
        const receivedAt = payment.receivedAt;
        const receivedDate = receivedAt?.toDate
          ? receivedAt.toDate()
          : receivedAt instanceof Date
            ? receivedAt
            : receivedAt?.seconds
              ? new Date(receivedAt.seconds * 1000)
              : new Date(receivedAt);
        if (!Number.isFinite(receivedDate.getTime())) return;
        const dateKey = new Date(receivedDate.getTime() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const inPeriod = collectionPeriod === 'daily'
          ? dateKey === collectionDate
          : collectionPeriod === 'monthly'
            ? dateKey.startsWith(currentYearMonth)
            : collectionPeriod === 'yearly'
              ? dateKey.startsWith(currentYear)
              : Boolean(collectionStartDate && collectionEndDate && collectionStartDate <= collectionEndDate && dateKey >= collectionStartDate && dateKey <= collectionEndDate);
        if (!inPeriod) return;
        const amount = Number(payment.amount) || 0;
        total += amount;
        const details = {
          methodId: payment.methodId || '',
          methodName: payment.methodName || 'Unspecified legacy account',
          institution: payment.institution || '',
          accountName: payment.accountName || '',
          accountNumber: payment.accountNumber || ''
        };
        const key = JSON.stringify([details.methodId, details.methodName, details.institution, details.accountName, details.accountNumber]);
        if (!accounts.has(key)) accounts.set(key, { key, ...details, amount: 0 });
        accounts.get(key).amount += amount;
      });
    });
    return { total, legacyPaid, currentDue, accounts: [...accounts.values()].sort((a, b) => a.methodName.localeCompare(b.methodName)) };
  }, [accountingFiles, paymentMethods, collectionDate, collectionPeriod, collectionStartDate, collectionEndDate]);

  const recordInvoicePayment = async (markPaid = false) => {
    if (!selectedInvoice) return;
    const method = paymentMethods.find(item => item.id === paymentMethodId);
    if (!method) {
      alert('Select a payment method / account before recording a payment.');
      return;
    }
    if (!paymentTransactionRef.trim()) {
      alert('Enter the payment / transaction reference.');
      return;
    }
    const duplicate = findDuplicatePaymentReference(files, paymentTransactionRef);
    if (duplicate) {
      alert(getDuplicatePaymentReferenceMessage(duplicate));
      return;
    }
    const enteredAmount = Number(paymentAmount);
    if (!markPaid && (!Number.isFinite(enteredAmount) || enteredAmount <= 0)) {
      alert('Enter a valid payment amount.');
      return;
    }
    setPaymentProcessing(true);
    const fileDoc = doc(db, 'artifacts', appId, 'public', 'data', 'visa_files', selectedInvoice.id);
    const paymentId = `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const referenceDoc = doc(db, 'artifacts', appId, 'public', 'data', 'invoice_payment_refs', getPaymentReferenceDocumentId(paymentTransactionRef));
    const shouldNotifyCash = isCashPaymentMethod(method);
    const recipients = Array.isArray(cashPaymentNotificationEmails) ? cashPaymentNotificationEmails : [];
    const mailRef = shouldNotifyCash && recipients.length > 0 ? doc(collection(db, 'mail')) : null;
    try {
      const result = await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(fileDoc);
        if (!snapshot.exists()) throw new Error('Invoice no longer exists.');
        const current = { id: snapshot.id, ...snapshot.data() };
        const referenceSnapshot = await transaction.get(referenceDoc);
        if (referenceSnapshot.exists()) {
          const referenceFileId = referenceSnapshot.data().fileId || referenceSnapshot.data().fileDocId || 'another file';
          throw new Error(`This transaction reference was already used on file ${referenceFileId}. Enter a unique reference.`);
        }
        const summary = getInvoiceSummary(current);
        if (!markPaid && enteredAmount > summary.dueAmount) {
          throw new Error(`Payment exceeds the outstanding due of ${formatCurrency(summary.dueAmount)}.`);
        }
        const existingPaid = summary.paidAmount;
        const newAmount = Math.round(Math.min(markPaid ? summary.dueAmount : enteredAmount, summary.dueAmount) * 100) / 100;
        if (newAmount <= 0) throw new Error('No outstanding amount remains on this invoice.');
        const newPaid = Math.round((existingPaid + newAmount) * 100) / 100;
        const status = newPaid >= summary.amount ? 'Paid' : 'Partially Paid';
        const payment = {
          id: paymentId,
          amount: newAmount,
          receivedAt: Timestamp.now(),
          receivedBy: currentUser.name,
          methodId: method.id,
          methodName: method.name || '',
          institution: method.institution || '',
          accountName: method.accountName || '',
          accountNumber: method.accountNumber || '',
          transactionRef: paymentTransactionRef.trim(),
          note: paymentNote.trim()
        };
        const invoicePayments = [...(Array.isArray(current.invoicePayments) ? current.invoicePayments : Array.isArray(current.invoice?.payments) ? current.invoice.payments : []), payment];
        transaction.update(fileDoc, {
          invoicePaidAmount: newPaid,
          invoicePaymentStatus: status,
          invoicePayments,
          'invoice.paidAmount': newPaid,
          'invoice.paymentStatus': status,
          updatedAt: serverTimestamp()
        });
        transaction.set(referenceDoc, {
          transactionRef: payment.transactionRef,
          normalizedReference: normalizePaymentReference(payment.transactionRef),
          paymentId: payment.id,
          fileDocId: current.id,
          fileId: current.fileId || current.id,
          amount: payment.amount,
          createdAt: serverTimestamp()
        });
        if (mailRef) {
          transaction.set(mailRef, { ...buildCashPaymentMail(current, payment, recipients), createdAt: serverTimestamp() });
        }
        return {
          updated: { ...current, invoicePaidAmount: newPaid, invoicePaymentStatus: status, invoicePayments, invoice: { ...(current.invoice || {}), paidAmount: newPaid, paymentStatus: status, payments: invoicePayments } },
          cashNotificationMissingRecipients: shouldNotifyCash && recipients.length === 0
        };
      });
      const updated = result.updated;
      setSelectedInvoice(updated);
      if (invoiceSearchResult) setInvoiceSearchResult({ hits: invoiceSearchResult.hits.map(hit => hit.id === updated.id ? updated : hit) });
      setPaymentAmount('');
      setPaymentNote('');
      setPaymentTransactionRef('');
      if (result.cashNotificationMissingRecipients) {
        alert('Payment was recorded, but no cash payment notification email recipients are configured.');
      }
    } catch (error) {
      console.error('Failed to record payment:', error);
      alert(`Failed to record payment: ${error.message || 'See console for details.'}`);
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Helper function to get month/year from Firestore timestamp
  const getFileMonthYear = (file) => {
    if (!file.createdAt) return null;
    const date = file.createdAt.toDate ? file.createdAt.toDate() : new Date(file.createdAt);
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear()
    };
  };

  // Helper function to get month/year from date string (YYYY-MM-DD format)
  const getDateMonthYear = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    return {
      month: parseInt(parts[1]),
      year: parseInt(parts[0])
    };
  };

  // Calculate report data based on selected period
  const calculateReport = () => {
    let filteredFiles = [];
    let filteredMiscCosts = [];

    const eligibleFiles = accountingFiles;
    const eligibleMiscCosts = accountingMiscCosts;

    if (reportType === 'monthly') {
      filteredFiles = eligibleFiles.filter(f => {
        const dateInfo = getFileMonthYear(f);
        return dateInfo && dateInfo.month === reportMonth && dateInfo.year === reportYear;
      });

      filteredMiscCosts = eligibleMiscCosts.filter(c => {
        const dateInfo = getDateMonthYear(c.date);
        return dateInfo && dateInfo.month === reportMonth && dateInfo.year === reportYear;
      });
    } else {
      filteredFiles = eligibleFiles.filter(f => {
        const dateInfo = getFileMonthYear(f);
        return dateInfo && dateInfo.year === reportYear;
      });

      filteredMiscCosts = eligibleMiscCosts.filter(c => {
        const dateInfo = getDateMonthYear(c.date);
        return dateInfo && dateInfo.year === reportYear;
      });
    }

    // Calculate revenue by file type
    const revenueByType = {};
    const costByType = {};
    const countByType = {};

    filteredFiles.forEach(f => {
      const type = f.fileType || FILE_TYPES.VISA;
      if (!revenueByType[type]) {
        revenueByType[type] = 0;
        costByType[type] = 0;
        countByType[type] = 0;
      }
      countByType[type]++;

      if (type === FILE_TYPES.VISA) {
        revenueByType[type] += Number(f.serviceCharge) || 0;
        costByType[type] += Number(f.cost) || 0;
      } else if (type === FILE_TYPES.AIR_TICKET) {
        revenueByType[type] += Number(f.airlineSalePrice) || 0;
        costByType[type] += Number(f.airlineCostPrice) || 0;
      } else if (type === FILE_TYPES.PACKAGE) {
        revenueByType[type] += Number(f.packageSalePrice) || 0;
        costByType[type] += Number(f.packageCostPrice) || 0;
      } else if (type === FILE_TYPES.PICK_DROP) {
        revenueByType[type] += Number(f.salePrice) || 0;
        costByType[type] += Number(f.costPrice) || 0;
      }
    });

    const totalRevenue = Object.values(revenueByType).reduce((a, b) => a + b, 0);
    const totalCost = Object.values(costByType).reduce((a, b) => a + b, 0);
    const totalMiscCosts = filteredMiscCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalExpenditure = totalCost + totalMiscCosts;
    const netProfit = totalRevenue - totalExpenditure;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;

    return {
      totalRevenue,
      totalCost,
      totalMiscCosts,
      totalExpenditure,
      netProfit,
      profitMargin,
      revenueByType,
      costByType,
      countByType,
      fileCount: filteredFiles.length,
      miscCostCount: filteredMiscCosts.length
    };
  };

  // Calculate financial totals including all file types (overall)
  const totalRevenue = accountingFiles.reduce((sum, f) => {
    if (f.fileType === FILE_TYPES.VISA) return sum + (Number(f.serviceCharge) || 0);
    if (f.fileType === FILE_TYPES.AIR_TICKET) return sum + (Number(f.airlineSalePrice) || 0);
    if (f.fileType === FILE_TYPES.PACKAGE) return sum + (Number(f.packageSalePrice) || 0);
    if (f.fileType === FILE_TYPES.PICK_DROP) return sum + (Number(f.salePrice) || 0);
    return sum + (Number(f.serviceCharge) || 0); // Default to visa for backward compatibility
  }, 0);
  
  const totalCost = accountingFiles.reduce((sum, f) => {
    if (f.fileType === FILE_TYPES.VISA) return sum + (Number(f.cost) || 0);
    if (f.fileType === FILE_TYPES.AIR_TICKET) return sum + (Number(f.airlineCostPrice) || 0);
    if (f.fileType === FILE_TYPES.PACKAGE) return sum + (Number(f.packageCostPrice) || 0);
    if (f.fileType === FILE_TYPES.PICK_DROP) return sum + (Number(f.costPrice) || 0);
    return sum + (Number(f.cost) || 0); // Default to visa for backward compatibility
  }, 0);
  
  const totalMiscCosts = accountingMiscCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const totalExpenditure = totalCost + totalMiscCosts;
  const netProfit = totalRevenue - totalExpenditure;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;

  const report = calculateReport();

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
      date: getDhakaTodayString(),
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

      {/* Cash Collections */}
      <section className={`rounded-xl border p-5 ${cardClass}`}>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h3 className={`text-lg font-bold ${textMain}`}>Cash Collections</h3>
            <p className={`text-sm ${textSub}`}>Based on recorded payment dates and saved account details.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className={`text-xs ${textSub}`}>Period
              <select value={collectionPeriod} onChange={e => setCollectionPeriod(e.target.value)} className={`block mt-1 px-3 py-2 border rounded-lg text-sm ${inputClass}`}>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom range</option>
              </select>
            </label>
            {collectionPeriod === 'daily' && <label className={`text-xs ${textSub}`}>Date<input type="date" value={collectionDate} onChange={e => setCollectionDate(e.target.value)} className={`block mt-1 px-3 py-2 border rounded-lg text-sm ${inputClass}`} /></label>}
            {collectionPeriod === 'monthly' && <label className={`text-xs ${textSub}`}>Month<input type="month" value={collectionDate.slice(0, 7)} onChange={e => e.target.value && setCollectionDate(`${e.target.value}-01`)} className={`block mt-1 px-3 py-2 border rounded-lg text-sm ${inputClass}`} /></label>}
            {collectionPeriod === 'yearly' && <label className={`text-xs ${textSub}`}>Year<input type="number" min="2000" max="2100" value={collectionDate.slice(0, 4)} onChange={e => /^\d{4}$/.test(e.target.value) && setCollectionDate(`${e.target.value}-01-01`)} className={`block mt-1 w-28 px-3 py-2 border rounded-lg text-sm ${inputClass}`} /></label>}
            {collectionPeriod === 'custom' && <>
              <label className={`text-xs ${textSub}`}>From<input type="date" value={collectionStartDate} onChange={e => setCollectionStartDate(e.target.value)} className={`block mt-1 px-3 py-2 border rounded-lg text-sm ${inputClass}`} /></label>
              <label className={`text-xs ${textSub}`}>To<input type="date" value={collectionEndDate} onChange={e => setCollectionEndDate(e.target.value)} className={`block mt-1 px-3 py-2 border rounded-lg text-sm ${inputClass}`} /></label>
            </>}
          </div>
        </div>
        {collectionPeriod === 'custom' && collectionStartDate > collectionEndDate && <p className="text-sm text-red-500 mb-3">Start date must be on or before end date.</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className={`rounded-lg p-4 ${darkMode ? 'bg-slate-800' : 'bg-green-50'}`}><div className={`text-xs uppercase ${textSub}`}>Collected in period</div><div className={`text-xl font-bold ${textMain}`}>{formatCurrency(collectionReport.total)}</div></div>
          <div className={`rounded-lg p-4 ${darkMode ? 'bg-slate-800' : 'bg-amber-50'}`}><div className={`text-xs uppercase ${textSub}`}>Current outstanding due</div><div className={`text-xl font-bold ${textMain}`}>{formatCurrency(collectionReport.currentDue)}</div></div>
          <div className={`rounded-lg p-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><div className={`text-xs uppercase ${textSub}`}>Unattributed legacy payments (all time)</div><div className={`text-xl font-bold ${textMain}`}>{formatCurrency(collectionReport.legacyPaid)}</div><div className={`text-xs ${textSub}`}>No historical date or account is available for these amounts.</div></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {collectionReport.accounts.map(account => (
            <div key={account.key} className={`rounded-lg border p-4 ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
              <div className={`font-semibold ${textMain}`}>{account.methodName}</div>
              <div className={`text-xs ${textSub}`}>{[account.institution, account.accountName, account.accountNumber].filter(Boolean).join(' · ') || 'No account details'}</div>
              <div className={`mt-2 text-lg font-bold ${textMain}`}>{formatCurrency(account.amount)}</div>
            </div>
          ))}
          {collectionReport.accounts.length === 0 && <p className={`text-sm ${textSub}`}>No payment accounts configured or recorded.</p>}
        </div>
      </section>

      {/* Report Generation Section */}
      <div className={`rounded-xl border p-6 ${cardClass}`}>
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textMain}`}>
          <BarChart3 className="h-5 w-5 text-purple-500"/> Generate Period Report
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${textMain}`}>Report Type</label>
            <select
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none ${inputClass}`}
              value={reportType}
              onChange={e => setReportType(e.target.value)}
            >
              <option value="monthly">Monthly Report</option>
              <option value="yearly">Yearly Report</option>
            </select>
          </div>

          {reportType === 'monthly' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${textMain}`}>Month</label>
              <select
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none ${inputClass}`}
                value={reportMonth}
                onChange={e => setReportMonth(parseInt(e.target.value))}
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((month, idx) => (
                  <option key={idx} value={idx + 1}>{month}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-2 ${textMain}`}>Year</label>
            <input
              type="number"
              min="2020"
              max={today.getFullYear()}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none ${inputClass}`}
              value={reportYear}
              onChange={e => setReportYear(parseInt(e.target.value))}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {}} // Report updates automatically
              className="w-full px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
              title="Report is auto-generated based on selected period"
            >
              <span className="text-sm">Report Ready</span>
            </button>
          </div>
        </div>

        {/* Report Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className={`p-4 rounded-lg border ${darkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-100'}`}>
            <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Period Income</p>
            <p className={`text-xl font-bold mt-1 ${darkMode ? 'text-emerald-300' : 'text-emerald-900'}`}>৳{report.totalRevenue.toFixed(2)}</p>
            <p className={`text-xs mt-1 ${textSub}`}>{report.fileCount} files</p>
          </div>

          <div className={`p-4 rounded-lg border ${darkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-100'}`}>
            <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>Period Costs</p>
            <p className={`text-xl font-bold mt-1 ${darkMode ? 'text-orange-300' : 'text-orange-900'}`}>৳{report.totalCost.toFixed(2)}</p>
            <p className={`text-xs mt-1 ${textSub}`}>Direct costs</p>
          </div>

          <div className={`p-4 rounded-lg border ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100'}`}>
            <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Period Misc</p>
            <p className={`text-xl font-bold mt-1 ${darkMode ? 'text-red-300' : 'text-red-900'}`}>৳{report.totalMiscCosts.toFixed(2)}</p>
            <p className={`text-xs mt-1 ${textSub}`}>{report.miscCostCount} entries</p>
          </div>

          <div className={`p-4 rounded-lg border ${darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-100'}`}>
            <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>Total Expense</p>
            <p className={`text-xl font-bold mt-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-900'}`}>৳{report.totalExpenditure.toFixed(2)}</p>
            <p className={`text-xs mt-1 ${textSub}`}>All costs</p>
          </div>

          <div className={`p-4 rounded-lg border ${report.netProfit >= 0 ? (darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100') : (darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100')}`}>
            <p className={`text-xs font-semibold uppercase ${report.netProfit >= 0 ? (darkMode ? 'text-blue-400' : 'text-blue-700') : (darkMode ? 'text-red-400' : 'text-red-700')}`}>Net Profit</p>
            <p className={`text-xl font-bold mt-1 ${report.netProfit >= 0 ? (darkMode ? 'text-blue-300' : 'text-blue-900') : (darkMode ? 'text-red-300' : 'text-red-900')}`}>৳{report.netProfit.toFixed(2)}</p>
            <p className={`text-xs mt-1 ${textSub}`}>Margin: {report.profitMargin}%</p>
          </div>
        </div>

        {/* Invoice Search (Accounting) */}
        <div className="mt-4 mb-6">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={invoiceSearchTerm}
              onChange={(e) => setInvoiceSearchTerm(e.target.value)}
              placeholder="Search Invoice # or File ID"
              className={`px-3 py-2 border rounded-lg text-sm outline-none w-64 ${inputClass}`}
            />
            <button
              onClick={async () => {
                const term = (invoiceSearchTerm || '').trim();
                if (!term) return;
                setInvoiceSearchLoading(true);
                setInvoiceSearchError('');
                setInvoiceSearchResult(null);
                try {
                  const filesRef = collection(db, 'artifacts', appId, 'public', 'data', 'visa_files');
                  let q1 = query(filesRef, where('invoiceNo', '==', term));
                  const r1 = await getDocs(q1);
                  if (!r1.empty) {
                    setInvoiceSearchResult({ hits: r1.docs.map(d => ({ id: d.id, ...d.data() })) });
                    setInvoiceSearchLoading(false);
                    return;
                  }
                  let q2 = query(filesRef, where('invoice.invoiceNo', '==', term));
                  const r2 = await getDocs(q2);
                  if (!r2.empty) {
                    setInvoiceSearchResult({ hits: r2.docs.map(d => ({ id: d.id, ...d.data() })) });
                    setInvoiceSearchLoading(false);
                    return;
                  }
                  let q3 = query(filesRef, where('fileId', '==', term));
                  const r3 = await getDocs(q3);
                  if (!r3.empty) {
                    setInvoiceSearchResult({ hits: r3.docs.map(d => ({ id: d.id, ...d.data() })) });
                    setInvoiceSearchLoading(false);
                    return;
                  }

                  setInvoiceSearchError('No invoice found for that identifier');
                } catch (e) {
                  console.error('Invoice search error', e);
                  setInvoiceSearchError('Search failed, check console for details');
                } finally {
                  setInvoiceSearchLoading(false);
                }
              }}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm"
            >
              <Search className="inline-block mr-1"/> Search
            </button>

            <div className="ml-6 grid grid-cols-4 gap-4">
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-100'}`}>
                <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>Total Due</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-yellow-200' : 'text-yellow-900'}`}>{formatCurrency(invoiceStats.totalDue)}</p>
              </div>
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>Paid</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>{invoiceStats.paid}</p>
              </div>
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-100'}`}>
                <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>Partial</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-yellow-200' : 'text-yellow-900'}`}>{invoiceStats.partial}</p>
              </div>
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100'}`}>
                <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-red-400' : 'text-red-800'}`}>Unpaid</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-red-200' : 'text-red-900'}`}>{invoiceStats.unpaid}</p>
              </div>
            </div>
          </div>
          
          {/* Invoice Search Result */}
          {invoiceSearchLoading && (
            <div className={`mb-4 p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className={textSub}>Searching invoices...</div>
            </div>
          )}

          {invoiceSearchError && (
            <div className={`mb-4 p-4 rounded-xl border ${darkMode ? 'bg-red-900/10 border-red-800' : 'bg-red-50 border-red-100'}`}>
              <div className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{invoiceSearchError}</div>
            </div>
          )}

          {invoiceSearchResult && invoiceSearchResult.hits && (
            <div className={`mb-6 p-4 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Invoice Search Results ({invoiceSearchResult.hits.length})</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className={`text-xs uppercase ${darkMode ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-100'}`}>
                    <tr>
                      <th className="px-3 py-2">Invoice #</th>
                      <th className="px-3 py-2">File ID</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Created By</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-right">Paid</th>
                      <th className="px-3 py-2 text-right">Due</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className={textMain}>
                    {invoiceSearchResult.hits.map(f => {
                      const inv = getInvoiceSummary(f);
                      return (
                        <tr key={f.id} className={`border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                          <td className="px-3 py-2 font-medium">{f.invoiceNo || f.invoice?.invoiceNo || '-'}</td>
                          <td className="px-3 py-2">{f.fileId || f.id}</td>
                          <td className="px-3 py-2">{f.applicantName || f.mainPersonName || '-'}</td>
                          <td className="px-3 py-2">{f.invoiceCreatedBy || f.invoice?.invoiceCreatedBy || '-'}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(inv.amount)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(inv.paidAmount)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(inv.dueAmount)}</td>
                          <td className="px-3 py-2"><span className={`px-2 py-1 rounded text-xs ${inv.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : inv.paymentStatus === 'Partially Paid' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'}`}>{inv.paymentStatus}</span></td>
                          <td className="px-3 py-2">
                            <button onClick={() => { setSelectedInvoice(f); setInvoiceModalOpen(true); setPaymentAmount(''); setPaymentNote(''); setPaymentTransactionRef(''); setPaymentMethodId(''); }} className="px-2 py-1 rounded bg-blue-600 text-white text-xs">View</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invoice Detail Modal */}
          {invoiceModalOpen && selectedInvoice && (
            <div className="modal-backdrop">
              <div className={`rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200 ${cardClass}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-bold ${textMain}`}>Invoice: {selectedInvoice.invoiceNo || selectedInvoice.invoice?.invoiceNo || selectedInvoice.fileId}</h3>
                  <button onClick={() => setInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">Close</button>
                </div>
                <div className="space-y-3 mb-4">
                  <div className={`p-4 rounded border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between">
                      <div>
                        <div className={`text-sm ${textSub}`}>Customer</div>
                        <div className={`font-medium ${textMain}`}>{selectedInvoice.applicantName || selectedInvoice.mainPersonName || '-'}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm ${textSub}`}>Amount</div>
                        <div className={`font-medium ${textMain}`}>{formatCurrency(getInvoiceSummary(selectedInvoice).amount)}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <div>
                        <div className={`text-sm ${textSub}`}>Paid</div>
                        <div className={`font-medium ${textMain}`}>{formatCurrency(getInvoiceSummary(selectedInvoice).paidAmount)}</div>
                      </div>
                      <div>
                        <div className={`text-sm ${textSub}`}>Due</div>
                        <div className={`font-medium ${textMain}`}>{formatCurrency(getInvoiceSummary(selectedInvoice).dueAmount)}</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className={`text-sm ${textSub}`}>Created By</div>
                      <div className={`font-medium ${textMain}`}>{selectedInvoice.invoiceCreatedBy || selectedInvoice.invoice?.invoiceCreatedBy || '-'}</div>
                    </div>
                  </div>

                  {getInvoiceAdjustments(selectedInvoice).length > 0 && (
                    <div className={`p-4 rounded border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className={`text-sm font-medium mb-2 ${textMain}`}>Price Adjustments</div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {getInvoiceAdjustments(selectedInvoice).map((item, index) => (
                          <div key={item.id || index} className={`text-xs ${textSub}`}>
                            <div className="flex justify-between gap-2">
                              <span>{new Date(item.at).toLocaleString()} · {item.ticketNo || 'No ticket'} · {item.type === 'DISCOUNT' ? 'Discount' : 'Increase'}</span>
                              <span className={`font-semibold ${item.delta < 0 ? 'text-red-500' : 'text-emerald-500'}`}>{formatCurrency(item.oldAmount)} → {formatCurrency(item.newAmount)}</span>
                            </div>
                            <div>By {item.requestedBy || '-'} · Approved: {item.approvedBy || '-'}{item.reason ? ` · ${item.reason}` : ''}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`p-4 rounded border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className={`text-sm font-medium mb-2 ${textMain}`}>Payment History</div>
                    {(selectedInvoice.invoicePayments || selectedInvoice.invoice?.payments || []).length > 0 ? (
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {(selectedInvoice.invoicePayments || selectedInvoice.invoice?.payments || []).map((payment, index) => {
                          const rawDate = payment.receivedAt?.toDate ? payment.receivedAt.toDate() : payment.receivedAt?.seconds ? new Date(payment.receivedAt.seconds * 1000) : new Date(payment.receivedAt);
                          const when = Number.isNaN(rawDate.getTime()) ? 'Date unavailable' : rawDate.toLocaleString();
                          return <div key={payment.id || index} className={`text-xs flex justify-between gap-2 ${textSub}`}>
                            <span>{when} · {[payment.methodName, payment.institution, payment.accountNumber].filter(Boolean).join(' / ') || 'Unattributed legacy payment'}{payment.transactionRef ? ` · Ref: ${payment.transactionRef}` : ''}</span>
                            <span className={`font-semibold ${textMain}`}>{formatCurrency(Number(payment.amount) || 0)}</span>
                          </div>;
                        })}
                      </div>
                    ) : <p className={`text-xs ${textSub}`}>No dated payment records. Existing paid amounts are treated as unattributed legacy payments.</p>}
                  </div>

                  <div className={`p-4 rounded border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="text-sm mb-2">Record Payment</div>
                    <div className="flex gap-2">
                      <input type="number" step="0.01" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Amount" className={`px-3 py-2 border rounded-lg text-sm outline-none ${inputClass} flex-1`} />
                      <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Note (optional)" className={`px-3 py-2 border rounded-lg text-sm outline-none ${inputClass} flex-1`} />
                    </div>
                    <select value={paymentMethodId} onChange={e => setPaymentMethodId(e.target.value)} className={`w-full mt-2 px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`}>
                      <option value="">Select payment method / account</option>
                      {paymentMethods.map(method => <option key={method.id} value={method.id}>{[method.name, method.institution, method.accountNumber].filter(Boolean).join(' — ')}</option>)}
                    </select>
                    <input
                      type="text"
                      value={paymentTransactionRef}
                      onChange={e => setPaymentTransactionRef(e.target.value)}
                      placeholder="Payment / Transaction Ref (required)"
                      maxLength={120}
                      className={`w-full mt-2 px-3 py-2 border rounded-lg text-sm outline-none ${inputClass}`}
                    />
                    {paymentMethods.length === 0 && <p className="text-xs text-red-500 mt-1">Configure a payment method in Admin before recording payments.</p>}
                    <div className="flex gap-2 mt-3">
                      <button disabled={paymentProcessing} onClick={() => recordInvoicePayment(false)} className="px-4 py-2 rounded bg-green-600 text-white">Record</button>
                      <button disabled={paymentProcessing} onClick={() => recordInvoicePayment(true)} className="px-4 py-2 rounded bg-blue-600 text-white">Mark Paid</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* File Type Breakdown for Report */}
        {report.fileCount > 0 && (
          <div className="mt-6">
            <p className={`text-sm font-semibold mb-3 ${textMain}`}>Breakdown by File Type:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(report.revenueByType).map(([type, revenue]) => (
                <div key={type} className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                  <p className={`text-xs font-semibold uppercase ${textSub}`}>{type}</p>
                  <p className={`text-sm font-bold mt-1 ${textMain}`}>{report.countByType[type]} files</p>
                  <div className={`text-xs mt-2 space-y-1 ${textSub}`}>
                    <div>Income: ৳{revenue.toFixed(2)}</div>
                    <div>Cost: ৳{report.costByType[type].toFixed(2)}</div>
                    <div className={`font-semibold ${(revenue - report.costByType[type]) >= 0 ? (darkMode ? 'text-emerald-400' : 'text-emerald-700') : (darkMode ? 'text-red-400' : 'text-red-700')}`}>
                      Profit: ৳{(revenue - report.costByType[type]).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Overall Financial Overview Cards */}
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
          <p className={`text-xs mt-2 ${textSub}`}>{accountingMiscCosts.length} entries</p>
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
          <h3 className={`text-lg font-bold mb-4 ${textMain}`}>Expense Entries ({accountingMiscCosts.length})</h3>
          
          {accountingMiscCosts.length === 0 ? (
            <p className={`text-center py-8 ${textSub}`}>No expense entries yet. Add one to get started.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {accountingMiscCosts.map(cost => (
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