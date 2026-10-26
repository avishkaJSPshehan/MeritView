"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Trophy, Home as HomeIcon, Settings } from "lucide-react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isLeaderboard = pathname === "/leaderboard";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <header className="sticky top-3 sm:top-4 z-50 w-full px-4 sm:px-6 lg:px-8 transition-all">
      <div className="max-w-7xl mx-auto bg-[#f8f9fc]/60 backdrop-blur-md border border-neutral-200/60 shadow-sm rounded-2xl sm:rounded-[2rem] px-4 sm:px-8">
        <div className="h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-[#e11d48] text-white w-9 h-9 flex items-center justify-center rounded-xl font-black text-xl shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
              A
            </div>
            <span className="font-extrabold text-2xl text-neutral-900 tracking-tight">
              MeritView
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              href="/" 
              className={`flex items-center gap-2 text-sm font-bold transition-all relative py-1 ${
                isHome 
                  ? 'text-neutral-900 border-b-2 border-[#e11d48]' 
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <HomeIcon className="w-4 h-4 text-[#e11d48]" />
              <span>Home</span>
            </Link>

            <Link 
              href="/leaderboard" 
              className={`flex items-center gap-2 text-sm font-semibold transition-all relative py-1 ${
                isLeaderboard 
                  ? 'text-neutral-900 border-b-2 border-[#e11d48]' 
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Trophy className="w-4 h-4 text-neutral-500" />
              <span>Leaderboard</span>
            </Link>

            <Link 
              href="/admin/login" 
              className={`flex items-center gap-2 text-sm font-semibold transition-all relative py-1 ${
                isAdmin 
                  ? 'text-neutral-900 border-b-2 border-[#e11d48]' 
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Settings className="w-4 h-4 text-neutral-500" />
              <span>Admin</span>
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-neutral-700 hover:text-neutral-900 p-2 rounded-xl hover:bg-neutral-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav Overlay */}
        {isOpen && (
          <div className="md:hidden pb-5 pt-2 space-y-2 border-t border-neutral-200/60 animate-in fade-in slide-in-from-top-3 duration-200">
            <Link 
              href="/" 
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                isHome ? 'bg-red-50 text-[#e11d48]' : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <HomeIcon className="w-4 h-4 text-[#e11d48]" />
              Home
            </Link>
            <Link 
              href="/leaderboard" 
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                isLeaderboard ? 'bg-red-50 text-[#e11d48]' : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              Leaderboard
            </Link>
            <Link 
              href="/admin/login" 
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                isAdmin ? 'bg-red-50 text-[#e11d48]' : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <Settings className="w-4 h-4 text-neutral-600" />
              Admin
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
