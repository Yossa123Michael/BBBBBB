import { useState, useEffect } from 'react';
import {
  Smartphone,
  RefreshCw,
  Scissors,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  UserPlus,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { API_BASE } from '../config/api';

type AuthMode = 'LOGIN' | 'REGISTER';
type InputMode = 'EMAIL' | 'PHONE';
type SocialProvider = 'GOOGLE' | 'FACEBOOK' | 'APPLE';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
  onOpenCustomerPortal?: () => void;
  initialMode?: AuthMode;
}

export default function LoginScreen({
  onLoginSuccess,
  onOpenCustomerPortal,
  initialMode = 'LOGIN',
}: LoginScreenProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [inputMode, setInputMode] = useState<InputMode>('EMAIL');

  // Form Login State (Unified untuk Customer, Kapster, Kasir, dan Owner)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form Register State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regNotes, setRegNotes] = useState('');

  // Status & Modal Social Auth
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDemoHelper, setShowDemoHelper] = useState(false);

  const [socialModal, setSocialModal] = useState<SocialProvider | null>(null);
  const [useCustomSocial, setUseCustomSocial] = useState(false);
  const [customSocialName, setCustomSocialName] = useState('');
  const [customSocialEmail, setCustomSocialEmail] = useState('');
  const [customSocialPhone, setCustomSocialPhone] = useState('');

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  // Submit Login (Otomatis mendeteksi Role dari Database PostgreSQL)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Silakan isi email/nomor telepon dan password Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          email: identifier.trim(),
          password,
          role: 'AUTO',
        }),
      });
      const result = await res.json();

      if (result.success) {
        localStorage.setItem('barber_auth_user', JSON.stringify(result.data));
        onLoginSuccess(result.data);
      } else {
        setErrorMsg(result.message || 'Gagal masuk. Periksa kembali akun Anda.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server backend. Pastikan API aktif di port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Daftar Akun Baru
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/auth/register-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regName.trim(),
          phone: regPhone.trim(),
          email: regEmail.trim() || undefined,
          password: regPassword,
          haircutNotes: regNotes.trim() || undefined,
        }),
      });
      const result = await res.json();

      if (result.success) {
        localStorage.setItem('barber_auth_user', JSON.stringify(result.data));
        onLoginSuccess(result.data);
      } else {
        setErrorMsg(result.message || 'Gagal mendaftarkan akun baru.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server backend. Pastikan API aktif di port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  // Eksekusi Login Sosial (Google / Facebook / Apple) -> Tersimpan ke PostgreSQL
  const executeSocialLogin = async (account: {
    name: string;
    email: string;
    phone?: string;
    provider: SocialProvider;
  }) => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/auth/social-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: account.provider,
          name: account.name,
          email: account.email,
          phone: account.phone,
        }),
      });
      const result = await res.json();

      if (result.success) {
        setSocialModal(null);
        localStorage.setItem('barber_auth_user', JSON.stringify(result.data));
        onLoginSuccess(result.data);
      } else {
        setErrorMsg(result.message || `Gagal masuk dengan ${account.provider}`);
        setSocialModal(null);
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server backend. Pastikan API aktif di port 5000.');
      setSocialModal(null);
    } finally {
      setIsLoading(false);
    }
  };

  const socialAccounts = [
    {
      name: 'John Doe',
      email: 'pelanggan@gmail.com',
      phone: '081299887766',
      roleLabel: 'Customer VIP • 24 Pts',
    },
    {
      name: 'Kapster Andi',
      email: 'andi@barber.com',
      phone: '08130000001',
      roleLabel: 'Barber / Kapster',
    },
    {
      name: 'Owner Barbershop',
      email: 'owner@barber.com',
      phone: '08110000001',
      roleLabel: 'Owner Dashboard',
    },
  ];

  return (
    <div className="min-h-[100dvh] w-screen bg-[#121212] text-white flex flex-col justify-between select-none overflow-y-auto font-sans">
      {/* Top Bar Minimalis: Tombol Kembali ke Beranda & Tombol Daftar/Masuk (Gaya Spotify) */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        {onOpenCustomerPortal ? (
          <button
            type="button"
            onClick={onOpenCustomerPortal}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Beranda Booking</span>
          </button>
        ) : (
          <div />
        )}

        {/* Header Kanan Atas Persis Gambar 1 Spotify: "Daftar" & Kapsul Putih "Masuk" */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => {
              setAuthMode('REGISTER');
              setErrorMsg('');
            }}
            className={`text-sm font-bold transition-colors ${
              authMode === 'REGISTER' ? 'text-white' : 'text-zinc-400 hover:text-white hover:scale-105'
            }`}
          >
            Daftar
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('LOGIN');
              setErrorMsg('');
            }}
            className="bg-white hover:bg-zinc-100 hover:scale-105 text-black font-bold text-sm px-7 py-2.5 rounded-full transition-all active:scale-95"
          >
            Masuk
          </button>
        </div>
      </header>

      {/* Konten Utama Terpusat (Persis Gambar 2 Spotify "Welcome back") */}
      <main className="w-full max-w-[360px] mx-auto px-4 py-6 flex flex-col items-center my-auto">
        {/* Logo Bulat di Tengah Atas */}
        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center mb-4 shadow-lg">
          <Scissors className="w-6 h-6" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-center mb-8">
          {authMode === 'LOGIN' ? 'Welcome back' : 'Daftar akun baru'}
        </h1>

        {errorMsg && (
          <div className="w-full mb-5 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {authMode === 'REGISTER' ? (
          /* ================= FORM DAFTAR AKUN BARU ================= */
          <form onSubmit={handleRegister} className="w-full space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-white">Nama lengkap</label>
              <input
                type="text"
                required
                placeholder="Masukkan nama lengkap"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-600 hover:border-white focus:border-white rounded-md px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-white">Nomor telepon (WhatsApp)</label>
              <input
                type="tel"
                required
                placeholder="0812xxxxxxxx"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-600 hover:border-white focus:border-white rounded-md px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-white">Email atau username</label>
              <input
                type="text"
                placeholder="nama@domain.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-600 hover:border-white focus:border-white rounded-md px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-white">Buat password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimal 6 karakter"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-[#121212] border border-zinc-600 hover:border-white focus:border-white rounded-md px-3.5 py-3 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-white">
                Catatan gaya rambut (opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Low taper fade, rapi samping"
                value={regNotes}
                onChange={(e) => setRegNotes(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-600 hover:border-white focus:border-white rounded-md px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-2 bg-[#1ed760] hover:bg-[#3be477] text-black font-bold text-sm rounded-full transition-all flex items-center justify-center active:scale-95"
            >
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Daftar Sekarang'}
            </button>
          </form>
        ) : (
          /* ================= FORM LOGIN GAYA SPOTIFY ================= */
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-white">
                {inputMode === 'EMAIL' ? 'Email or username' : 'Phone number'}
              </label>
              <input
                type={inputMode === 'PHONE' ? 'tel' : 'text'}
                required
                placeholder={
                  inputMode === 'EMAIL'
                    ? 'Email atau username (ID)'
                    : 'Nomor handphone (contoh: 081299887766)'
                }
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-600 hover:border-white focus:border-white rounded-md px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-white">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#121212] border border-zinc-600 hover:border-white focus:border-white rounded-md px-3.5 py-3 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#1ed760] hover:bg-[#3be477] text-black font-bold text-sm rounded-full transition-all flex items-center justify-center active:scale-95"
            >
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Continue'}
            </button>
          </form>
        )}

        {/* Pemisah "or" */}
        <div className="w-full my-5 text-center">
          <span className="text-xs font-bold text-zinc-300">or</span>
        </div>

        {/* Deretan Tombol Kapsul Vertikal Persis Spotify */}
        <div className="w-full space-y-2.5">
          {/* 1. Continue with phone number / email */}
          <button
            type="button"
            onClick={() => {
              setAuthMode('LOGIN');
              if (inputMode === 'EMAIL') {
                setInputMode('PHONE');
                setIdentifier('081299887766');
                setPassword('member123');
              } else {
                setInputMode('EMAIL');
                setIdentifier('');
              }
            }}
            className="w-full py-3 px-5 rounded-full border border-zinc-600 hover:border-white text-white font-bold text-sm flex items-center relative transition-all active:scale-95"
          >
            <Smartphone className="w-5 h-5 absolute left-5 text-zinc-200" />
            <span className="w-full text-center">
              {inputMode === 'EMAIL'
                ? 'Continue with phone number'
                : 'Continue with email or ID'}
            </span>
          </button>

          {/* 2. Continue with Google */}
          <button
            type="button"
            onClick={() => {
              setUseCustomSocial(false);
              setSocialModal('GOOGLE');
            }}
            className="w-full py-3 px-5 rounded-full border border-zinc-600 hover:border-white text-white font-bold text-sm flex items-center relative transition-all active:scale-95"
          >
            <svg className="w-5 h-5 absolute left-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.9C3.5 21.4 7.4 24 12 24z"
              />
            </svg>
            <span className="w-full text-center">Continue with Google</span>
          </button>

          {/* 3. Continue with Facebook */}
          <button
            type="button"
            onClick={() => {
              setUseCustomSocial(false);
              setSocialModal('FACEBOOK');
            }}
            className="w-full py-3 px-5 rounded-full border border-zinc-600 hover:border-white text-white font-bold text-sm flex items-center relative transition-all active:scale-95"
          >
            <svg className="w-5 h-5 absolute left-5" viewBox="0 0 24 24">
              <path
                fill="#1877F2"
                d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
              />
            </svg>
            <span className="w-full text-center">Continue with Facebook</span>
          </button>

          {/* 4. Continue with Apple */}
          <button
            type="button"
            onClick={() => {
              setUseCustomSocial(false);
              setSocialModal('APPLE');
            }}
            className="w-full py-3 px-5 rounded-full border border-zinc-600 hover:border-white text-white font-bold text-sm flex items-center relative transition-all active:scale-95"
          >
            <svg className="w-5 h-5 absolute left-5 fill-white" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            <span className="w-full text-center">Continue with Apple</span>
          </button>
        </div>

        {/* Footer Toggle Daftar / Masuk */}
        <div className="w-full mt-8 pt-6 border-t border-zinc-800 text-center space-y-4">
          {authMode === 'LOGIN' ? (
            <p className="text-sm text-zinc-400">
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('REGISTER');
                  setErrorMsg('');
                }}
                className="text-white font-bold underline hover:text-[#1ed760]"
              >
                Daftar ke Barbershop OS
              </button>
            </p>
          ) : (
            <p className="text-sm text-zinc-400">
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('LOGIN');
                  setErrorMsg('');
                }}
                className="text-white font-bold underline hover:text-[#1ed760]"
              >
                Masuk di sini
              </button>
            </p>
          )}

          {/* Panel Pintasan Akun Demo (Untuk Menguji Role Otomatis Database) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDemoHelper(!showDemoHelper)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-1 mx-auto"
            >
              <span>Pintasan Uji Akun (Customer, Kapster, Kasir, Owner)</span>
              {showDemoHelper ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showDemoHelper && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-left">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('LOGIN');
                    setInputMode('PHONE');
                    setIdentifier('081299887766');
                    setPassword('member123');
                  }}
                  className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-[11px]"
                >
                  <div className="font-bold text-white">Customer</div>
                  <div className="text-zinc-400 font-mono text-[10px]">081299887766</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('LOGIN');
                    setInputMode('EMAIL');
                    setIdentifier('andi');
                    setPassword('kapster123');
                  }}
                  className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-[11px]"
                >
                  <div className="font-bold text-cyan-400">Kapster (Andi)</div>
                  <div className="text-zinc-400 font-mono text-[10px]">ID: andi</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('LOGIN');
                    setInputMode('EMAIL');
                    setIdentifier('kasir@barber.com');
                    setPassword('kasir123');
                  }}
                  className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-[11px]"
                >
                  <div className="font-bold text-emerald-400">Kasir POS</div>
                  <div className="text-zinc-400 font-mono text-[10px]">kasir@barber.com</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('LOGIN');
                    setInputMode('EMAIL');
                    setIdentifier('owner@barber.com');
                    setPassword('owner123');
                  }}
                  className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-[11px]"
                >
                  <div className="font-bold text-gold-400">Owner</div>
                  <div className="text-zinc-400 font-mono text-[10px]">owner@barber.com</div>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="h-6" />

      {/* ================= MODAL POPUP OAUTH GOOGLE / FACEBOOK / APPLE ================= */}
      {socialModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white">
                  Continue with {socialModal.charAt(0) + socialModal.slice(1).toLowerCase()}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Pilih akun untuk disimpan/masuk ke database Barbershop OS
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSocialModal(null)}
                className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!useCustomSocial ? (
              <div className="space-y-2">
                {socialAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={isLoading}
                    onClick={() =>
                      executeSocialLogin({
                        name: acc.name,
                        email: acc.email,
                        phone: acc.phone,
                        provider: socialModal,
                      })
                    }
                    className="w-full p-3 rounded-2xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-white/40 text-left flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 text-white font-bold text-xs flex items-center justify-center">
                        {acc.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{acc.name}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">{acc.email}</div>
                        <span className="inline-block mt-0.5 text-[9px] text-[#1ed760] font-mono">
                          {acc.roleLabel}
                        </span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-zinc-500 group-hover:text-white" />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setUseCustomSocial(true)}
                  className="w-full py-2.5 px-3 rounded-full border border-zinc-700 hover:border-white text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Gunakan Akun Lain</span>
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeSocialLogin({
                    name: customSocialName,
                    email: customSocialEmail,
                    phone: customSocialPhone,
                    provider: socialModal,
                  });
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Anda"
                    value={customSocialName}
                    onChange={(e) => setCustomSocialName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="email@gmail.com"
                    value={customSocialEmail}
                    onChange={(e) => setCustomSocialEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">
                    Nomor Telepon / WA
                  </label>
                  <input
                    type="tel"
                    placeholder="0812xxxxxxxx"
                    value={customSocialPhone}
                    onChange={(e) => setCustomSocialPhone(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setUseCustomSocial(false)}
                    className="flex-1 py-2.5 bg-zinc-800 rounded-full text-xs font-bold text-zinc-300"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 bg-[#1ed760] rounded-full text-xs font-bold text-black"
                  >
                    Lanjutkan
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
