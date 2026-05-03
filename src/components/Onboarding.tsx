import { useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";

export default function Onboarding() {
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);

  const signIn = async (provider: "google" | "apple") => {
    setLoading(provider);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(`Sign-in failed: ${result.error.message}`);
      setLoading(null);
      return;
    }
    if (result.redirected) return;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-b from-rose-50 via-amber-50 to-white px-6 py-12">
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md">
        <div className="mb-6 animate-[bounce_3s_ease-in-out_infinite]">
          <svg width="180" height="180" viewBox="0 0 200 200">
            <defs>
              <radialGradient id="sunBody" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#FFE680" />
                <stop offset="60%" stopColor="#FFC83D" />
                <stop offset="100%" stopColor="#FF9F1C" />
              </radialGradient>
              <radialGradient id="cheek" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FF8FA8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#FF8FA8" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* chubby rays */}
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i * 360) / 12;
              return (
                <ellipse
                  key={i}
                  cx="100"
                  cy="22"
                  rx="9"
                  ry="14"
                  fill="#FFD24D"
                  transform={`rotate(${a} 100 100)`}
                />
              );
            })}
            {/* body */}
            <circle cx="100" cy="100" r="62" fill="url(#sunBody)" stroke="#F59E0B" strokeWidth="2" />
            {/* cheeks */}
            <circle cx="70" cy="115" r="11" fill="url(#cheek)" />
            <circle cx="130" cy="115" r="11" fill="url(#cheek)" />
            {/* eyes (happy closed) */}
            <path d="M75 95 Q82 86 89 95" stroke="#3B2A1A" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M111 95 Q118 86 125 95" stroke="#3B2A1A" strokeWidth="4" fill="none" strokeLinecap="round" />
            {/* smile */}
            <path d="M82 118 Q100 138 118 118" stroke="#3B2A1A" strokeWidth="4" fill="#C2410C" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M86 122 Q100 132 114 122 Q100 126 86 122 Z" fill="#FB7185" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-stone-800 mb-3">Welcome</h1>
        <p className="text-stone-600 text-base leading-relaxed mb-2">
          Your gentle little reminder companion.
        </p>
        <p className="text-stone-500 text-sm">
          Sign in to sync your tasks across devices.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={() => signIn("google")}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-3 bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-60 text-stone-800 font-medium py-3.5 rounded-2xl shadow-sm transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          {loading === "google" ? "Signing in…" : "Continue with Google"}
        </button>

        <button
          onClick={() => signIn("apple")}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-3 bg-black hover:bg-stone-900 disabled:opacity-60 text-white font-medium py-3.5 rounded-2xl shadow-sm transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          {loading === "apple" ? "Signing in…" : "Continue with Apple"}
        </button>

        <p className="text-center text-xs text-stone-400 pt-4">
          By continuing, you agree to our Terms & Privacy.
        </p>
      </div>
    </div>
  );
}
