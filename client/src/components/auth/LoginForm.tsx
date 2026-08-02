import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  onSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl flex items-center gap-2.5 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Email Input */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block" htmlFor="login-email">
          Email Address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Mail className="w-5 h-5" />
          </div>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none rounded-xl pl-11 pr-4 py-3 text-slate-100 text-sm placeholder-slate-600 transition-all"
            placeholder="you@college.edu"
            autoComplete="email"
            disabled={loading}
          />
        </div>
      </div>

      {/* Password Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block" htmlFor="login-password">
            Password
          </label>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Lock className="w-5 h-5" />
          </div>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none rounded-xl pl-11 pr-4 py-3 text-slate-100 text-sm placeholder-slate-600 transition-all"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-brand-500/10 hover:shadow-brand-500/25 transition-all duration-300 flex items-center justify-center gap-2 text-sm mt-6 active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Signing In...
          </>
        ) : (
          'Sign In to Abhyaas'
        )}
      </button>
    </form>
  );
};

export default LoginForm;
