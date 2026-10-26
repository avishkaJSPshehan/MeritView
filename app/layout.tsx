import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MeritView | Examination Ranking",
  description: "Professional mobile-responsive web application for exam results and ranking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className={`${inter.className} min-h-screen bg-[#f8f9fc] text-foreground flex flex-col selection:bg-primary/20 relative overflow-x-hidden`}>
        {/* Responsive Background Layer */}
        {/* Mobile View: Dedicated Portrait Background */}
        <div 
          className="md:hidden fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none" 
          aria-hidden="true"
        >
          <img
            src="/bg-pattern-mobile.jpg"
            alt=""
            className="w-full h-full object-cover object-center opacity-35 select-none"
            loading="eager"
            decoding="async"
          />
          {/* Subtle light wash for enhanced readability on mobile */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/30 pointer-events-none" />
        </div>

        {/* Desktop View: Fixed full viewport coverage */}
        <div 
          className="hidden md:block fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none" 
          aria-hidden="true"
        >
          <img
            src="/bg-pattern.jpg"
            alt=""
            className="w-full h-full object-cover object-center opacity-35 select-none"
            loading="eager"
            decoding="async"
          />
          {/* Subtle light wash for enhanced readability across all devices */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/40 pointer-events-none" />
        </div>

        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center relative z-0">
          {children}
        </main>
        <footer className="bg-[#0a0a0f] border-t border-white/5 py-8 mt-auto relative z-10">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-sm font-semibold text-gray-500 tracking-wide">
              © Copyright by Amarasri Herath Technical Team
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
