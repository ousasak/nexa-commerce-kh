import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from '../../utils/toast';
import {
  FiEye,
  FiEyeOff,
  FiLock,
  FiMoon,
  FiSun,
  FiMail,
  FiShield,
  FiArrowLeft,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiClipboard,
} from 'react-icons/fi';
import {
  login,
  googleVerifyIdentity,
  googleVerifyOtp,
  googleResendOtp,
} from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage, LanguageSwitcher } from '../../i18n';
import { useThemeStore } from '../../stores/themeStore';
import { Footer } from '../../components/layout/Footer';
import { MorphingSquare } from '../../components/common';

const MAX_FAILED = 3;
const BASE_LOCK_MIN = 5;

const fmt = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Google Icon Component
const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 10.01 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export default function Login() {
  const { user, setAuth } = useAuth();
  const { t, isKhmer, language } = useLanguage();
  const navigate = useNavigate();

  // Basic Form State
  const [form, setForm] = useState({
    username: localStorage.getItem('merchant_username') || '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(
    Boolean(localStorage.getItem('merchant_username'))
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEnteringDashboard, setIsEnteringDashboard] = useState(false);
  const [failed, setFailed] = useState(0);
  const [lockLevel, setLockLevel] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const { themeMode, updateThemeMode } = useThemeStore();
  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Google SSO & Gmail OTP States
  const [authStep, setAuthStep] = useState<'LOGIN' | 'GMAIL_OTP'>('LOGIN');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleModalTab, setGoogleModalTab] = useState<'SETUP_CLIENT_ID' | 'DEV_TEST'>('SETUP_CLIENT_ID');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  // Resolve Google Client ID from Vite env, process env, or localStorage
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return (
      (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
      (typeof process !== 'undefined'
        ? (process.env?.VITE_GOOGLE_CLIENT_ID || process.env?.REACT_APP_GOOGLE_CLIENT_ID)
        : '') ||
      localStorage.getItem('google_client_id') ||
      ''
    );
  });
  const [inputClientId, setInputClientId] = useState(googleClientId);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const tokenClientRef = useRef<any>(null);

  useEffect(() => {
    if (user && (user.role === 'shop_owner' || user.role === 'staff')) {
      setIsEnteringDashboard(true);
      const timer = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!lockUntil) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [lockUntil]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Initialize Google Identity Services & OAuth 2.0 Token Client
  useEffect(() => {
    const initGoogle = () => {
      const google = (window as any).google;
      if (!google) return;

      const effectiveId = googleClientId.trim();
      if (!effectiveId) return;

      // 1. Google Identity Services (GSI)
      if (google.accounts?.id) {
        try {
          google.accounts.id.initialize({
            client_id: effectiveId,
            callback: (response: any) => {
              if (response?.credential) {
                processGoogleLogin(response.credential);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
        } catch (e) {
          console.warn('Google Identity initialize error:', e);
        }
      }

      // 2. Google OAuth 2.0 Token Client (Opens Google Account picker window on button click)
      if (google.accounts?.oauth2) {
        try {
          tokenClientRef.current = google.accounts.oauth2.initTokenClient({
            client_id: effectiveId,
            scope: 'openid email profile',
            callback: (tokenResponse: any) => {
              setGoogleLoading(false);
              if (tokenResponse?.access_token) {
                processGoogleLogin(tokenResponse.access_token);
              } else if (tokenResponse?.error) {
                console.warn('Google OAuth response error:', tokenResponse);
                toast.error(
                  isKhmer
                    ? 'ការចូលតាម Google ត្រូវបានបោះបង់ ឬមិនបានសម្រេច'
                    : 'Google sign-in was canceled or failed'
                );
              }
            },
            error_callback: (err: any) => {
              setGoogleLoading(false);
              console.warn('Google OAuth error callback:', err);
            },
          });
        } catch (e) {
          console.warn('Google OAuth2 client error:', e);
        }
      }
    };

    if ((window as any).google?.accounts) {
      initGoogle();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    }
  }, [googleClientId, isKhmer]);

  const lockRemaining = lockUntil ? Math.max(0, Math.ceil((lockUntil - now) / 1000)) : 0;
  const locked = lockRemaining > 0;
  const attemptsLeft = Math.max(0, MAX_FAILED - failed);

  const toggleTheme = () => {
    updateThemeMode(isDark ? 'light' : 'dark');
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    toast(t('auth.forgotPrompt', 'Forgot password? Please contact administrator via Telegram @your_telegram'), {
      icon: '💬',
    });
  };

  // Google Login initiation - triggers Google Account Service API
  const handleGoogleSignIn = () => {
    const effectiveId = googleClientId.trim();

    if (effectiveId) {
      setGoogleLoading(true);

      // Method 1: Google OAuth2 Token Client (opens official accounts.google.com popup)
      if (tokenClientRef.current) {
        try {
          tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (err) {
          console.warn('Token client call failed:', err);
        }
      }

      const google = (window as any).google;
      if (google?.accounts?.oauth2) {
        try {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: effectiveId,
            scope: 'openid email profile',
            callback: (res: any) => {
              setGoogleLoading(false);
              if (res?.access_token) {
                processGoogleLogin(res.access_token);
              }
            },
            error_callback: () => setGoogleLoading(false),
          });
          tokenClientRef.current = client;
          client.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (err) {
          console.warn('Init token client failed:', err);
        }
      }

      // Method 2: Google Identity prompt
      if (google?.accounts?.id) {
        try {
          google.accounts.id.prompt((notification: any) => {
            if (notification?.isNotDisplayed() || notification?.isSkippedMoment()) {
              setGoogleLoading(false);
            }
          });
          return;
        } catch (err) {
          console.warn('Prompt failed:', err);
        }
      }
    }

    // If client ID is missing or pending configuration:
    setGoogleLoading(false);
    setInputClientId(googleClientId);
    setIsGoogleModalOpen(true);
  };

  const handleSaveAndConnectGoogle = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = inputClientId.trim();
    if (!cleanId) {
      toast.error(isKhmer ? 'សូមបញ្ចូល Google OAuth Client ID' : 'Please enter Google OAuth Client ID');
      return;
    }
    localStorage.setItem('google_client_id', cleanId);
    setGoogleClientId(cleanId);
    setIsGoogleModalOpen(false);
    toast.success(
      isKhmer
        ? 'បានរក្សាទុក Client ID! កំពុងបើកផ្ទាំង Google Account...'
        : 'Saved Client ID! Launching Google Account Sign-In...',
      { icon: '🚀' }
    );

    setTimeout(() => {
      const google = (window as any).google;
      if (google?.accounts?.oauth2) {
        setGoogleLoading(true);
        const client = google.accounts.oauth2.initTokenClient({
          client_id: cleanId,
          scope: 'openid email profile',
          callback: (res: any) => {
            setGoogleLoading(false);
            if (res?.access_token) {
              processGoogleLogin(res.access_token);
            }
          },
          error_callback: () => setGoogleLoading(false),
        });
        tokenClientRef.current = client;
        client.requestAccessToken({ prompt: 'select_account' });
      }
    }, 300);
  };

  const processGoogleLogin = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const res = await googleVerifyIdentity(idToken, language || 'kh');
      if (res.requires_verification) {
        setVerifyToken(res.verify_token);
        setMaskedEmail(res.masked_email);
        setOtpCountdown(45);
        setDebugOtp(res.debug_code || null);
        setOtpDigits(['', '', '', '', '', '']);
        setAuthStep('GMAIL_OTP');
        setIsGoogleModalOpen(false);
        toast.success(
          isKhmer
            ? `លេខកូដផ្ទៀងផ្ទាត់ត្រូវបានផ្ញើទៅ Gmail៖ ${res.masked_email}`
            : `Security verification code sent to Gmail: ${res.masked_email}`,
          { icon: '📧', duration: 4500 }
        );
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 150);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        (isKhmer ? 'ការចូលតាម Google មិនបានសម្រេច' : 'Google sign-in failed');
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const submitCustomGoogleEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const email = customGoogleEmail.trim().toLowerCase();
    if (!email) {
      toast.error(isKhmer ? 'សូមបញ្ចូល Gmail របស់ហាង' : 'Please enter your merchant Gmail');
      return;
    }
    const fakeToken = `test_token:${email}:sub_${Date.now()}`;
    processGoogleLogin(fakeToken);
  };

  // OTP Inputs handling
  const handleOtpChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    if (cleaned.length > 1) {
      // Multiple digits entered/pasted/autofilled
      const newDigits = [...otpDigits];
      const startIdx = cleaned.length >= 4 ? 0 : index;
      cleaned.slice(0, 6).split('').forEach((d, i) => {
        const targetPos = startIdx + i;
        if (targetPos < 6) {
          newDigits[targetPos] = d;
        }
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(startIdx + cleaned.length, 5);
      otpInputsRef.current[nextIdx]?.focus();
      return;
    }

    // Single digit typed - replace existing character in that box
    const newDigits = [...otpDigits];
    newDigits[index] = cleaned[cleaned.length - 1];
    setOtpDigits(newDigits);

    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData?.getData('text') || '';
    const cleaned = pastedText.replace(/\D/g, '').slice(0, 6);
    if (!cleaned) return;

    const newDigits = [...otpDigits];
    const startIdx = cleaned.length >= 4 ? 0 : index;
    cleaned.split('').forEach((d, i) => {
      const targetPos = startIdx + i;
      if (targetPos < 6) {
        newDigits[targetPos] = d;
      }
    });
    setOtpDigits(newDigits);

    const targetIdx = Math.min(startIdx + cleaned.length, 5);
    otpInputsRef.current[targetIdx]?.focus();
    toast.success(
      isKhmer ? `បានបិទភ្ជាប់លេខកូដ៖ ${cleaned}` : `Pasted verification code: ${cleaned}`,
      { icon: '📋', duration: 2500 }
    );
  };

  const handleClipboardPaste = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const cleaned = text.replace(/\D/g, '').slice(0, 6);
        if (cleaned) {
          const newDigits = ['', '', '', '', '', ''];
          cleaned.split('').forEach((d, i) => {
            if (i < 6) newDigits[i] = d;
          });
          setOtpDigits(newDigits);
          const targetIdx = Math.min(cleaned.length, 5);
          otpInputsRef.current[targetIdx]?.focus();
          toast.success(
            isKhmer ? `បានបិទភ្ជាប់លេខកូដ៖ ${cleaned}` : `Pasted verification code: ${cleaned}`,
            { icon: '📋', duration: 2500 }
          );
        } else {
          toast.error(
            isKhmer
              ? 'មិនមានលេខកូដក្នុងក្តារតម្បៀតខ្ទាស់ (Clipboard) ទេ'
              : 'No verification code found in clipboard'
          );
        }
      } else {
        toast.error(
          isKhmer
            ? 'សូមចុចលើប្រអប់លេខ រួចចុច Cmd+V ឬ Ctrl+V ដើម្បីបិទភ្ជាប់'
            : 'Please click inside the box and press Cmd+V or Ctrl+V to paste'
        );
      }
    } catch {
      toast.error(
        isKhmer
          ? 'សូមចុចលើប្រអប់លេខ រួចចុច Cmd+V ឬ Ctrl+V ដើម្បីបិទភ្ជាប់'
          : 'Please click inside the box and press Cmd+V or Ctrl+V to paste'
      );
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) {
      toast.error(t('auth.enterCompleteCode', 'Please enter all 6 digits of the code'));
      return;
    }

    setOtpLoading(true);
    try {
      const data = await googleVerifyOtp(verifyToken, code);

      if (data.user.role !== 'shop_owner' && data.user.role !== 'staff' && data.user.role !== 'admin') {
        toast.error(t('auth.merchantOnly', 'This panel is for shop owners and staff only'));
        return;
      }
      if (data.user.role !== 'admin' && !data.user.shop_id) {
        toast.error('Your account is not linked to a shop. Contact admin via Telegram @your_telegram');
        return;
      }

      setAuth(data.access_token, data.user);
      toast.success(t('auth.welcomeBack', 'Welcome back!'));
      setIsEnteringDashboard(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err: any) {
      const detail =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        (isKhmer ? 'លេខកូដមិនត្រឹមត្រូវ' : 'Invalid code');
      toast.error(detail);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || resendingOtp) return;
    setResendingOtp(true);
    try {
      const res = await googleResendOtp(verifyToken, language || 'kh');
      setOtpCountdown(45);
      if (res.debug_code) setDebugOtp(res.debug_code);
      toast.success(
        t('auth.codeResent', 'A new verification code has been sent to your Gmail'),
        { icon: '✨' }
      );
    } catch (err: any) {
      const detail = err?.response?.data?.message || err?.response?.data?.detail || 'Failed to resend code';
      toast.error(detail);
    } finally {
      setResendingOtp(false);
    }
  };

  // Standard username & password login
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;

    if (!form.username.trim() || !form.password) {
      toast.error(t('auth.enterCredentials', 'Please fill in both username/email and password'));
      return;
    }

    setLoading(true);
    try {
      const data = await login({
        username: form.username.trim(),
        password: form.password,
      });

      if (data.user.role !== 'shop_owner' && data.user.role !== 'staff' && data.user.role !== 'admin') {
        toast.error(t('auth.merchantOnly', 'This panel is for shop owners and staff only'));
        return;
      }
      if (data.user.role !== 'admin' && !data.user.shop_id) {
        toast.error('Your account is not linked to a shop. Contact admin via Telegram @your_telegram');
        return;
      }

      if (rememberMe) {
        localStorage.setItem('merchant_username', form.username.trim());
      } else {
        localStorage.removeItem('merchant_username');
      }

      setAuth(data.access_token, data.user);
      toast.success(t('auth.welcomeBack', 'Welcome back!'));
      setIsEnteringDashboard(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.response?.data?.message || 'Login failed';

      if (status === 429) {
        const m = detail.match(/(\d+) min/);
        const s = detail.match(/(\d+) sec/);
        let wait = BASE_LOCK_MIN * 60;
        if (m) wait = parseInt(m[1], 10) * 60;
        if (s) wait += parseInt(s[1], 10);
        setLockUntil(Date.now() + wait * 1000);
        setNow(Date.now());
        setFailed(0);
        toast.error(detail);
      } else if (status === 401) {
        const next = failed + 1;
        setFailed(next);
        if (next >= MAX_FAILED) {
          const nextLevel = lockLevel + 1;
          setLockLevel(nextLevel);
          const waitMin = BASE_LOCK_MIN * Math.pow(2, nextLevel - 1);
          setLockUntil(Date.now() + waitMin * 60 * 1000);
          setNow(Date.now());
          toast.error(`${t('auth.accountLocked', 'Account locked')}. ${t('auth.lockedWait', 'Try again in')} ${waitMin} min.`);
        } else {
          toast.error(detail);
        }
      } else {
        toast.error(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Decorative concentric dashed background pattern */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <svg
          width="686"
          height="671"
          viewBox="0 0 686 671"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[686px] h-[671px] max-w-none text-sky-600 dark:text-sky-500 opacity-60 dark:opacity-20"
        >
          {/* Tilted pill highlight */}
          <path
            d="M442.137 102.265C482.171 64.0112 545.636 65.454 583.89 105.488C622.145 145.522 620.702 208.987 580.668 247.242L242.62 570.26C202.586 608.514 139.121 607.071 100.867 567.037C62.6126 527.003 64.0555 463.538 104.09 425.283L442.137 102.265Z"
            fill="currentColor"
            fillOpacity="0.08"
          />
          <path
            d="M583.529 105.834C621.592 145.668 620.157 208.817 580.322 246.88L242.275 569.898C202.44 607.962 139.292 606.526 101.228 566.691C63.1649 526.857 64.6005 463.708 104.435 425.645L442.482 102.627C482.317 64.5634 545.465 65.9991 583.529 105.834Z"
            stroke="currentColor"
            strokeOpacity="0.16"
          />
          {/* Concentric dashed circles */}
          <circle
            cx="343"
            cy="335"
            r="280"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeDasharray="8 8"
          />
          <circle
            cx="343"
            cy="335"
            r="210"
            stroke="currentColor"
            strokeOpacity="0.18"
            strokeDasharray="6 6"
          />
          <circle
            cx="343"
            cy="335"
            r="140"
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeDasharray="4 4"
          />
        </svg>
      </div>

      {/* Floating Controls (Top Right: Language Switcher & Theme Toggle) */}
      <div className="fixed top-4 right-4 z-20 flex items-center gap-2.5">
        <LanguageSwitcher isNavbarDark={isDark} className="h-9 rounded-lg" />
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="size-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all shadow-xs cursor-pointer"
        >
          {isDark ? <FiSun className="size-4 text-amber-400" /> : <FiMoon className="size-4" />}
        </button>
      </div>

      {/* Main Card Container */}
      <div className="relative z-10 w-full sm:max-w-lg rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8 transition-all">
        
        {/* ================= STEP 1: LOGIN FORM ================= */}
        {authStep === 'LOGIN' ? (
          <>
            {/* Brand Header */}
            <div className="mb-6">
              <a href="/" className="inline-flex items-center gap-2.5 mb-6 outline-none group">
                <div className="size-9 rounded-full overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                  <img
                    src="/logo.svg"
                    alt="Mini Store Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    MiniStore KH
                  </span>
                </div>
              </a>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-1.5">
                  {t('auth.loginTitle')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  {t('auth.loginSubtitle')}
                </p>
              </div>
            </div>

            {/* Lockout or Warning Messages */}
            {locked && (
              <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 p-3 text-center">
                <FiLock className="inline text-red-500 mr-1.5" />
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {t('auth.accountLocked')}
                </span>
                <p className="text-xs text-red-500 mt-1 font-mono">
                  {t('auth.lockedWait')} {fmt(lockRemaining)}
                </p>
              </div>
            )}

            {!locked && attemptsLeft < MAX_FAILED && (
              <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-3 py-2 text-center text-xs text-amber-700 dark:text-amber-300">
                ⚠️ {attemptsLeft} {t('auth.attemptsRemaining')}
              </div>
            )}

            {/* Standard Login Form */}
            <form onSubmit={submit} className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
                  {t('auth.emailOrUsername')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  disabled={locked}
                  placeholder={t('auth.emailPlaceholder')}
                  autoFocus
                  className="h-9 w-full min-w-0 rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-2.5 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-slate-400 focus:border-sky-600 focus:ring-3 focus:ring-sky-500/20 dark:bg-slate-800/30 dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
                  {t('auth.password')} <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    disabled={locked}
                    placeholder={t('auth.passwordPlaceholder')}
                    className="h-9 w-full min-w-0 rounded-md border border-slate-200 dark:border-slate-700 bg-transparent pl-2.5 pr-9 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-slate-400 focus:border-sky-600 focus:ring-3 focus:ring-sky-500/20 dark:bg-slate-800/30 dark:text-white disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FiEyeOff className="size-4" /> : <FiEye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-y-2 pt-1">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500 dark:bg-slate-800/40"
                  />
                  <span>{t('auth.rememberMe')}</span>
                </label>
                <a
                  href="#forgot-password"
                  onClick={handleForgotPassword}
                  className="text-sm text-slate-700 dark:text-slate-300 hover:underline"
                >
                  {t('auth.forgotPassword')}
                </a>
              </div>

              <button
                type="submit"
                disabled={loading || locked}
                className="w-full h-9 rounded-md bg-[#0284c7] hover:bg-[#0369a1] text-white font-medium text-sm transition-all shadow-xs flex items-center justify-center gap-1.5 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none mt-2 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('auth.signingIn')}
                  </span>
                ) : locked ? (
                  `${t('auth.accountLocked')} (${fmt(lockRemaining)})`
                ) : (
                  t('auth.signIn')
                )}
              </button>
            </form>

            {/* Separator */}
            <div className="flex items-center gap-4 my-5">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">{t('auth.or')}</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Sign in with Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:translate-y-px disabled:opacity-50"
            >
              {googleLoading ? (
                <span className="size-4 border-2 border-slate-400 border-t-slate-700 dark:border-t-white rounded-full animate-spin" />
              ) : (
                <GoogleIcon className="size-4" />
              )}
              <span>{t('auth.signInGoogle', 'Sign in with Google')}</span>
            </button>

            {/* Help / Telegram Link */}
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm mt-6">
              {t('auth.noAccount')}{' '}
              <a
                href="https://t.me/your_telegram"
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 dark:text-sky-400 font-medium hover:underline"
              >
                {t('auth.contactAdmin')}
              </a>
            </p>
          </>
        ) : (
          /* ================= STEP 2: GMAIL OTP VERIFY & ALERT VIEW ================= */
          <div className="animate-in fade-in duration-300">
            {/* Back button */}
            <button
              type="button"
              onClick={() => {
                setAuthStep('LOGIN');
                setOtpDigits(['', '', '', '', '', '']);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors cursor-pointer"
            >
              <FiArrowLeft className="size-3.5" />
              <span>{t('auth.cancel', 'Cancel & Back')}</span>
            </button>

            {/* Security Alert Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="size-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                <FiMail className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                  {t('auth.gmailVerifyTitle', 'Gmail Security Verification')}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                  <FiShield className="size-3" />
                  <span>Google Account Verified</span>
                </div>
              </div>
            </div>

            {/* Alert Box */}
            <div className="rounded-lg bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/50 p-3.5 mb-6 text-sm text-slate-700 dark:text-slate-300">
              <p className="leading-relaxed mb-1.5">
                {t('auth.gmailVerifySubtitle', 'For merchant account protection, we sent a 6-digit verification code to your Gmail:')}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-sky-700 dark:text-sky-400">
                  {maskedEmail}
                </span>
                <span className="text-xs text-slate-400">Valid 5m</span>
              </div>
            </div>

            {/* Notice if SMTP password is not yet configured */}
            {debugOtp && (
              <div className="mb-4 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-3 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">⚡ មិនទាន់កំណត់ Gmail App Password (SMTP)</span>
                  <button
                    type="button"
                    onClick={() => setOtpDigits(debugOtp.split(''))}
                    className="underline font-bold text-amber-900 dark:text-amber-200 hover:opacity-80 cursor-pointer ml-2"
                  >
                    Quick-Fill ({debugOtp})
                  </button>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  ដើម្បីឱ្យ OTP ផ្ញើទៅកាន់ Inbox ផ្ទាល់ សូមបង្កើត App Password នៅ <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-semibold">myaccount.google.com/apppasswords</a> រួចដាក់ក្នុង <code>backend/.env</code> (MAIL_PASSWORD)។
                </p>
              </div>
            )}

            {/* 6-Digit OTP Form */}
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div>
                <label className="block text-center text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 select-none">
                  {t('auth.enterSixDigitCode', 'Enter 6-digit verification code')}
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputsRef.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={(e) => handleOtpPaste(idx, e)}
                      onFocus={(e) => e.target.select()}
                      autoFocus={idx === 0}
                      className="size-11 sm:size-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-center text-xl font-bold font-mono text-slate-900 dark:text-white shadow-xs outline-none transition-all focus:border-sky-600 focus:bg-white dark:focus:bg-slate-800 focus:ring-3 focus:ring-sky-500/20"
                    />
                  ))}
                </div>

                {/* Quick Paste from Clipboard */}
                <div className="flex items-center justify-center mt-3">
                  <button
                    type="button"
                    onClick={handleClipboardPaste}
                    className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium inline-flex items-center gap-1.5 py-1 px-3 rounded-full border border-sky-200/80 dark:border-sky-800/60 bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100/70 dark:hover:bg-sky-900/50 transition-all cursor-pointer shadow-xs active:translate-y-px"
                  >
                    <FiClipboard className="size-3.5" />
                    <span>{isKhmer ? 'បិទភ្ជាប់លេខកូដ (Paste Code)' : 'Paste Code'}</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={otpLoading || otpDigits.join('').length < 6}
                className="w-full h-10 rounded-md bg-[#0284c7] hover:bg-[#0369a1] text-white font-medium text-sm transition-all shadow-xs flex items-center justify-center gap-2 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {otpLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('auth.verifyingCode', 'Verifying code...')}
                  </span>
                ) : (
                  <>
                    <FiCheckCircle className="size-4" />
                    <span>{t('auth.verifyAndSignIn', 'Verify & Enter Dashboard')}</span>
                  </>
                )}
              </button>

              {/* Resend Action */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t('auth.codeSentTo', 'Code sent to')} {maskedEmail}
                </span>

                <button
                  type="button"
                  disabled={otpCountdown > 0 || resendingOtp}
                  onClick={handleResendOtp}
                  className="text-sky-600 dark:text-sky-400 font-medium hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1 cursor-pointer"
                >
                  <FiRefreshCw className={`size-3 ${resendingOtp ? 'animate-spin' : ''}`} />
                  <span>
                    {otpCountdown > 0
                      ? `${t('auth.resendIn', 'Resend in')} ${otpCountdown}${t('auth.seconds', 's')}`
                      : t('auth.resendCode', 'Resend Code')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Google Account Service API Modal */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <GoogleIcon className="size-5" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {isKhmer ? 'ចូលតាម Google Account (Service API)' : 'Google Account Service API'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Navigation tabs between Service API Setup and Dev Quick Login */}
            <div className="flex items-center border-b border-slate-100 dark:border-slate-800 mb-4 text-xs font-medium">
              <button
                type="button"
                onClick={() => setGoogleModalTab('SETUP_CLIENT_ID')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                  googleModalTab === 'SETUP_CLIENT_ID'
                    ? 'border-sky-600 text-sky-600 dark:text-sky-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                🔑 {isKhmer ? 'កំណត់ Google OAuth Client ID' : 'Google OAuth Client ID'}
              </button>
              <button
                type="button"
                onClick={() => setGoogleModalTab('DEV_TEST')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                  googleModalTab === 'DEV_TEST'
                    ? 'border-sky-600 text-sky-600 dark:text-sky-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                ⚡ {isKhmer ? 'សាកល្បង Local Dev' : 'Local Dev Quick Test'}
              </button>
            </div>

            {googleModalTab === 'SETUP_CLIENT_ID' ? (
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                  {isKhmer
                    ? 'ដើម្បីឱ្យការចុចប៊ូតុង Google បើកផ្ទាំង Google Account (accounts.google.com) ដោយផ្ទាល់ សូមបញ្ចូល Google OAuth 2.0 Client ID ពី Google Cloud Console៖'
                    : 'To open the official Google Account selector (accounts.google.com) on button click, enter your Google OAuth 2.0 Client ID from Google Cloud Console:'}
                </p>

                <form onSubmit={handleSaveAndConnectGoogle} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Google Client ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={inputClientId}
                      onChange={(e) => setInputClientId(e.target.value)}
                      placeholder="e.g. 1234567890-abcdefg.apps.googleusercontent.com"
                      autoFocus
                      className="h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 font-mono text-xs outline-none placeholder:text-slate-400 focus:border-sky-600 focus:ring-3 focus:ring-sky-500/20 dark:bg-slate-800/30 dark:text-white"
                    />
                  </div>

                  <div className="rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200/70 dark:border-sky-800/50 p-3 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <p className="font-semibold text-sky-700 dark:text-sky-400">
                      💡 {isKhmer ? 'ការកំណត់ក្នុង .env (អចិន្ត្រៃយ៍)៖' : 'Permanent configuration in .env:'}
                    </p>
                    <p className="font-mono text-[10px] bg-white/70 dark:bg-slate-900/60 p-1.5 rounded border border-slate-200/50 dark:border-slate-800 break-all select-all">
                      VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 pt-0.5">
                      {isKhmer
                        ? 'ក្នុង Google Cloud Console សូមបន្ថែម http://localhost:3002 ទៅក្នុង "Authorized JavaScript origins"។'
                        : 'In Google Cloud Console, add http://localhost:3002 to "Authorized JavaScript origins".'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsGoogleModalOpen(false)}
                      className="h-9 px-3.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {t('auth.cancel', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={googleLoading}
                      className="h-9 px-4 rounded-md bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {googleLoading ? (
                        <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <GoogleIcon className="size-3.5" />
                      )}
                      <span>
                        {isKhmer ? 'រក្សាទុក & បើក Google Account' : 'Connect & Open Google'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                  {isKhmer
                    ? 'សាកល្បង Login ក្នុងកំឡុងពេល Development ដោយមិនបាច់ភ្ជាប់ Google Cloud Console (ប្រព័ន្ធនឹងផ្ញើ OTP ផ្ទៀងផ្ទាត់ទៅកាន់ Gmail របស់អ្នក)៖'
                    : 'Quickly test merchant sign-in in development without Google Cloud Console (sends a verification code to your Gmail):'}
                </p>

                <form onSubmit={submitCustomGoogleEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      {isKhmer ? 'អ៊ីមែល Gmail របស់ហាង' : 'Merchant Gmail'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      placeholder="merchant@gmail.com"
                      autoFocus
                      className="h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm outline-none placeholder:text-slate-400 focus:border-sky-600 focus:ring-3 focus:ring-sky-500/20 dark:bg-slate-800/30 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsGoogleModalOpen(false)}
                      className="h-9 px-3.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {t('auth.cancel', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={googleLoading}
                      className="h-9 px-4 rounded-md bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {googleLoading ? (
                        <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FiMail className="size-3.5" />
                      )}
                      <span>{isKhmer ? 'ផ្ញើកូដផ្ទៀងផ្ទាត់ Dev' : 'Send Dev Verification Code'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer className="relative z-10 mt-6" />

      {/* MorphingSquare Loading Screen before entering Dashboard */}
      {isEnteringDashboard && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/85 backdrop-blur-md animate-in fade-in duration-300 select-none">
          <MorphingSquare
            className="w-12 h-12 bg-orange-600 dark:bg-orange-500 shadow-xl shadow-orange-500/30"
            message={
              isKhmer
                ? 'កំពុងផ្ទៀងផ្ទាត់ និងរៀបចំផ្ទាំងគ្រប់គ្រង...'
                : 'Authenticating & preparing dashboard...'
            }
            messagePlacement="bottom"
          />
        </div>
      )}
    </div>
  );
}
