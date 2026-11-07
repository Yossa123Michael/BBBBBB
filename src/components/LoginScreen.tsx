import { useState, useEffect } from 'react';
import {
  Scissors, Eye, EyeOff, Smartphone, RefreshCw,
  ShieldCheck, UserCheck, UserPlus, LogIn, Calendar
} from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
  onOpenCustomerPortal?: () => void;
}

export default function LoginScreen({ onLoginSuccess, onOpenCustomerPortal }: LoginScreenProps) {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'PHONE'>('LOGIN');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showStaffDemo, setShowStaffDemo] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Muat script Google Identity Services (GIS) untuk tombol Continue with Google
  useEffect(() => {
    const scriptId = 'google-oauth-gsi';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fungsi decode JWT dari Google Credential
  const decodeJwtPayload = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch {
      return null;
    }
  };

  // Handler Login / Register Manual (Otomatis cek Staf lalu Pelanggan)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      // 1. Jika Mode REGISTER Pelanggan Baru
      if (mode === 'REGISTER') {
        const res = await fetch(`${API_BASE}/auth/customer/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName,
            email: identifier,
            username: username || identifier.split('@')[0],
            phone,
            password,
          }),
        });
        const result = await res.json();
        if (result.success) {
          localStorage.setItem('barber_auth_user', JSON.stringify(result.data));
          onLoginSuccess(result.data);
        } else {
          setErrorMsg(result.message || 'Gagal membuat akun');
        }
        return;
      }

      // 2. Jika Mode LOGIN atau PHONE: Cek dulu apakah ini akun Staf (Owner/Kasir)
      const targetId = mode === 'PHONE' ? phone : identifier;
      if (targetId.includes('@barber.com')) {
        const staffRes = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetId, password }),
        });
        const staffJson = await staffRes.json();
        if (staffJson.success) {
          localStorage.setItem('barber_auth_user', JSON.stringify(staffJson.data));
          onLoginSuccess(staffJson.data);
          return;
        }
      }

      // 3. Cek ke tabel Pelanggan (Customer) menggunakan Email, Username, atau No. HP
      const custRes = await fetch(`${API_BASE}/auth/customer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: targetId, password }),
      });
      const custJson = await custRes.json();

      if (custJson.success) {
        localStorage.setItem('barber_auth_user', JSON.stringify(custJson.data));
        onLoginSuccess(custJson.data);
      } else {
        setErrorMsg(custJson.message || 'Akun tidak ditemukan atau password salah');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server backend');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler Continue with Google
  const handleGoogleLogin = async () => {
    setErrorMsg('');

    // Jika VITE_GOOGLE_CLIENT_ID sudah dipasang di Vercel/env, buka popup resmi Google
    if (GOOGLE_CLIENT_ID && window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: any) => {
          const payload = decodeJwtPayload(response.credential);
          if (payload?.email) {
            await loginGoogleToBackend(payload.email, payload.name, payload.sub);
          }
        },
      });
      window.google.accounts.id.prompt();
      return;
    }

    // Fallback interaktif jika VITE_GOOGLE_CLIENT_ID belum disetel
    const inputEmail = prompt('Masukkan alamat Gmail Anda untuk melanjutkan dengan Google:', 'pelanggan@gmail.com');
    if (!inputEmail) return;
    const defaultName = inputEmail.split('@')[0].replace(/[._]/g, ' ');
    const inputName = prompt('Nama Lengkap Anda:', defaultName) || defaultName;
    await loginGoogleToBackend(inputEmail, inputName, `google-${Date.now()}`);
  };

  const loginGoogleToBackend = async (email: string, name: string, googleId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/customer/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, googleId }),
      });
      const result = await res.json();
      if (result.success) {
        localStorage.setItem('barber_auth_user', JSON.stringify(result.data));
        onLoginSuccess(result.data);
      } else {
        setErrorMsg(result.message || 'Gagal login dengan Google');
      }
    } catch {
      setErrorMsg('Gagal menghubungi server untuk autentikasi Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#121212] flex flex-col items-center justify-center p-4 text-zinc-100 select-none overflow-y-auto">
      <div className="w-full max-w-[360px] py-6 space-y-6">
        {/* Logo Bulat Putih & Judul (Sesuai Referensi) */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
            <Scissors className="w-6 h-6 text-zinc-950 -rotate-45" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            {mode === 'REGISTER' ? 'Create account' : 'Welcome back'}
          </h1>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form Utama */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'REGISTER' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white block">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan nama lengkap Anda"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#121212] border border-zinc-600 hover:border-white focus:border-white rounded-md py-3 px-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white block">Nomor WhatsApp</label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#121212] border border-zinc-600 hover:border-white focus:border-white rounded-md py-3 px-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors font-mono"
                />
              </div>
            </>
          )}

          {mode === 'PHONE' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white block">Phone number (WhatsApp)</label>
              <input
                type="tel"
                required
                placeholder="Nomor WhatsApp (08xx)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-600 hover:border-white focus:border-white rounded-md py-3 px-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors font-mono"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white block">Email or username</label>
              <input
                type="text"
                required
                placeholder="Email atau username (ID)"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-600 hover:border-white focus:border-white rounded-md py-3 px-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#121212] border border-zinc-600 hover:border-white focus:border-white rounded-md py-3 pl-3.5 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
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
            className="w-full py-3.5 bg-[#1ed760] hover:bg-[#1fdf64] text-zinc-950 font-extrabold text-sm rounded-full transition-all flex items-center justify-center gap-2 active:scale-95 mt-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : mode === 'REGISTER' ? (
              'Sign up'
            ) : (
              'Continue'
            )}
          </button>
        </form>

        {/* Divider "or" */}
        <div className="text-center text-xs font-bold text-zinc-400">or</div>

        {/* Social & Alternative Login Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => setMode(mode === 'PHONE' ? 'LOGIN' : 'PHONE')}
            className="w-full py-3 px-5 rounded-full border border-zinc-600 hover:border-white bg-transparent text-white text-xs font-bold flex items-center justify-center relative transition-all"
          >
            <Smartphone className="w-4 h-4 absolute left-5 text-zinc-300" />
            <span>{mode === 'PHONE' ? 'Continue with email or username' : 'Continue with phone number'}</span>
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3 px-5 rounded-full border border-zinc-600 hover:border-white bg-transparent text-white text-xs font-bold flex items-center justify-center relative transition-all"
          >
            <svg className="w-4 h-4 absolute left-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z" />
              <path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          {onOpenCustomerPortal && (
            <button
              type="button"
              onClick={onOpenCustomerPortal}
              className="w-full py-3 px-5 rounded-full border border-zinc-800 hover:border-zinc-500 bg-zinc-900/60 text-zinc-300 text-xs font-bold flex items-center justify-center relative transition-all"
            >
              <Calendar className="w-4 h-4 absolute left-5 text-emerald-400" />
              <span>Booking Cepat Tanpa Akun (Tamu)</span>
            </button>
          )}
        </div>

        {/* Toggle Daftar / Login */}
        <div className="pt-4 border-t border-zinc-800 text-center space-y-3">
          {mode === 'REGISTER' ? (
            <p className="text-xs text-zinc-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('LOGIN'); setErrorMsg(''); }}
                className="text-white font-bold underline hover:text-[#1ed760] inline-flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" /> Log in here
              </button>
            </p>
          ) : (
            <p className="text-xs text-zinc-400">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('REGISTER'); setErrorMsg(''); }}
                className="text-white font-bold underline hover:text-[#1ed760] inline-flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" /> Sign up for Barbershop
              </button>
            </p>
          )}

          {/* Panel Akun Demo Staf (Bisa dibuka-tutup untuk Sidang / Testing) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowStaffDemo(!showStaffDemo)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono underline"
            >
              {showStaffDemo ? 'Sembunyikan Pintasan Staf' : 'Pintasan Login Staf (Owner / Kasir / Kapster)'}
            </button>

            {showStaffDemo && (
              <div className="mt-3 p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-2 text-left">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setMode('LOGIN'); setIdentifier('owner@barber.com'); setPassword('owner123'); }}
                    className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-gold-500/40 text-[10px]"
                  >
                    <div className="font-bold text-gold-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Akun Owner
                    </div>
                    <div className="text-zinc-500">Isi Otomatis</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('LOGIN'); setIdentifier('kasir@barber.com'); setPassword('kasir123'); }}
                    className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-emerald-500/40 text-[10px]"
                  >
                    <div className="font-bold text-emerald-400 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> Akun Kasir
                    </div>
                    <div className="text-zinc-500">Isi Otomatis</div>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const barberUser = {
                      id: '44444444-4444-4444-4444-444444444444',
                      barber_id: '44444444-4444-4444-4444-444444444444',
                      name: 'Andi',
                      role: 'BARBER',
                    };
                    localStorage.setItem('barber_auth_user', JSON.stringify(barberUser));
                    onLoginSuccess(barberUser);
                  }}
                  className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 text-[10px] flex items-center justify-between"
                >
                  <span className="font-bold text-cyan-400 flex items-center gap-1">
                    <Scissors className="w-3 h-3" /> Masuk Portal Kapster (Andi)
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400">Langsung →</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}