"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { getAdminRankings, getSystemConfig } from "@/app/actions";
import { StudentResult } from "@/types";
import { PROVINCES, DISTRICTS } from "@/lib/constants";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trophy, Medal, Star, Filter, MapPin, Search as SearchIcon } from "lucide-react";

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState("island");
  const [data, setData] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Open");
  const [rankingMode, setRankingMode] = useState<string>("general");
  const [viewRankings, setViewRankings] = useState<boolean>(true);
  const [activeExamDate, setActiveExamDate] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    let sortBy: "total_marks" | "iq_marks" | "gk_marks" | "lang_marks" = "total_marks";
    let filterProvince = undefined;
    let filterDistrict = undefined;

    if (activeTab.includes("province")) filterProvince = selectedProvince || PROVINCES[0];
    if (activeTab.includes("district")) filterDistrict = selectedDistrict || DISTRICTS[0];

    if (activeTab === "iq_ranking") sortBy = "iq_marks";
    if (activeTab === "gk_ranking") sortBy = "gk_marks";
    if (activeTab === "lang_ranking") sortBy = "lang_marks";

    // Reusing the same action as it provides regulated access to the data
    const response = await getAdminRankings({
      province: filterProvince,
      district: filterDistrict,
      category: selectedCategory, // Always filter by the selected list category
      sortBy,
      examDate: activeExamDate || undefined
    });

    if (response.success) {
      setData(response.data || []);
    }
    setLoading(false);
  }, [activeTab, selectedProvince, selectedDistrict, selectedCategory, activeExamDate]);
  // 1. Initial Config Fetch
  useEffect(() => {
    const fetchConfig = async () => {
      const config = await getSystemConfig();
      if (config.ranking_mode) setRankingMode(config.ranking_mode);
      setViewRankings(config.view_rankings);
      if (config.active_exam_date) setActiveExamDate(config.active_exam_date);
    };
    fetchConfig();
  }, []);

  // 2. Data Fetch on Filter/Date Change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 3. Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('public-leaderboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students_results',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const rankedData = useMemo(() => {
    // 1. Group the data first to handle students with multiple records (if any)
    const groups: (Omit<StudentResult, 'nic' | 'subject'>)[] = [];
    const nameMap = new Map<string, number>();
    data.forEach((student: StudentResult) => {
      const key = `${student.nic}-${student.category}`; // Group by NIC and Category
      if (!nameMap.has(key)) {
        nameMap.set(key, groups.length);
        const { nic, subject, ...safeStudent } = student;
        groups.push(safeStudent);
      }
    });

    // 2. Apply competition ranking (1224)
    let lastScore = -1;
    let lastRank = 1;
    return groups.map((student: any, index) => {
      const currentScore = (activeTab === "iq_ranking") ? (student.iq_marks ?? 0) : 
                           (activeTab === "gk_ranking") ? (student.gk_marks ?? 0) : 
                           (activeTab === "lang_ranking") ? (student.lang_marks ?? 0) :
                           (student.total_marks ?? 0);
      
      if (currentScore !== lastScore) {
        lastRank = index + 1;
        lastScore = currentScore;
      }
      return { ...student, rank: lastRank };
    });
  }, [data, activeTab]);

  const needsProvinceFilter = activeTab === "province";
  const needsDistrictFilter = activeTab === "district";

  if (!viewRankings) {
    return (
      <div className="w-full max-w-2xl mx-auto py-24 md:py-32 px-6 text-center">
        <div className="bg-white rounded-[3.5rem] p-16 shadow-2xl shadow-primary/5 border border-primary/5 flex flex-col items-center">
          <div className="bg-primary/5 p-10 rounded-[3rem] text-primary mb-10 ring-8 ring-primary/5">
            <Star className="w-20 h-20 opacity-20" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-6">Leaderboard Restricted</h2>
          <p className="text-slate-500 font-bold mb-12 leading-relaxed text-lg opacity-70">
            The public leaderboard is currently hidden by the administrator. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-8 md:py-12 px-4 md:px-6">
      {/* Header section with motivational aura */}
      <div className="relative overflow-hidden bg-[#0a0a0f] text-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-16 mb-8 md:mb-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 blur-[100px] -ml-32 -mb-32" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-lg transform rotate-3">
            <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-6xl font-black tracking-tighter">Merit <span className="text-primary italic">Leaderboard</span></h1>
            <p className="text-gray-400 font-medium text-sm md:text-lg max-w-2xl px-4">
              Celebrating excellence and dedication. See where you stand among all registered performers.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 md:space-y-8">
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto p-1.5 bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl border gap-1 md:gap-2">
            {[
              { v: "island", l: "Island" },
              { v: "province", l: "Province" },
              { v: "district", l: "District" },
              { v: "iq_ranking", l: "IQ (බුද්ධි)" },
              { v: "gk_ranking", l: "GK (සාමාන්‍ය)" },
              { v: "lang_ranking", l: "Language (භාෂා)" }
            ].map((tab) => (
              <TabsTrigger 
                key={tab.v}
                value={tab.v} 
                className="flex-1 py-2.5 md:py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all min-w-[70px]"
              >
                {tab.l}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Dynamic Filters */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">

          {(needsProvinceFilter || needsDistrictFilter) && (
            <div className="flex-1 bg-white p-5 md:p-6 rounded-[2rem] shadow-lg border border-primary/5 animate-in slide-in-from-right-4">
              <div className="flex items-center gap-2 mb-3 md:mb-4 text-primary">
                <MapPin className="w-3.5 h-3.5" />
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                  {needsProvinceFilter ? "Province Filter" : "District Filter"}
                </p>
              </div>
              <Select 
                value={needsProvinceFilter ? selectedProvince : selectedDistrict} 
                onValueChange={needsProvinceFilter ? setSelectedProvince : setSelectedDistrict}
              >
                <SelectTrigger className="h-12 md:h-14 rounded-xl border-2 border-input bg-background font-bold px-4">
                  <SelectValue placeholder={needsProvinceFilter ? "Choose Province" : "Choose District"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(needsProvinceFilter ? PROVINCES : DISTRICTS).map((item) => (
                    <SelectItem key={item} value={item} className="font-medium">{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex-1 bg-white p-5 md:p-6 rounded-[2rem] shadow-lg border border-primary/5 animate-in slide-in-from-right-4">
            <div className="flex items-center gap-2 mb-3 md:mb-4 text-primary">
              <Filter className="w-3.5 h-3.5" />
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Candidate Type / කාණ්ඩය</p>
            </div>
            <div className="flex bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200">
              {["Open", "limited"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedCategory === cat 
                      ? 'bg-white text-primary shadow-lg ring-1 ring-primary/10' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-neutral-200/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <Card className="border-0 shadow-2xl shadow-primary/5 bg-white rounded-[2rem] md:rounded-[3rem] overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 md:py-32 gap-6">
                <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-primary opacity-40" />
                <p className="font-black text-muted-foreground uppercase tracking-widest text-[10px]">Computing Ranks...</p>
              </div>
            ) : rankedData.length === 0 ? (
              <div className="text-center py-20 md:py-24 px-10">
                <div className="bg-gray-50 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <SearchIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-300" />
                </div>
                <h3 className="text-xl md:text-2xl font-black text-gray-900">No Champions Yet</h3>
                <p className="text-gray-500 mt-2 font-medium text-sm md:text-base">Try different filters to find performers.</p>
              </div>
            ) : (
              <div className="w-full">
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-neutral-50">
                      <TableRow className="border-b-0">
                        <TableHead className="w-[100px] text-center font-black uppercase tracking-widest text-[9px] py-6">Rank</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[9px]">Candidate</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[9px]">Location</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-[9px] pr-12">Total Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankedData.map((student, index) => (
                        <TableRow 
                          key={index} 
                          className={`group transition-all border-b border-neutral-100 last:border-0 ${
                            student.rank === 1 ? 'bg-amber-50/40 hover:bg-amber-50' : 
                            student.rank === 2 ? 'bg-slate-50/40 hover:bg-slate-50' : 
                            student.rank === 3 ? 'bg-orange-50/40 hover:bg-orange-50' : 
                            'hover:bg-primary/5'
                          }`}
                        >
                          <TableCell className="py-8">
                            <div className="flex justify-center items-center">
                              {student.rank <= 3 ? (
                                <div className={`
                                  relative flex items-center justify-center w-14 h-14 rounded-2xl shadow-xl font-black text-white transform -rotate-2 transition-all group-hover:rotate-0 group-hover:scale-110
                                  ${student.rank === 1 ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-amber-200' : ''}
                                  ${student.rank === 2 ? 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 shadow-slate-200' : ''}
                                  ${student.rank === 3 ? 'bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 shadow-orange-200' : ''}
                                `}>
                                  <span className="text-xl">#{student.rank}</span>
                                  <div className="absolute -top-2 -right-2 bg-white rounded-full p-1.5 shadow-lg border border-neutral-100">
                                     <Trophy className={`w-3.5 h-3.5 ${
                                       student.rank === 1 ? 'text-amber-500' : 
                                       student.rank === 2 ? 'text-slate-400' : 
                                       'text-orange-400'
                                     }`} />
                                  </div>
                                </div>
                              ) : (
                                <span className="font-black text-muted-foreground text-lg tabular-nums">{student.rank}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-black text-foreground text-lg tracking-tight group-hover:text-primary transition-colors">
                              {student.name}
                            </p>
                            {rankingMode === 'general' && (
                              <span className={`inline-block ml-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${student.category === 'limited' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {student.category}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-foreground">{student.district}</p>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 tracking-wider font-mono">{student.province}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-12">
                            <span className={`inline-block py-2 px-6 rounded-2xl font-black text-2xl tabular-nums shadow-sm transition-all ${
                              student.rank === 1 ? 'bg-amber-500 text-white scale-110 shadow-amber-200' : 
                              student.rank === 2 ? 'bg-slate-400 text-white scale-105 shadow-slate-200' : 
                              student.rank === 3 ? 'bg-orange-400 text-white scale-105 shadow-orange-200' : 
                              'bg-neutral-100 text-foreground group-hover:bg-primary/10'
                            }`}>
                              {activeTab === "iq_ranking" ? (student.iq_marks ?? 0) : 
                               activeTab === "gk_ranking" ? (student.gk_marks ?? 0) : 
                               activeTab === "lang_ranking" ? (student.lang_marks ?? 0) :
                               (student.total_marks ?? 0)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-neutral-100">
                  {rankedData.map((student, index) => (
                    <div 
                      key={index} 
                      className={`p-5 flex items-center gap-5 transition-colors ${
                        student.rank === 1 ? 'bg-amber-50/30' : 
                        student.rank === 2 ? 'bg-slate-50/30' : 
                        student.rank === 3 ? 'bg-orange-50/30' : 
                        'active:bg-neutral-50'
                      }`}
                    >
                        <div className="flex-shrink-0 w-14 text-center">
                          {student.rank <= 3 ? (
                            <div className={`
                              relative w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-base shadow-lg
                              ${student.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-100' : ''}
                              ${student.rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500 shadow-slate-100' : ''}
                              ${student.rank === 3 ? 'bg-gradient-to-br from-orange-300 to-orange-500 shadow-orange-100' : ''}
                            `}>
                               #{student.rank}
                            </div>
                          ) : (
                            <span className="font-black text-xl text-muted-foreground tabular-nums">{student.rank}</span>
                          )}
                        </div>
                        
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-base text-foreground truncate">{student.name}</p>
                            {rankingMode === 'general' && (
                              <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter ${student.category === 'limited' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {student.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <MapPin className="w-3 h-3 text-primary opacity-50" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                              {student.district} <span className="opacity-40 mx-1">/</span> {student.province}
                            </p>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          <div className={`px-4 py-2 rounded-xl font-black text-lg tabular-nums shadow-sm ${
                            student.rank === 1 ? 'bg-amber-500 text-white' : 
                            student.rank === 2 ? 'bg-slate-400 text-white' : 
                            student.rank === 3 ? 'bg-orange-400 text-white' : 
                            'bg-neutral-100 text-foreground'
                          }`}>
                            {activeTab === "iq_ranking" ? (student.iq_marks ?? 0) : 
                             activeTab === "gk_ranking" ? (student.gk_marks ?? 0) : 
                             activeTab === "lang_ranking" ? (student.lang_marks ?? 0) :
                             (student.total_marks ?? 0)}
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
