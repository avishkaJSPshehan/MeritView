import Link from "next/link";
import { ClipboardEdit, Search, Lock, Trophy, GraduationCap, ArrowRight } from "lucide-react";
import { getSystemConfig } from "@/app/actions";
import HomeAnalytics from "@/components/HomeAnalytics";

export default async function Home() {
  const config = await getSystemConfig();

  return (
    <div className="flex flex-col items-center justify-center w-full gap-12 sm:gap-16 py-6 sm:py-8">
      
      {/* Hero Section: Two columns on desktop, stacked on mobile */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Left Column: Tagline, Heading & Subtitle */}
          <div className="lg:col-span-5 flex flex-col items-start text-left space-y-5 animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 text-[#e11d48] border border-red-100 text-xs font-bold shadow-xs">
              <GraduationCap className="w-4 h-4 text-[#e11d48]" />
              <span>Your Success • Our Priority</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-black tracking-tight text-neutral-900 leading-[1.12]">
              Modern <span className="text-[#e11d48]">Ranking</span> <br />
              Simplified for You
            </h1>

            <p className="text-neutral-500 font-medium text-base sm:text-lg leading-relaxed max-w-md">
              Track your performance, compare with others and reach your goals — all in one place.
            </p>
          </div>

          {/* Right Column: Featured Simple Banner linking to WhatsApp */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-4 duration-700">
            <a 
              href="https://wa.me/94715500458" 
              target="_blank" 
              rel="noopener noreferrer"
              title="Click to open WhatsApp: 071 5500 458"
              className="block w-full max-w-2xl relative overflow-hidden rounded-[2rem] shadow-xl hover:shadow-2xl hover:scale-[1.008] transition-all duration-300 border border-neutral-800/10 bg-neutral-950 group cursor-pointer"
            >
              <img 
                src="/banner.jpg" 
                alt="Amarasri Herath - Master of IQ | Best Online Class | 071 5500 458" 
                className="w-full h-auto object-cover rounded-[2rem] block select-none"
                loading="eager"
              />
            </a>
          </div>

        </div>
      </div>

      {/* 3 Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Card 1: Enter Marks */}
        {config.marks_entry ? (
          <Link href="/enter-marks" className="group">
            <div className="relative bg-white rounded-[2rem] p-7 sm:p-8 border border-neutral-100 shadow-sm hover:shadow-xl hover:border-rose-200/80 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between h-[280px]">
              {/* Subtle decorative watermark icon */}
              <div className="absolute top-4 right-4 text-rose-500/10 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                <svg className="w-20 h-20" viewBox="0 0 80 80" fill="none">
                  <rect x="10" y="10" width="60" height="60" rx="16" fill="currentColor" fillOpacity="0.4"/>
                  <path d="M24 28h32M24 40h32M24 52h20" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                </svg>
              </div>

              <div>
                <div className="w-14 h-14 rounded-2xl bg-[#e11d48] text-white flex items-center justify-center shadow-lg shadow-rose-500/25 mb-6 group-hover:scale-105 transition-transform">
                  <ClipboardEdit className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900 group-hover:text-[#e11d48] transition-colors">
                  Enter Marks
                </h2>
                <p className="text-neutral-500 mt-2 text-sm font-medium leading-relaxed">
                  Submit new candidate data with instant validation.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-auto">
                <span className="text-[#e11d48] font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                  Go to Enter Marks <ArrowRight className="w-4 h-4" />
                </span>
                <div className="w-8 h-8 rounded-full bg-rose-50 text-[#e11d48] flex items-center justify-center group-hover:bg-[#e11d48] group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="relative bg-neutral-100/80 rounded-[2rem] p-7 sm:p-8 border border-neutral-200 shadow-inner opacity-75 grayscale cursor-not-allowed flex flex-col justify-between h-[280px]">
            <div className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-sm">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <div className="w-14 h-14 rounded-2xl bg-neutral-300 text-neutral-500 flex items-center justify-center mb-6">
                <ClipboardEdit className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-neutral-500">Entry Closed</h2>
              <p className="text-neutral-400 mt-2 text-sm font-medium">
                Marks submission is currently disabled.
              </p>
            </div>
            <div className="pt-4 text-xs font-bold text-neutral-400">Disabled by Admin</div>
          </div>
        )}

        {/* Card 2: Check Report */}
        {config.view_rankings ? (
          <Link href="/check-results" className="group">
            <div className="relative bg-white rounded-[2rem] p-7 sm:p-8 border border-neutral-100 shadow-sm hover:shadow-xl hover:border-blue-200/80 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between h-[280px]">
              {/* Subtle decorative watermark icon */}
              <div className="absolute top-4 right-4 text-blue-500/10 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                <svg className="w-20 h-20" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="30" fill="currentColor" fillOpacity="0.4"/>
                  <path d="M26 50l8-10 8 6 12-16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div>
                <div className="w-14 h-14 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center shadow-lg shadow-blue-500/25 mb-6 group-hover:scale-105 transition-transform">
                  <Search className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900 group-hover:text-[#2563eb] transition-colors">
                  Check Report
                </h2>
                <p className="text-neutral-500 mt-2 text-sm font-medium leading-relaxed">
                  Access your individual performance report using NIC.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-auto">
                <span className="text-[#2563eb] font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                  Go to Check Report <ArrowRight className="w-4 h-4" />
                </span>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center group-hover:bg-[#2563eb] group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="relative bg-neutral-100/80 rounded-[2rem] p-7 sm:p-8 border border-neutral-200 shadow-inner opacity-75 grayscale cursor-not-allowed flex flex-col justify-between h-[280px]">
            <div className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-sm">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <div className="w-14 h-14 rounded-2xl bg-neutral-300 text-neutral-500 flex items-center justify-center mb-6">
                <Search className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-neutral-500">Results Hidden</h2>
              <p className="text-neutral-400 mt-2 text-sm font-medium">
                Rankings are currently private.
              </p>
            </div>
            <div className="pt-4 text-xs font-bold text-neutral-400">Disabled by Admin</div>
          </div>
        )}

        {/* Card 3: Leaderboard */}
        {config.view_rankings ? (
          <Link href="/leaderboard" className="group">
            <div className="relative bg-white rounded-[2rem] p-7 sm:p-8 border border-neutral-100 shadow-sm hover:shadow-xl hover:border-amber-200/80 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between h-[280px]">
              {/* Subtle decorative watermark icon */}
              <div className="absolute top-4 right-4 text-amber-500/10 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                <svg className="w-20 h-20" viewBox="0 0 80 80" fill="none">
                  <rect x="15" y="40" width="16" height="24" rx="4" fill="currentColor" fillOpacity="0.4"/>
                  <rect x="32" y="24" width="16" height="40" rx="4" fill="currentColor" fillOpacity="0.5"/>
                  <rect x="49" y="48" width="16" height="16" rx="4" fill="currentColor" fillOpacity="0.4"/>
                </svg>
              </div>

              <div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 mb-6 group-hover:scale-105 transition-transform">
                  <Trophy className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900 group-hover:text-amber-600 transition-colors">
                  Leaderboard
                </h2>
                <p className="text-neutral-500 mt-2 text-sm font-medium leading-relaxed">
                  View top performers and motivational rankings.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-auto">
                <span className="text-amber-600 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                  Go to Leaderboard <ArrowRight className="w-4 h-4" />
                </span>
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="relative bg-neutral-100/80 rounded-[2rem] p-7 sm:p-8 border border-neutral-200 shadow-inner opacity-75 grayscale cursor-not-allowed flex flex-col justify-between h-[280px]">
            <div className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-sm">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <div className="w-14 h-14 rounded-2xl bg-neutral-300 text-neutral-500 flex items-center justify-center mb-6">
                <Trophy className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-neutral-500">Board Locked</h2>
              <p className="text-neutral-400 mt-2 text-sm font-medium">
                The leaderboard is currently private.
              </p>
            </div>
            <div className="pt-4 text-xs font-bold text-neutral-400">Disabled by Admin</div>
          </div>
        )}
      </div>

      {/* Analytics Section */}
      <div className="w-full bg-neutral-50/50 border-y border-neutral-100">
        <HomeAnalytics />
      </div>

    </div>
  );
}
