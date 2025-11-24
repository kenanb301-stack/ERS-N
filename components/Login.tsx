
import React, { useState } from 'react';
import { Package, User, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basit doğrulama simülasyonu
    if (username === 'admin' && password === 'admin') {
      onLogin({
        username: 'admin',
        name: 'Depo Sorumlusu',
        role: 'ADMIN'
      });
    } else if (username === 'user' && password === 'user') {
      onLogin({
        username: 'user',
        name: 'Misafir Kullanıcı',
        role: 'VIEWER'
      });
    } else {
      setError('Hatalı kullanıcı adı veya şifre!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 transition-colors">
      <div className="mb-8 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 mb-4 transform rotate-3">
          <Package className="text-white" size={40} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">DepoPro</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Stok Takip Sistemi</p>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-fade-in-up">
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Giriş Yap</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Kullanıcı Adı</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Kullanıcı adınız"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
            >
              Giriş Yap <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-center text-slate-400 dark:text-slate-500">
              Demo Hesaplar:
              <br />
              Admin: <strong>admin / admin</strong>
              <br />
              İzleyici: <strong>user / user</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
