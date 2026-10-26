"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { 
  getAdminRankings, 
  adminLogout, 
  deleteAllData, 
  getSystemConfig, 
  toggleConfig, 
  deleteStudent, 
  verifyAdminPassword 
} from "@/app/actions";
import { StudentResult } from "@/types";
import { PROVINCES, DISTRICTS } from "@/lib/constants";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LogOut, 
  RefreshCcw, 
  Loader2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Edit3, 
  ShieldAlert, 
  Calendar, 
  MessageCircle,
  Layers,
  Brain,
  Globe2,
  Languages,
  Check,
  X,
  AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("island");
  const [subjectView, setSubjectView] = useState<"all" | "iq" | "gk" | "lang">("all");
  const [data, setData] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // System Config
  const [systemConfig, setSystemConfig] = useState<{ 
    marks_entry: boolean; 
    view_rankings: boolean; 
    ranking_mode: string; 
    active_exam_date: string;
    subject_iq_enabled: boolean;
    subject_gk_enabled: boolean;
    subject_lang_enabled: boolean;
    db_connected?: boolean;
  }>({ 
    marks_entry: true, 
    view_rankings: true, 
    ranking_mode: "general",
    active_exam_date: new Date().toISOString().split('T')[0],
    subject_iq_enabled: true,
    subject_gk_enabled: true,
    subject_lang_enabled: true,
    db_connected: true
  });
  const [configLoading, setConfigLoading] = useState(true);
  const [dismissWarning, setDismissWarning] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let sortBy: "total_marks" | "iq_marks" | "gk_marks" | "lang_marks" = "total_marks";
    if (subjectView === "iq") sortBy = "iq_marks";
    else if (subjectView === "gk") sortBy = "gk_marks";
    else if (subjectView === "lang") sortBy = "lang_marks";

    let filterProvince = undefined;
    let filterDistrict = undefined;

    if (activeTab === "province") filterProvince = selectedProvince || PROVINCES[0];
    if (activeTab === "district") filterDistrict = selectedDistrict || DISTRICTS[0];

    const response = await getAdminRankings({
      province: filterProvince,
      district: filterDistrict,
      category: (selectedCategory && selectedCategory !== "ALL") ? selectedCategory : undefined,
      sortBy,
      examDate: systemConfig.active_exam_date
    });

    if (response.success) {
      setData(response.data || []);
    }
    setLoading(false);
  }, [activeTab, subjectView, selectedProvince, selectedDistrict, selectedCategory, systemConfig.active_exam_date]);

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    const config = await getSystemConfig();
    setSystemConfig({
      marks_entry: config.marks_entry,
      view_rankings: config.view_rankings,
      ranking_mode: config.ranking_mode,
      active_exam_date: config.active_exam_date,
      subject_iq_enabled: config.subject_iq_enabled ?? true,
      subject_gk_enabled: config.subject_gk_enabled ?? true,
      subject_lang_enabled: config.subject_lang_enabled ?? true,
      db_connected: (config as any).db_connected ?? true
    });
    setConfigLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    fetchConfig();

    // Supabase Realtime Subscription
    const channel = supabase
      .channel('schema-db-changes')
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
  }, [fetchData, fetchConfig]);

  async function handleLogout() {
    await adminLogout();
    router.push("/");
  }

  async function handleDeleteAll() {
    if (!confirm("CRITICAL WARNING: This will permanently delete ALL student data from the database. This action cannot be undone. Are you absolutely sure?")) {
      return;
    }
    
    const password = prompt("DANGER ZONE: This operation will PERMANENTLY wipe the entire results database. Please enter the master admin password to confirm this action:");
    if (!password) return;

    setLoading(true);
    const isValid = await verifyAdminPassword(password);
    if (!isValid) {
      alert("Unauthorized: Incorrect admin password.");
      setLoading(false);
      return;
    }

    const result = await deleteAllData();
    if (result.success) {
      alert("Database purged successfully.");
      fetchData();
    } else {
      alert("Error deleting data: " + result.error);
    }
    setLoading(false);
  }

  async function handleDeleteSingle(id: string, name: string) {
    if (!confirm(`Are you sure you want to remove candidate "${name}"?`)) return;
    const res = await deleteStudent(id);
    if (res.success) {
      fetchData();
    } else {
      alert("Error: " + res.error);
    }
  }

  async function handleToggle(
    key: "marks_entry_enabled" | "view_rankings_enabled" | "ranking_mode" | "active_exam_date" | "subject_iq_enabled" | "subject_gk_enabled" | "subject_lang_enabled", 
    current: any
  ) {
    if (key !== "active_exam_date") setConfigLoading(true);
    
    const result = await toggleConfig(key, current);
    if (result.success) {
      await fetchConfig();
      await fetchData();
    } else {
      alert("Failed to update config: " + result.error);
    }
    setConfigLoading(false);
  }

  const rankedData = useMemo(() => {
    // Unique list by NIC
    const groups: (StudentResult & { rank: number })[] = [];
    const nicMap = new Map<string, number>();

    data.forEach((student) => {
      const key = student.nic;
      if (!nicMap.has(key)) {
        nicMap.set(key, groups.length);
        groups.push({ ...student, rank: 0 });
      }
    });

    // Apply competition ranking
    let lastScore = -1;
    let lastRank = 1;
    groups.forEach((student, index) => {
      const currentScore = subjectView === "iq" ? (student.iq_marks ?? 0) : 
                           subjectView === "gk" ? (student.gk_marks ?? 0) : 
                           subjectView === "lang" ? (student.lang_marks ?? 0) :
                           (student.total_marks ?? 0);
      
      if (currentScore !== lastScore) {
        lastRank = index + 1;
        lastScore = currentScore;
      }
      
      student.rank = lastRank;
    });

    if (systemConfig.ranking_mode === "categorized" && (!selectedCategory || selectedCategory === "ALL")) {
      const categorizedGroups: Record<string, typeof groups> = {};
      groups.forEach(s => {
        if (!categorizedGroups[s.category]) categorizedGroups[s.category] = [];
        categorizedGroups[s.category].push(s);
      });

      Object.values(categorizedGroups).forEach(group => {
        let lScore = -1;
        let lRank = 1;
        group.forEach((s, i) => {
          const currentScore = subjectView === "iq" ? (s.iq_marks ?? 0) : 
                               subjectView === "gk" ? (s.gk_marks ?? 0) : 
                               subjectView === "lang" ? (s.lang_marks ?? 0) :
                               (s.total_marks ?? 0);
          if (currentScore !== lScore) {
            lRank = i + 1;
            lScore = currentScore;
          }
          s.rank = lRank;
        });
      });
    }

    return groups;
  }, [data, subjectView, systemConfig.ranking_mode, selectedCategory]);

  const needsProvinceFilter = activeTab === "province";
  const needsDistrictFilter = activeTab === "district";

  return (
    <div className="w-full max-w-[98vw] mx-auto py-12 px-6 animate-in fade-in duration-700">
      {systemConfig.db_connected === false && !dismissWarning && (
        <div className="bg-amber-50 border-2 border-amber-200 text-amber-950 p-6 rounded-3xl mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm animate-in fade-in duration-500">
          <div className="p-3 bg-amber-100 rounded-2xl text-amber-700 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="text-sm flex-1">
            <p className="font-black text-base uppercase tracking-tight">Supabase Project Paused or Unreachable</p>
            <p className="font-medium mt-0.5 text-amber-900 leading-relaxed">
              Remote database connection failed (<code className="font-bold bg-amber-200/60 px-1.5 py-0.5 rounded text-amber-950">fetch failed</code>). If your Supabase free-tier project is paused due to inactivity, visit the <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-bold text-amber-950 hover:text-black">Supabase Dashboard</a> and click <strong>"Restore Project"</strong>.
              In the meantime, your admin toggles and configurations are operating seamlessly via local persistence!
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setDismissWarning(true)}
            className="p-2.5 rounded-xl hover:bg-amber-200/60 text-amber-800 hover:text-amber-950 transition-colors shrink-0"
            title="Dismiss notice"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-8 bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl shadow-primary/5 border ring-1 ring-primary/5">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-primary rounded-full" />
            <h1 className="text-4xl font-black text-foreground tracking-tighter">Admin Dashboard</h1>
          </div>
          <p className="text-lg text-muted-foreground font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live examination scoring & subject performance analytics
          </p>
        </div>
        <div className="flex gap-4 w-full lg:w-auto">
          <Button variant="outline" onClick={fetchData} className="flex-1 lg:flex-none h-14 rounded-2xl gap-2 font-bold bg-white hover:bg-primary/5 border-2 transition-all active:scale-95">
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button variant="outline" onClick={() => router.push("/admin/contacts")} className="flex-1 lg:flex-none h-14 rounded-2xl gap-2 font-bold bg-white hover:bg-green-50 border-2 transition-all active:scale-95 text-green-700 border-green-100">
            <MessageCircle className="w-5 h-5" />
            Contacts
          </Button>
          <Button variant="destructive" onClick={handleLogout} className="flex-1 lg:flex-none h-14 rounded-2xl gap-2 font-bold shadow-lg shadow-destructive/20 transition-all hover:scale-105 active:scale-95">
            <LogOut className="w-5 h-5" />
            End Session
          </Button>
        </div>
      </div>

      {/* Scope Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <TabsList className="flex flex-wrap h-auto p-2 bg-neutral-100/50 backdrop-blur-sm rounded-[2rem] gap-2 border shadow-inner">
          {[
            { v: "island", l: "Island Ranking" },
            { v: "province", l: "Province Ranking" },
            { v: "district", l: "District Ranking" }
          ].map((tab) => (
            <TabsTrigger 
              key={tab.v}
              value={tab.v} 
              className="flex-1 min-w-[140px] py-4 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all"
            >
              {tab.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Subject Viewing Mode Toggle & Filters */}
        <div className="space-y-6">
          {/* SUBJECT VIEW TOGGLE BAR */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-primary/5 border ring-1 ring-primary/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  Subject View Toggle / විෂය පරාසය තෝරන්න
                </p>
                <p className="text-sm text-foreground/75 font-semibold ml-1">
                  View all 3 subjects together (aggregate score) or view individual subject rankings:
                </p>
              </div>

              <div className="flex flex-wrap bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200 gap-1.5">
                {[
                  { id: "all" as const, label: "All 3 Subjects Together", icon: Layers, active: true },
                  { id: "iq" as const, label: "IQ", icon: Brain, active: systemConfig.subject_iq_enabled },
                  { id: "gk" as const, label: "GK", icon: Globe2, active: systemConfig.subject_gk_enabled },
                  { id: "lang" as const, label: "Language Proficiency", icon: Languages, active: systemConfig.subject_lang_enabled }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSubjectView(item.id)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      subjectView === item.id 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]' 
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    {!item.active && item.id !== "all" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold lowercase">off</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary Filters */}
          <div className="flex flex-col md:flex-row gap-6">
            {needsProvinceFilter && (
              <div className="w-full md:w-80 animate-in slide-in-from-left-4 duration-500">
                <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-primary/5 border ring-1 ring-primary/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 ml-1">Filter by Location</p>
                  <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                    <SelectTrigger className="h-14 rounded-xl border-2 bg-neutral-50/50 font-bold text-foreground focus:ring-4 focus:ring-primary/10">
                      <SelectValue placeholder="All Provinces" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2">
                      {PROVINCES.map((p) => (
                        <SelectItem key={p} value={p} className="font-medium">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {needsDistrictFilter && (
              <div className="w-full md:w-80 animate-in slide-in-from-left-4 duration-500">
                 <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-primary/5 border ring-1 ring-primary/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 ml-1">Deep Filter</p>
                  <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                    <SelectTrigger className="h-14 rounded-xl border-2 bg-neutral-50/50 font-bold text-foreground focus:ring-4 focus:ring-primary/10">
                      <SelectValue placeholder="All Districts" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2">
                      {DISTRICTS.map((d) => (
                        <SelectItem key={d} value={d} className="font-medium">{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="w-full md:w-auto animate-in slide-in-from-left-4 duration-500">
               <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-primary/5 border ring-1 ring-primary/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 ml-1">Category Filter</p>
                <div className="flex bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200">
                  {[
                    { v: "ALL", l: "All Types" },
                    { v: "Open", l: "Open" },
                    { v: "limited", l: "limited" }
                  ].map((cat) => (
                    <button
                      key={cat.v}
                      onClick={() => setSelectedCategory(cat.v)}
                      className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        (selectedCategory || "ALL") === cat.v 
                          ? 'bg-white text-primary shadow-lg ring-1 ring-primary/10' 
                          : 'text-slate-400 hover:text-slate-600 hover:bg-neutral-200/50'
                      }`}
                    >
                      {cat.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Results */}
        <Card className="border-0 shadow-2xl shadow-primary/10 bg-white rounded-[3rem] overflow-hidden ring-1 ring-primary/5">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-32 gap-6">
                <div className="relative">
                  <Loader2 className="w-16 h-16 animate-spin text-primary opacity-20" />
                  <Loader2 className="w-16 h-16 animate-spin text-primary absolute inset-0 [animation-delay:-0.5s]" />
                </div>
                <p className="font-black text-muted-foreground uppercase tracking-[0.3em] text-xs">Syncing rankings...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="text-center p-32 bg-neutral-50/30">
                <div className="bg-white w-20 h-20 rounded-[2rem] shadow-xl flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
                  <RefreshCcw className="w-10 h-10" />
                </div>
                <p className="text-2xl font-black text-foreground tracking-tight">No Results Found</p>
                <p className="text-muted-foreground font-medium mt-2">Try adjusting your filters or checking back later.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-neutral-50/50">
                    <TableRow className="hover:bg-transparent border-b-2 text-neutral-900">
                      <TableHead className="w-[80px] text-center font-black uppercase tracking-widest text-[10px]">Pos</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px] py-6">Candidate Identity</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px]">Type</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px]">Origin</TableHead>
                      <TableHead className={`text-right font-black uppercase tracking-widest text-[10px] ${subjectView === "iq" ? "text-primary bg-primary/5 font-extrabold" : ""}`}>
                        IQ (බුද්ධි)
                      </TableHead>
                      <TableHead className={`text-right font-black uppercase tracking-widest text-[10px] ${subjectView === "gk" ? "text-primary bg-primary/5 font-extrabold" : ""}`}>
                        GK (සාමාන්‍ය)
                      </TableHead>
                      <TableHead className={`text-right font-black uppercase tracking-widest text-[10px] ${subjectView === "lang" ? "text-primary bg-primary/5 font-extrabold" : ""}`}>
                        Lang Prof (භාෂා)
                      </TableHead>
                      <TableHead className={`text-right font-black uppercase tracking-widest text-[10px] pr-8 ${subjectView === "all" ? "text-primary" : ""}`}>
                        Aggregate Total
                      </TableHead>
                      <TableHead className="w-[60px] text-center font-black uppercase tracking-widest text-[10px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedData.map((student) => (
                      <TableRow 
                        key={student.id || student.nic} 
                        className={`group transition-all border-b last:border-0 border-neutral-100 ${
                          student.rank === 1 ? 'bg-amber-50/40 hover:bg-amber-50' : 
                          student.rank === 2 ? 'bg-slate-50/40 hover:bg-slate-50' : 
                          student.rank === 3 ? 'bg-orange-50/40 hover:bg-orange-50' : 
                          'hover:bg-red-50/50'
                        }`}
                      >
                        <TableCell>
                          <div className="flex justify-center">
                            {student.rank <= 3 ? (
                              <div className={`
                                w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-xs shadow-lg transform -rotate-3 transition-all group-hover:rotate-0
                                ${student.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-200' : ''}
                                ${student.rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500 shadow-slate-200' : ''}
                                ${student.rank === 3 ? 'bg-gradient-to-br from-orange-300 to-orange-500 shadow-orange-200' : ''}
                              `}>
                                 #{student.rank}
                              </div>
                            ) : (
                              <span className="font-black text-muted-foreground text-sm tabular-nums">{student.rank}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-black text-foreground tracking-tight text-lg">{student.name}</p>
                            <p className="text-xs font-semibold text-muted-foreground tracking-wider font-mono">NIC: {student.nic}</p>
                            {student.whatsapp && (
                              <p className="text-[11px] text-green-600 font-bold mt-0.5">WhatsApp: {student.whatsapp}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${student.category === 'limited' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                             {student.category}
                           </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-secondary rounded-full" />
                            <div>
                                <p className="text-sm font-black text-foreground">{student.district}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-50">{student.province}</p>
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* IQ Marks */}
                        <TableCell className={`text-right font-bold tabular-nums text-foreground ${subjectView === "iq" ? "bg-primary/10 text-primary font-black text-base" : "opacity-80"}`}>
                          {student.iq_marks ?? 0}
                        </TableCell>
                        
                        {/* GK Marks */}
                        <TableCell className={`text-right font-bold tabular-nums text-foreground ${subjectView === "gk" ? "bg-primary/10 text-primary font-black text-base" : "opacity-80"}`}>
                          {student.gk_marks ?? 0}
                        </TableCell>

                        {/* Language Proficiency Marks */}
                        <TableCell className={`text-right font-bold tabular-nums text-foreground ${subjectView === "lang" ? "bg-primary/10 text-primary font-black text-base" : "opacity-80"}`}>
                          {student.lang_marks ?? 0}
                        </TableCell>

                        {/* Aggregate Total */}
                        <TableCell className="text-right pr-8">
                          <span className={`inline-block py-2 px-6 rounded-2xl font-black text-xl tabular-nums shadow-lg transition-all ${
                            student.rank === 1 ? 'bg-amber-500 text-white' : 
                            student.rank === 2 ? 'bg-slate-400 text-white' : 
                            student.rank === 3 ? 'bg-orange-400 text-white' : 
                            subjectView === "all" ? 'bg-primary text-primary-foreground' :
                            'bg-foreground text-background group-hover:bg-primary group-hover:text-primary-foreground'
                          }`}>
                            {student.total_marks}
                          </span>
                        </TableCell>

                        {/* Action Column */}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSingle(student.id, student.name)}
                            className="text-neutral-400 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                            title="Delete this record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Administrative Controls Section */}
      <div className="mt-20 border-t-2 border-dashed border-neutral-200 pt-16 pb-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-foreground text-background p-3 rounded-2xl shadow-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-foreground tracking-tight uppercase">System Management</h2>
            <p className="text-muted-foreground font-medium">Global platform controls, subject toggles, and data maintenance</p>
          </div>
        </div>

        {/* Global Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Toggle Marks Entry */}
          <Card className={`border-0 shadow-xl rounded-[2.5rem] overflow-hidden transition-all duration-500 ${systemConfig.marks_entry ? 'bg-white ring-1 ring-primary/10' : 'bg-neutral-50 grayscale opacity-80'}`}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className={`p-4 rounded-2xl ${systemConfig.marks_entry ? 'bg-primary/10 text-primary' : 'bg-neutral-200 text-neutral-500'}`}>
                  <Edit3 className="w-6 h-6" />
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${systemConfig.marks_entry ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {systemConfig.marks_entry ? 'Operational' : 'Disabled'}
                </div>
              </div>
              <CardTitle className="text-xl font-black mt-4">Marks Entry Phase</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-medium mb-8">
                Controls access to the "Enter Marks" form for candidates and staff.
              </p>
              <Button 
                onClick={() => handleToggle("marks_entry_enabled", systemConfig.marks_entry)}
                disabled={configLoading}
                className={`w-full h-14 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${systemConfig.marks_entry ? 'bg-foreground text-background hover:bg-foreground/90' : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'}`}
              >
                {configLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (systemConfig.marks_entry ? "Disable Mark Submission" : "Enable Mark Submission")}
              </Button>
            </CardContent>
          </Card>

          {/* Toggle View Rankings */}
          <Card className={`border-0 shadow-xl rounded-[2.5rem] overflow-hidden transition-all duration-500 ${systemConfig.view_rankings ? 'bg-white ring-1 ring-secondary/20' : 'bg-neutral-50 grayscale opacity-80'}`}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className={`p-4 rounded-2xl ${systemConfig.view_rankings ? 'bg-secondary/20 text-secondary-foreground' : 'bg-neutral-200 text-neutral-500'}`}>
                   {systemConfig.view_rankings ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${systemConfig.view_rankings ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {systemConfig.view_rankings ? 'Visibility: High' : 'Visibility: Hidden'}
                </div>
              </div>
              <CardTitle className="text-xl font-black mt-4">Result Visibility</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-medium mb-8">
                Hides or shows the detailed rankings and scorecard for candidates.
              </p>
              <Button 
                onClick={() => handleToggle("view_rankings_enabled", systemConfig.view_rankings)}
                disabled={configLoading}
                className={`w-full h-14 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${systemConfig.view_rankings ? 'bg-foreground text-background hover:bg-foreground/90' : 'bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20'}`}
              >
                {configLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (systemConfig.view_rankings ? "Hide Candidates Results" : "Show Candidates Results")}
              </Button>
            </CardContent>
          </Card>

          {/* Active Exam Date Selection */}
          <Card className="border-0 shadow-xl rounded-[2.5rem] bg-white ring-1 ring-primary/10 overflow-hidden transition-all duration-500">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700">
                  Schedule
                </div>
              </div>
              <CardTitle className="text-xl font-black mt-4">Active Exam Date</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-medium mb-8">
                Set the date for the current scoring session. All new entries will be tagged with this date.
              </p>
              <input 
                type="date" 
                value={systemConfig.active_exam_date}
                onChange={(e) => handleToggle("active_exam_date", e.target.value)}
                className="w-full h-14 px-4 rounded-2xl font-bold border-2 border-neutral-100 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
              />
            </CardContent>
          </Card>
        </div>

        {/* SUBJECT TOGGLES SECTION (IQ, GK, Language Proficiency) */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h3 className="text-2xl font-black text-foreground tracking-tight">Active Exam Subjects Configuration</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            Toggle specific subjects on or off for the examination. Disabled subjects are excluded from student mark entry and aggregate totals.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Subject 1: IQ */}
            <Card className={`border-0 shadow-xl rounded-[2.5rem] overflow-hidden transition-all duration-500 ${systemConfig.subject_iq_enabled ? 'bg-white ring-2 ring-primary/20' : 'bg-neutral-50 opacity-70'}`}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className={`p-4 rounded-2xl ${systemConfig.subject_iq_enabled ? 'bg-primary/10 text-primary' : 'bg-neutral-200 text-neutral-500'}`}>
                    <Brain className="w-6 h-6" />
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${systemConfig.subject_iq_enabled ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600'}`}>
                    {systemConfig.subject_iq_enabled ? 'Active' : 'Disabled'}
                  </div>
                </div>
                <CardTitle className="text-xl font-black mt-4">IQ (බුද්ධි පරීක්ෂණය)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-medium mb-8">
                  Intelligence Quotient test paper. Toggling off removes it from candidate mark entry and aggregate calculation.
                </p>
                <Button 
                  onClick={() => handleToggle("subject_iq_enabled", systemConfig.subject_iq_enabled)}
                  disabled={configLoading}
                  className={`w-full h-14 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${
                    systemConfig.subject_iq_enabled ? 'bg-neutral-900 text-white hover:bg-neutral-800' : 'bg-primary text-primary-foreground shadow-lg'
                  }`}
                >
                  {systemConfig.subject_iq_enabled ? (
                    <><X className="w-4 h-4" /> Disable IQ Subject</>
                  ) : (
                    <><Check className="w-4 h-4" /> Enable IQ Subject</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Subject 2: GK */}
            <Card className={`border-0 shadow-xl rounded-[2.5rem] overflow-hidden transition-all duration-500 ${systemConfig.subject_gk_enabled ? 'bg-white ring-2 ring-primary/20' : 'bg-neutral-50 opacity-70'}`}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className={`p-4 rounded-2xl ${systemConfig.subject_gk_enabled ? 'bg-primary/10 text-primary' : 'bg-neutral-200 text-neutral-500'}`}>
                    <Globe2 className="w-6 h-6" />
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${systemConfig.subject_gk_enabled ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600'}`}>
                    {systemConfig.subject_gk_enabled ? 'Active' : 'Disabled'}
                  </div>
                </div>
                <CardTitle className="text-xl font-black mt-4">GK (සාමාන්‍ය දැනීම)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-medium mb-8">
                  General Knowledge paper. Toggling off removes it from candidate mark entry and aggregate calculation.
                </p>
                <Button 
                  onClick={() => handleToggle("subject_gk_enabled", systemConfig.subject_gk_enabled)}
                  disabled={configLoading}
                  className={`w-full h-14 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${
                    systemConfig.subject_gk_enabled ? 'bg-neutral-900 text-white hover:bg-neutral-800' : 'bg-primary text-primary-foreground shadow-lg'
                  }`}
                >
                  {systemConfig.subject_gk_enabled ? (
                    <><X className="w-4 h-4" /> Disable GK Subject</>
                  ) : (
                    <><Check className="w-4 h-4" /> Enable GK Subject</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Subject 3: Language Proficiency */}
            <Card className={`border-0 shadow-xl rounded-[2.5rem] overflow-hidden transition-all duration-500 ${systemConfig.subject_lang_enabled ? 'bg-white ring-2 ring-primary/20' : 'bg-neutral-50 opacity-70'}`}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className={`p-4 rounded-2xl ${systemConfig.subject_lang_enabled ? 'bg-primary/10 text-primary' : 'bg-neutral-200 text-neutral-500'}`}>
                    <Languages className="w-6 h-6" />
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${systemConfig.subject_lang_enabled ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600'}`}>
                    {systemConfig.subject_lang_enabled ? 'Active' : 'Disabled'}
                  </div>
                </div>
                <CardTitle className="text-xl font-black mt-4">Language Proficiency (භාෂා ප්‍රවීණතාව)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-medium mb-8">
                  Language Proficiency paper. Toggling off removes it from candidate mark entry and aggregate calculation.
                </p>
                <Button 
                  onClick={() => handleToggle("subject_lang_enabled", systemConfig.subject_lang_enabled)}
                  disabled={configLoading}
                  className={`w-full h-14 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${
                    systemConfig.subject_lang_enabled ? 'bg-neutral-900 text-white hover:bg-neutral-800' : 'bg-primary text-primary-foreground shadow-lg'
                  }`}
                >
                  {systemConfig.subject_lang_enabled ? (
                    <><X className="w-4 h-4" /> Disable Language Subject</>
                  ) : (
                    <><Check className="w-4 h-4" /> Enable Language Subject</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Database Purge Danger Zone */}
        <div className="max-w-xl">
          <Card className="border-0 shadow-xl rounded-[2.5rem] bg-white ring-1 ring-destructive/10 overflow-hidden group hover:ring-destructive/30 transition-all">
             <div className="h-2 bg-destructive/10 group-hover:bg-destructive/30 transition-colors" />
             <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="p-4 rounded-2xl bg-destructive/10 text-destructive">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-destructive text-destructive-foreground">
                  Danger Zone
                </div>
              </div>
              <CardTitle className="text-xl font-black mt-4">Purge All Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-medium mb-8">
                Instantly wipe all candidate records and scores from the host database.
              </p>
              <Button 
                onClick={handleDeleteAll}
                variant="destructive"
                disabled={loading}
                className="w-full h-14 rounded-2xl font-black shadow-lg shadow-destructive/20 hover:scale-[1.02] transform transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Empty Database Now"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
