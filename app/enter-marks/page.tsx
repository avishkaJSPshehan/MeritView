"use client";

import { useState, useEffect } from "react";
import { PROVINCES, PROVINCE_DISTRICTS } from "@/lib/constants";
import { submitMarks, getSystemConfig } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, ClipboardEdit } from "lucide-react";

export default function EnterMarks() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [nicError, setNicError] = useState(false);
  const [showWhatsappNotice, setShowWhatsappNotice] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Subject toggles loaded from system config
  const [subjectConfig, setSubjectConfig] = useState({
    iq: true,
    gk: true,
    lang: true,
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await getSystemConfig();
        setSubjectConfig({
          iq: config.subject_iq_enabled ?? true,
          gk: config.subject_gk_enabled ?? true,
          lang: config.subject_lang_enabled ?? true,
        });
      } catch (err) {
        console.error("Failed to load subject config:", err);
      }
    }
    loadConfig();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    const formData = new FormData(e.currentTarget);
    const iqRaw = formData.get("iq_marks");
    const gkRaw = formData.get("gk_marks");
    const langRaw = formData.get("lang_marks");

    const iqMarks = iqRaw !== null && iqRaw !== "" ? Number(iqRaw) : 0;
    const gkMarks = gkRaw !== null && gkRaw !== "" ? Number(gkRaw) : 0;
    const langMarks = langRaw !== null && langRaw !== "" ? Number(langRaw) : 0;

    // Validation for multiples of 2 between 0 and 100
    const isValid = (marks: number) => !isNaN(marks) && marks >= 0 && marks <= 100 && marks % 2 === 0;

    if (subjectConfig.iq && (iqRaw === null || iqRaw === "" || !isValid(iqMarks))) {
      setMessage({ 
        type: 'error', 
        text: 'ඇතුලත්කල බුද්ධි පරීක්ෂණ ලකුණ වලංගු ලකුනක් නොවේ (0-100 අතර ඉරට්ටේ සංඛ්‍යාවක් විය යුතුය).' 
      });
      setLoading(false);
      return;
    }

    if (subjectConfig.gk && (gkRaw === null || gkRaw === "" || !isValid(gkMarks))) {
      setMessage({ 
        type: 'error', 
        text: 'ඇතුලත්කල සාමාන්‍ය දැනීම ලකුණ වලංගු ලකුනක් නොවේ (0-100 අතර ඉරට්ටේ සංඛ්‍යාවක් විය යුතුය).' 
      });
      setLoading(false);
      return;
    }

    if (subjectConfig.lang && (langRaw === null || langRaw === "" || !isValid(langMarks))) {
      setMessage({ 
        type: 'error', 
        text: 'ඇතුලත්කල භාෂා හැකියාව ලකුණ වලංගු ලකුනක් නොවේ (0-100 අතර ඉරට්ටේ සංඛ්‍යාවක් විය යුතුය).' 
      });
      setLoading(false);
      return;
    }

    // Default category to Open
    formData.set("category", "Open");

    const result = await submitMarks(formData);

    setLoading(false);

    if (result.success) {
      setMessage({ type: "success", text: "Marks successfully submitted! Redirecting..." });
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } else {
      setMessage({ type: "error", text: result.error || "Something went wrong." });
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-6 md:py-16 px-3 sm:px-8">
      <Card className="border-0 shadow-2xl shadow-primary/10 rounded-[2.5rem] bg-white overflow-hidden ring-1 ring-primary/5">
        <div className="h-3 bg-gradient-to-r from-primary/50 to-primary w-full" />
        <CardHeader className="text-center space-y-4 pb-10 pt-12">
          <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 text-primary">
            <ClipboardEdit className="w-8 h-8" />
          </div>
          <CardTitle className="text-4xl font-black text-foreground tracking-tight">Enter Marks</CardTitle>
          <CardDescription className="text-lg text-muted-foreground font-medium">
            Fill in the candidate details below to record their performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-12">
          <form onSubmit={handleSubmit} className="space-y-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="space-y-10">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-primary rounded-full" />
                <h3 className="text-xl font-black text-foreground tracking-tight">Student Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="nic" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">NIC Number</Label>
                  <Input 
                    id="nic" 
                    name="nic" 
                    placeholder="e.g. 199912345678" 
                    required 
                    disabled={loading} 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onInput={(e) => {
                      if (/[^0-9]/.test(e.currentTarget.value)) {
                        setNicError(true);
                        setTimeout(() => setNicError(false), 2000);
                      }
                      e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
                    }}
                    className="rounded-2xl border-2 focus:border-primary/50 bg-neutral-50/50 h-14" 
                  />
                  {nicError && (
                    <p className="text-[10px] text-destructive font-black animate-bounce mt-1 ml-1 uppercase tracking-widest">
                      ⚠️ Please enter digits only! / ඉලක්කම් පමණක් ඇතුලත් කරන්න.
                    </p>
                  )}
                  <p className="text-[10px] text-rose-500 font-bold ml-1">V අකුර රහිතව ඔබගේ NIC number එක ඇතුලත් කරන්න.</p>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Full Name</Label>
                  <Input id="name" name="name" placeholder="Candidate Name" required disabled={loading} className="rounded-2xl border-2 focus:border-primary/50 bg-neutral-50/50 h-14" />
                </div>
                
                <div className="space-y-3 relative">
                  <Label htmlFor="whatsapp" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">WhatsApp Number</Label>
                  <Input 
                    id="whatsapp" 
                    name="whatsapp" 
                    value={whatsappNumber}
                    placeholder="e.g. 0771234567" 
                    required 
                    disabled={loading} 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onFocus={() => setShowWhatsappNotice(true)}
                    onBlur={() => setShowWhatsappNotice(false)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setWhatsappNumber(val);
                    }}
                    className="rounded-2xl border-2 focus:border-primary/50 bg-neutral-50/50 h-14" 
                  />
                  {(showWhatsappNotice && whatsappNumber.length === 0) && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-2 p-4 bg-primary text-white rounded-2xl shadow-xl text-xs font-bold leading-relaxed animate-in fade-in slide-in-from-top-2">
                      අපගේ වට්සැප් සමූහයේ සිටින වට්සැප් නම්බර් එක මෙහි ඇතුලත් කරන්න. ඔබගේ ලකුණ වලංගු වන්නේ අපගේ වට්සැප් සමූහයේ සිටීනම් පමණි.
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="province" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Province</Label>
                  <select 
                    id="province" 
                    name="province" 
                    className="flex h-14 w-full rounded-2xl border-2 border-input bg-neutral-50/50 px-4 py-2 text-base font-medium transition-all focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 appearance-none text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                    defaultValue=""
                    disabled={loading}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                  >
                    <option value="" disabled className="bg-white text-foreground">Select province</option>
                    {PROVINCES.map((p) => <option key={p} value={p} className="bg-white text-foreground">{p}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="district" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">District</Label>
                  <select 
                    id="district" 
                    name="district" 
                    className="flex h-14 w-full rounded-2xl border-2 border-input bg-neutral-50/50 px-4 py-2 text-base font-medium transition-all focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 appearance-none text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                    defaultValue=""
                    disabled={loading}
                  >
                    <option value="" disabled className="bg-white text-foreground">Select district</option>
                    {selectedProvince && PROVINCE_DISTRICTS[selectedProvince].map((d) => <option key={d} value={d} className="bg-white text-foreground">{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Performance Data Section with 3 specific subjects: IQ, GK, and Language Proficiency */}
            <div className="space-y-10">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-secondary rounded-full" />
                <h3 className="text-xl font-black text-foreground tracking-tight">Examination Marks / ලකුණු</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjectConfig.iq && (
                  <div className="space-y-3">
                    <Label htmlFor="iq_marks" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
                      බුද්ධි පරීක්ෂණය
                    </Label>
                    <Input 
                      id="iq_marks" 
                      name="iq_marks" 
                      type="number" 
                      min="0" 
                      max="100" 
                      step="2" 
                      placeholder="0, 2, 4... 100" 
                      required 
                      disabled={loading} 
                      className="rounded-2xl border-2 focus:border-primary/50 bg-neutral-50/50 h-14 font-bold text-lg" 
                    />
                  </div>
                )}
                
                {subjectConfig.gk && (
                  <div className="space-y-3">
                    <Label htmlFor="gk_marks" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
                      සාමාන්‍ය දැනීම
                    </Label>
                    <Input 
                      id="gk_marks" 
                      name="gk_marks" 
                      type="number" 
                      min="0" 
                      max="100" 
                      step="2" 
                      placeholder="0, 2, 4... 100" 
                      required 
                      disabled={loading} 
                      className="rounded-2xl border-2 focus:border-primary/50 bg-neutral-50/50 h-14 font-bold text-lg" 
                    />
                  </div>
                )}

                {subjectConfig.lang && (
                  <div className="space-y-3">
                    <Label htmlFor="lang_marks" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
                      භාෂා හැකියාව
                    </Label>
                    <Input 
                      id="lang_marks" 
                      name="lang_marks" 
                      type="number" 
                      min="0" 
                      max="100" 
                      step="2" 
                      placeholder="0, 2, 4... 100" 
                      required 
                      disabled={loading} 
                      className="rounded-2xl border-2 focus:border-primary/50 bg-neutral-50/50 h-14 font-bold text-lg" 
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pt-4">
              <Button 
                type="submit" 
                className={`h-16 rounded-2xl font-black shadow-lg transition-all transform active:scale-95 ${
                  message?.type === 'success' 
                    ? 'w-full sm:w-20 bg-green-500 hover:bg-green-600' 
                    : message?.type === 'error'
                      ? 'w-full sm:w-auto sm:min-w-[200px] text-xl shadow-primary/20 shrink-0'
                      : 'w-full sm:flex-1 text-xl shadow-primary/20 hover:scale-[1.02]'
                }`} 
                disabled={loading}
              >
                {loading ? (
                   <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-white animate-bounce" />
                     <span className="w-2 h-2 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                     <span className="w-2 h-2 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                   </div>
                ) : message?.type === 'success' ? (
                   <CheckCircle2 className="w-8 h-8" />
                ) : (
                  "Submit Marks"
                )}
              </Button>

              {message && message.type === 'error' && (
                <div className="w-full flex-1 bg-rose-50 border-2 border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500 shadow-sm">
                  <AlertCircle className="w-6 h-6 shrink-0 text-[#e11d48]" />
                  <div className="flex-1">
                    <p className="text-xs font-black uppercase tracking-wider text-rose-900 leading-none">Registration Error</p>
                    <p className="text-xs sm:text-sm font-bold text-rose-800 mt-1 leading-snug">{message.text}</p>
                  </div>
                </div>
              )}

              {message && message.type === 'success' && (
                <div className="w-full flex-1 bg-green-50 border-2 border-green-100 text-green-700 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500 shadow-sm">
                  <CheckCircle2 className="w-6 h-6 shrink-0 text-green-500" />
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight leading-none">Accepted</p>
                    <p className="text-xs font-bold opacity-80 mt-1">{message.text}</p>
                  </div>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
