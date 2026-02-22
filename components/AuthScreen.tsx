import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles, Command } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { User as UserType } from '../types';
import { authService } from '../services/authService';

interface AuthScreenProps {
  onLogin: (user: UserType) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!formData.name.trim()) {
          throw new Error("Name is required");
        }
        const user = await authService.signup(formData.name, formData.email, formData.password);
        onLogin(user);
      } else {
        const user = await authService.login(formData.email, formData.password);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      setIsLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError(null);
      setIsLoading(true);
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const googleUser = await userInfoResponse.json();

        const user = await authService.googleLogin({
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.picture
        });
        onLogin(user);
      } catch (err: any) {
        setError("Google authentication failed. Please try again.");
        setIsLoading(false);
      }
    },
    onError: () => {
      setError("Google authentication was cancelled or failed.");
    }
  });

  return (
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden selection:bg-orange-500/30 text-white">

      {/* --- Premium Cinematic Background --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Animated Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-amber-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />

        {/* Noise overlay for cinematic texture */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%22")' }} />

        {/* Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* --- Main Auth Card --- */}
      <div className="w-full max-w-md bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-[2rem] overflow-hidden relative z-10">

        {/* Card Header */}
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="w-14 h-14 mx-auto bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-2xl flex items-center justify-center shadow-[0_0_30px_-5px_rgba(249,115,22,0.4)] mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-500 cursor-pointer">
            <Command size={28} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            {isSignUp ? 'Create Workspace' : 'Welcome Back'}
          </h1>
          <p className="text-gray-400 text-sm font-light">
            {isSignUp ? 'Join Agent Arga and supercharge your workflow.' : 'Enter your credentials to access your agents.'}
          </p>
        </div>

        {/* Form Body */}
        <div className="px-8 pb-10 space-y-6">

          {error && (
            <div className="bg-red-500/10 text-red-400 text-sm px-4 py-3 rounded-xl border border-red-500/20 flex items-center gap-2">
              <Sparkles size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Login */}
          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={isLoading}
            className="w-full bg-white/5 border border-white/10 text-white font-medium py-3.5 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98] shadow-lg"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin text-gray-400" /> : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <span className="relative bg-[#0a0a0a] px-4 text-xs text-gray-500 font-medium tracking-widest uppercase">
              OR EMAIL
            </span>
          </div>

          {/* Email / Form Auth */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="group relative">
                <User size={18} className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-orange-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Full Name"
                  required={isSignUp}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-600"
                />
              </div>
            )}

            <div className="group relative">
              <Mail size={18} className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-orange-400 transition-colors" />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-600"
              />
            </div>

            <div className="group relative">
              <Lock size={18} className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-orange-400 transition-colors" />
              <input
                type="password"
                placeholder="Password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-600"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3.5 rounded-2xl shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)] hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 overflow-hidden"
            >
              {/* Highlight sweep effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 pointer-events-none" />

              {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                <>
                  {isSignUp ? 'Initialize Workspace' : 'Sign In'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Toggle */}
          <div className="text-center pt-2">
            <p className="text-sm text-gray-500">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-orange-400 font-semibold hover:text-orange-300 transition-colors border-b border-transparent hover:border-orange-400"
              >
                {isSignUp ? 'Sign In' : 'Sign Up Free'}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AuthScreen;