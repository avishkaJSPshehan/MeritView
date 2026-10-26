"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { searchStudent, getStudentRank, getOverallCandidateCount, getCategoryPeakMarks, getSystemConfig } from "@/app/actions";
import { StudentResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Trophy,
  Navigation,
  Loader2,
  User,
  ClipboardCheck,
  Award,
  PieChart,
  AlertCircle,
  BookOpen,
  Globe,
  Sparkles,
  TrendingUp,
  ShieldCheck
} from "lucide-react";

function ResultPageContent() {
  const searchParams = useSearchParams();
  const nicParam = searchParams.get("nic");

  const [results, setResults] = useState<StudentResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overallCount, setOverallCount] = useState<number>(0);
  const [activeDate, setActiveDate] = useState<string>("");

  const data = results[selectedIndex];

  // Ranks state
  const [islandRank, setIslandRank] = useState<{ rank: number | null; total: number } | null>(null);
  const [provinceRank, setProvinceRank] = useState<{ rank: number | null; total: number } | null>(null);
  const [districtRank, setDistrictRank] = useState<{ rank: number | null; total: number } | null>(null);

  // Medium specific ranks
  const [mediumIslandRank, setMediumIslandRank] = useState<{ rank: number | null; total: number } | null>(null);
  const [mediumProvinceRank, setMediumProvinceRank] = useState<{ rank: number | null; total: number } | null>(null);
  const [mediumDistrictRank, setMediumDistrictRank] = useState<{ rank: number | null; total: number } | null>(null);
  
  const [subjectRanks, setSubjectRanks] = useState<Record<string, { island: number; province: number; district: number; total: number }>>({});
  
  const [loadingRanks, setLoadingRanks] = useState(false);
  const [viewMode, setViewMode] = useState<'total_marks' | 'iq_marks' | 'gk_marks' | 'lang_marks'>('total_marks');
  const [rankingScope, setRankingScope] = useState<'general' | 'category'>('general');
  const [peakMarks, setPeakMarks] = useState<{ iq: number; gk: number; lang?: number } | null>(null);

  const fetchAllRanks = useCallback(async (resultId: string, mode: 'total_marks' | 'iq_marks' | 'gk_marks' | 'lang_marks', allResults: StudentResult[]) => {
    setLoadingRanks(true);
    try {
      // 1. Fetch Overall Ranks
      // We pass the scope to getStudentRank. 
      // Note: I'll need to update getStudentRank to explicitly handle this scope transition.
      const [island, province, district, mIsland, mProvince, mDistrict] = await Promise.all([
        getStudentRank(resultId, "island", mode, rankingScope, true),
        getStudentRank(resultId, "province", mode, rankingScope, true),
        getStudentRank(resultId, "district", mode, rankingScope, true),
        getStudentRank(resultId, "island", mode, rankingScope, false),
        getStudentRank(resultId, "province", mode, rankingScope, false),
        getStudentRank(resultId, "district", mode, rankingScope, false)
      ]);

      setIslandRank({ rank: island.rank, total: island.totalCandidates });
      setProvinceRank({ rank: province.rank, total: province.totalCandidates });
      setDistrictRank({ rank: district.rank, total: district.totalCandidates });

      setMediumIslandRank({ rank: mIsland.rank, total: mIsland.totalCandidates });
      setMediumProvinceRank({ rank: mProvince.rank, total: mProvince.totalCandidates });
      setMediumDistrictRank({ rank: mDistrict.rank, total: mDistrict.totalCandidates });

      // 2. Fetch Ranks for EACH Subject
      const subjResults: Record<string, any> = {};
      await Promise.all(allResults.map(async (res) => {
         const [sIsland, sProvince, sDistrict] = await Promise.all([
            getStudentRank(res.id, "island", mode, "subject"),
            getStudentRank(res.id, "province", mode, "subject"),
            getStudentRank(res.id, "district", mode, "subject")
         ]);
         subjResults[res.subject] = {
            island: sIsland.rank,
            province: sProvince.rank,
            district: sDistrict.rank,
            total: sIsland.totalCandidates
         };
      }));
      setSubjectRanks(subjResults);
      // 3. Fetch Category Peaks
      if (allResults[selectedIndex]) {
        const peaks = await getCategoryPeakMarks(allResults[selectedIndex].category, undefined, undefined, allResults[selectedIndex].exam_date);
        if (peaks.success) {
          setPeakMarks({ iq: peaks.maxIQ, gk: peaks.maxGK, lang: peaks.maxLang });
        }
      }
    } catch (e) {
      console.error("Error fetching ranks", e);
    }
    setLoadingRanks(false);
  }, [rankingScope]); // Added rankingScope to dependencies

  useEffect(() => {
    async function fetchData() {
      if (!nicParam) {
        setError("Invalid NIC provided.");
        setLoading(false);
        return;
      }

      const config = await getSystemConfig();
      const currentActiveDate = config.active_exam_date || "";
      setActiveDate(currentActiveDate);

      const [studentData, globalData] = await Promise.all([
        searchStudent(nicParam, currentActiveDate),
        getOverallCandidateCount(currentActiveDate)
      ]);

      if (studentData.success && studentData.data && studentData.data.length > 0) {
        setResults(studentData.data);
      } else {
        setError(studentData.error || "Result not found");
      }

      if (globalData.success) {
        setOverallCount(globalData.count);
      }

      setLoading(false);
    }

    fetchData();
  }, [nicParam]);

  useEffect(() => {
    if (data && results.length > 0) {
      fetchAllRanks(data.id, viewMode, results);
    }
  }, [data?.id, viewMode, results, rankingScope, fetchAllRanks]);

  // ... rest of the code is unchanged except for the header addition ...

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 bg-white px-6">
        <div className="relative">
          <div className="absolute inset-0 bg-rose-500 rounded-full blur-2xl opacity-10 animate-pulse" />
          <Loader2 className="w-16 h-16 animate-spin text-rose-600 opacity-20" />
          <Loader2 className="w-16 h-16 animate-spin text-rose-500 absolute inset-0 [animation-delay:-0.5s]" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Accessing Records</h3>
          <p className="text-rose-600/60 font-black text-[9px] uppercase tracking-[0.4em] animate-pulse">Secure Connection</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-24 px-6 animate-in fade-in zoom-in duration-1000">
        <div className="bg-white rounded-[3.5rem] p-16 shadow-2xl shadow-rose-900/5 text-center border border-rose-50 flex flex-col items-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-rose-50/50 to-transparent pointer-events-none" />
          <div className="bg-rose-50 p-10 rounded-[3rem] text-rose-600 mb-10 ring-8 ring-rose-50/50 group-hover:scale-110 transition-transform duration-700">
            <AlertCircle className="w-20 h-20" />
          </div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-6 leading-none">Record Not Found</h2>
          <p className="text-slate-500 font-bold mb-12 leading-relaxed text-xl opacity-70 max-w-md">
            {error || "The identity credentials provided do not match any candidates in our secure national merit database."}
          </p>
          <Button 
            onClick={() => window.history.back()} 
            className="w-full h-20 rounded-[2.5rem] bg-rose-600 text-white text-lg font-black hover:bg-rose-700 transition-all shadow-[0_20px_40px_rgba(225,29,72,0.2)] hover:-translate-y-1 active:translate-y-0"
          >
            ← Attempt New Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-4 md:py-8 px-2 sm:px-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* COMPACT STUDENT PROFILE CARD */}
      <div className="bg-white rounded-[2rem] p-5 md:p-10 shadow-xl ring-1 ring-rose-100 relative overflow-hidden transition-all duration-500 border border-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 border-4 border-white shadow-lg overflow-hidden">
              <User className="w-12 h-12 md:w-16 md:h-16" />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-3">
                <Badge className="text-[8px] font-black uppercase tracking-widest bg-blue-600 text-white border-0 px-3 py-1">
                   {data.language || 'Sinhala'} Medium
                </Badge>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                 <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">{data.name}</h2>
                 <ShieldCheck className="w-5 h-5 text-rose-500" />
              </div>
              <p className="text-rose-600/60 font-black text-lg md:text-xl tracking-tight mt-1">Registry: {data.nic}</p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl ring-1 ring-rose-50 shadow-sm">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span className="text-[12px] font-black text-slate-700 tracking-tight">{data.province}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl ring-1 ring-rose-50 shadow-sm">
                <Navigation className="w-4 h-4 text-rose-500" />
                <span className="text-[12px] font-black text-slate-700 tracking-tight">{data.district}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SIMPLE SCORECARD CARD */}
      <div className="bg-white rounded-[2rem] shadow-lg ring-1 ring-rose-100 overflow-hidden border border-white relative">
        {/* Compact Header */}
        <div className="bg-rose-50/30 px-6 py-4 border-b border-rose-100 flex flex-wrap items-center justify-between gap-4 relative z-10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-900/40">Performance Scorecard</h3>
          <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest">
            <span className="text-emerald-600">Passed</span>
            <span className="text-slate-400">Candidates: <span className="text-rose-600">{overallCount}</span></span>
          </div>
        </div>

        <div className="p-6 md:p-12 relative flex flex-col items-center">
          
          {/* COMPACT AGGREGATE BADGE - POSITIONED TOP TO PREVENT OVERLAP */}
          <div className="mb-12 relative z-20">
            <div className="relative group/agg cursor-default">
              <div className="absolute inset-0 bg-rose-500 rounded-full blur-2xl opacity-10" />
              <div className="relative w-44 h-44 md:w-60 md:h-60 rounded-full bg-white border-8 border-white shadow-xl flex flex-col items-center justify-center p-6 ring-1 ring-rose-100/50">
                <div className="absolute inset-1 border-2 border-rose-100/30 bg-gradient-to-br from-rose-700 via-rose-600 to-rose-400 rounded-full flex flex-col items-center justify-center text-white shadow-inner overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Total Score</p>
                  <span className="text-5xl md:text-7xl font-black tracking-tighter">{data.total_marks}</span>
                  <div className="h-0.5 w-8 bg-white/40 rounded-full my-2" />
                  <p className="text-xs font-black opacity-90">/ 300</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full items-center">
            {/* IQ Assessment */}
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-rose-50 pb-3">
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-800 tracking-tight uppercase">IQ Assessment</h4>
                  <p className="text-slate-400 font-black text-xs tracking-tight">Official Score: <span className="text-slate-900 text-xl">{data.iq_marks}</span> / 100</p>
                </div>
                {data.iq_marks >= 40 && <ShieldCheck className="w-5 h-5 text-emerald-500 mb-1" />}
              </div>
              <div className="h-2.5 w-full bg-rose-100/50 rounded-full overflow-hidden shadow-inner border border-rose-100">
                <div
                  className="h-full bg-gradient-to-r from-rose-700 via-rose-600 to-rose-400 rounded-full"
                  style={{ width: `${Math.min(100, data.iq_marks)}%` }}
                />
              </div>
              {peakMarks && (
                <p className="text-[9px] font-black text-rose-900/40 uppercase tracking-widest text-center">
                  Highest in {data.category}: <span className="text-rose-600/60">{peakMarks.iq}</span>
                </p>
              )}
            </div>

            {/* General Knowledge */}
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-rose-50 pb-3">
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-800 tracking-tight uppercase">General Knowledge</h4>
                  <p className="text-slate-400 font-black text-xs tracking-tight">Official Score: <span className="text-slate-900 text-xl">{data.gk_marks}</span> / 100</p>
                </div>
                {data.gk_marks >= 40 && <ShieldCheck className="w-5 h-5 text-emerald-500 mb-1" />}
              </div>
              <div className="h-2.5 w-full bg-rose-100/50 rounded-full overflow-hidden shadow-inner border border-rose-100">
                <div
                  className="h-full bg-gradient-to-r from-rose-700 via-rose-600 to-rose-400 rounded-full"
                  style={{ width: `${Math.min(100, data.gk_marks)}%` }}
                />
              </div>
              {peakMarks && (
                <p className="text-[9px] font-black text-rose-900/40 uppercase tracking-widest text-center">
                  Highest in {data.category}: <span className="text-rose-600/60">{peakMarks.gk}</span>
                </p>
              )}
            </div>

            {/* Language Proficiency */}
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-rose-50 pb-3">
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-800 tracking-tight uppercase">Language Proficiency</h4>
                  <p className="text-slate-400 font-black text-xs tracking-tight">Official Score: <span className="text-slate-900 text-xl">{data.lang_marks ?? 0}</span> / 100</p>
                </div>
                {(data.lang_marks ?? 0) >= 40 && <ShieldCheck className="w-5 h-5 text-emerald-500 mb-1" />}
              </div>
              <div className="h-2.5 w-full bg-rose-100/50 rounded-full overflow-hidden shadow-inner border border-rose-100">
                <div
                  className="h-full bg-gradient-to-r from-rose-700 via-rose-600 to-rose-400 rounded-full"
                  style={{ width: `${Math.min(100, data.lang_marks ?? 0)}%` }}
                />
              </div>
              {peakMarks && peakMarks.lang !== undefined && (
                <p className="text-[9px] font-black text-rose-900/40 uppercase tracking-widest text-center">
                  Highest in {data.category}: <span className="text-rose-600/60">{peakMarks.lang}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-rose-50 bg-rose-50/20 flex flex-col items-center gap-12">
          {/* PLACEMENT METRIC SELECTOR */}
          <div className="flex flex-wrap justify-center bg-white p-1 rounded-2xl border border-rose-200 shadow-sm backdrop-blur-md gap-1">
            {[
              { id: 'total_marks', label: 'Overall Result' },
              { id: 'iq_marks', label: 'IQ Assessment' },
              { id: 'gk_marks', label: 'GK Assessment' },
              { id: 'lang_marks', label: 'Language Proficiency' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as any)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === mode.id
                  ? 'bg-rose-600 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-rose-50'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* RANKING SCOPE SELECTOR */}
          <div className="flex bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200">
            <button
               onClick={() => setRankingScope('general')}
               className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                 rankingScope === 'general' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400'
               }`}
            >
              General Rank
            </button>
            <button
               onClick={() => setRankingScope('category')}
               className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                 rankingScope === 'category' ? 'bg-primary text-white shadow-lg' : 'text-slate-400'
               }`}
            >
              {data.category} Rank
            </button>
          </div>

          {/* NATIONAL RANKINGS LIST (BOTTOM-UP) */}
          <div className="w-full space-y-16">
             
             {/* 1. OVERALL NATIONAL RANKING */}
             {/* 1. GENERAL NATIONAL RANKING (ALL MEDIUMS) */}
             <div className="space-y-6">
                <div className="flex items-center gap-3">
                   <Globe className="w-6 h-6 text-slate-600" />
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                     {rankingScope === 'category' ? `${data.category} ` : ''}GENERAL NATIONAL RANKING
                   </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Island', icon: Trophy, rank: islandRank?.rank, total: islandRank?.total },
                    { label: 'Province', icon: Globe, rank: provinceRank?.rank, total: provinceRank?.total },
                    { label: 'District', icon: PieChart, rank: districtRank?.rank, total: districtRank?.total }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-3xl shadow-md border border-slate-100 flex items-center gap-6 group hover:border-slate-300 transition-all duration-500">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 group-hover:rotate-12 transition-transform">
                        <item.icon className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label} Rank</p>
                        <p className="text-3xl font-black text-slate-900 leading-none">
                          {loadingRanks ? <Loader2 className="w-6 h-6 animate-spin text-slate-100" /> : item.rank ? item.rank.toString().padStart(2, '0') : '--'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>

             {/* 2. MEDIUM SPECIFIC RANKING */}
             <div className="space-y-6">
                <div className="flex items-center gap-3">
                   <Trophy className="w-6 h-6 text-rose-600" />
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                     {data.language || 'Sinhala'} MEDIUM RANKING
                   </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Island', icon: Trophy, rank: mediumIslandRank?.rank, total: mediumIslandRank?.total },
                    { label: 'Province', icon: Globe, rank: mediumProvinceRank?.rank, total: mediumProvinceRank?.total },
                    { label: 'District', icon: PieChart, rank: mediumDistrictRank?.rank, total: mediumDistrictRank?.total }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-3xl shadow-md border border-rose-50 flex items-center gap-6 group hover:border-rose-300 transition-all duration-500">
                      <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:rotate-12 transition-transform">
                        <item.icon className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label} Rank</p>
                        <p className="text-3xl font-black text-slate-900 leading-none">
                          {loadingRanks ? <Loader2 className="w-6 h-6 animate-spin text-rose-100" /> : item.rank ? item.rank.toString().padStart(2, '0') : '--'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>

             {/* 2. SUBJECT SPECIFIC RANKINGS */}
             {Object.keys(subjectRanks).filter(s => s && s !== "General").map((subject) => {
                const ranks = subjectRanks[subject];
                return (
                  <div key={subject} className="space-y-6">
                     <div className="flex items-center gap-3">
                        <Award className="w-6 h-6 text-rose-500" />
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">SUBJECT RANKING: {subject}</h3>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                          { label: 'Island', icon: Trophy, rank: ranks.island },
                          { label: 'Province', icon: Globe, rank: ranks.province },
                          { label: 'District', icon: PieChart, rank: ranks.district }
                        ].map((item, idx) => (
                          <div key={idx} className="bg-slate-50/50 p-6 rounded-3xl border border-dashed border-rose-200 flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-white border border-rose-50 flex items-center justify-center text-rose-400">
                              <item.icon className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                               <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label} Rank</p>
                               <p className="text-3xl font-black text-slate-700 leading-none">
                                 {loadingRanks ? <Loader2 className="w-6 h-6 animate-spin text-rose-100" /> : item.rank ? item.rank.toString().padStart(2, '0') : '--'}
                               </p>

                            </div>
                          </div>
                        ))}
                     </div>
                  </div>
                );
             })}
          </div>
        </div>
      </div>

      {/* Compact Return Link */}
      <div className="flex justify-center pt-8">
        <Button 
          onClick={() => window.history.back()} 
          variant="ghost" 
          className="text-rose-900/30 font-black tracking-widest uppercase text-[10px] hover:bg-rose-50 hover:text-rose-600 h-12 px-10 rounded-full transition-all"
        >
          &larr; Return to Search
        </Button>
      </div>

      <div className="h-20" /> {/* Spacer */}
    </div>
  );
}

export default function ResultPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-rose-50/10 to-white selection:bg-rose-100 selection:text-rose-900">
      <Suspense fallback={
        <div className="p-20 flex flex-col items-center justify-center min-h-screen gap-10 bg-white">
          <div className="w-20 h-20 relative">
             <div className="absolute inset-0 border-4 border-rose-100 rounded-full" />
             <div className="absolute inset-0 border-4 border-rose-600 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="font-black text-rose-900/20 uppercase tracking-[0.6em] text-[11px] animate-pulse italic">Establishing Secure Protocol</p>
        </div>
      }>
        <ResultPageContent />
      </Suspense>
    </div>
  );
}
