"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, BarChart3, ArrowRight, Target } from "lucide-react";
import { getUserPerformance } from "@/app/actions";
import PerformanceChart from "./PerformanceChart";
import { Button } from "@/components/ui/button";

export default function HomeAnalytics() {
  const [nic, setNic] = useState("");
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<any[] | null>(null);
  const [userName, setUserName] = useState("");
  const [error, setError] = useState("");
  const [placeholder, setPlaceholder] = useState("Enter NIC Number");

  useEffect(() => {
    const updatePlaceholder = () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth >= 640) {
          setPlaceholder("Enter NIC Number (e.g. 200012345678)");
        } else if (window.innerWidth >= 440) {
          setPlaceholder("Enter NIC (e.g. 200012345678)");
        } else {
          setPlaceholder("Enter NIC Number");
        }
      }
    };
    updatePlaceholder();
    window.addEventListener("resize", updatePlaceholder);
    return () => window.removeEventListener("resize", updatePlaceholder);
  }, []);

  async function handleSearch() {
    if (!nic) return;
    setLoading(true);
    setError("");
    setPerformanceData(null);

    const result = await getUserPerformance(nic);
    if (result.success && result.data && result.data.length > 0) {
      setPerformanceData(result.data);
      setUserName(result.name || "Candidate"); 
    } else {
      setError("No performance history found for this NIC.");
    }
    setLoading(false);
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10 py-16 px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-2">
          <BarChart3 className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-[0.2em]">Personal Analytics</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
          Track Your Progress
        </h2>
        <p className="text-muted-foreground font-medium text-base sm:text-lg max-w-2xl mx-auto">
          Enter your NIC number to visualize your performance growth across all examination dates.
        </p>

        {/* Motto Divider: below Track Your Progress and description */}
        <div className="flex items-center justify-center gap-4 w-full max-w-xl mx-auto px-4 pt-3">
          <div className="h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent flex-1" />
          <div className="flex items-center gap-2 text-neutral-500">
            <Target className="w-4 h-4 text-[#e11d48]" />
            <span className="text-[11px] font-black tracking-[0.25em] text-neutral-600 uppercase">
              DREAM • PREPARE • ACHIEVE
            </span>
          </div>
          <div className="h-px bg-gradient-to-l from-transparent via-neutral-300 to-transparent flex-1" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-8">
        <div className="relative w-full max-w-xl group">
          <div className="absolute inset-y-0 left-4 sm:left-6 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder={placeholder}
            value={nic}
            onChange={(e) => setNic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full h-16 sm:h-20 pl-11 sm:pl-16 pr-28 sm:pr-36 bg-white border-2 border-neutral-100 rounded-[2rem] text-sm sm:text-base md:text-lg font-bold shadow-xl shadow-primary/5 focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all placeholder:text-neutral-400 placeholder:text-xs sm:placeholder:text-sm md:placeholder:text-base placeholder:font-normal"
          />
          <div className="absolute right-2 sm:right-3 inset-y-2 sm:inset-y-3 flex items-center">
             <Button 
               onClick={handleSearch} 
               disabled={loading || !nic}
               className="h-full px-4 sm:px-7 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-widest gap-1.5 sm:gap-2 shadow-lg shadow-primary/20"
             >
               {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Analyze"}
               {!loading && <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
             </Button>
          </div>
        </div>
        <p className="text-xs text-neutral-400 font-medium sm:hidden -mt-5">
          Format: 12-digit number (e.g. 200012345678)
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-bold text-sm animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {performanceData && (
          <div className="w-full mt-10 animate-in fade-in zoom-in-95 duration-1000">
            <PerformanceChart data={performanceData} name={userName} />
          </div>
        )}
      </div>
    </div>
  );
}
