"use server";

import { supabase } from "@/lib/supabase/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { StudentResult } from "@/types";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getLocalConfigMap, saveLocalConfig } from "@/lib/localConfig";
import { getLocalResults, saveLocalResult, deleteLocalResult } from "@/lib/localResults";

export async function submitMarks(formData: FormData) {
  try {
    const nic = (formData.get("nic") as string || "").trim();
    const name = (formData.get("name") as string || "").trim();
    const province = (formData.get("province") as string || "").trim();
    const district = (formData.get("district") as string || "").trim();
    const category = (formData.get("category") as string || "Open").trim();
    const whatsapp = (formData.get("whatsapp") as string || "").trim();

    // Check system config
    const config = await getSystemConfig();
    if (!config.marks_entry) {
      return { success: false, error: "Marks submission is currently disabled by the administrator." };
    }

    const isValid = (marks: number) => !isNaN(marks) && marks >= 0 && marks <= 100 && marks % 2 === 0;

    // Read marks for the 3 subjects
    const iqRaw = formData.get("iq_marks");
    const gkRaw = formData.get("gk_marks");
    const langRaw = formData.get("lang_marks");

    const iq_marks = iqRaw !== null && iqRaw !== "" ? parseInt(iqRaw as string, 10) : 0;
    const gk_marks = gkRaw !== null && gkRaw !== "" ? parseInt(gkRaw as string, 10) : 0;
    const lang_marks = langRaw !== null && langRaw !== "" ? parseInt(langRaw as string, 10) : 0;

    if (!nic || !name || !province || !district || !whatsapp) {
      return { success: false, error: "All student information fields including WhatsApp number are required." };
    }

    // Validate marks for enabled subjects
    if (config.subject_iq_enabled) {
      if (iqRaw === null || iqRaw === "" || !isValid(iq_marks)) {
        return { success: false, error: "වලංගු IQ ලකුණක් ඇතුලත් කරන්න (0-100 අතර ඉරට්ටේ සංඛ්‍යාවක්)." };
      }
    }
    if (config.subject_gk_enabled) {
      if (gkRaw === null || gkRaw === "" || !isValid(gk_marks)) {
        return { success: false, error: "වලංගු සාමාන්‍ය දැනීම (GK) ලකුණක් ඇතුලත් කරන්න (0-100 අතර ඉරට්ටේ සංඛ්‍යාවක්)." };
      }
    }
    if (config.subject_lang_enabled) {
      if (langRaw === null || langRaw === "" || !isValid(lang_marks)) {
        return { success: false, error: "වලංගු භාෂා ප්‍රවීණතාව (Language Proficiency) ලකුණක් ඇතුලත් කරන්න (0-100 අතර ඉරට්ටේ සංඛ්‍යාවක්)." };
      }
    }

    // Calculate total marks based on active subjects
    let total_marks = 0;
    if (config.subject_iq_enabled) total_marks += iq_marks;
    if (config.subject_gk_enabled) total_marks += gk_marks;
    if (config.subject_lang_enabled) total_marks += lang_marks;

    // Fetch active exam date from config
    const activeExamDate = config.active_exam_date || new Date().toISOString().split('T')[0];

    const studentRecord: any = {
      id: 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      nic,
      name,
      province,
      district,
      category,
      subject: "General",
      iq_marks: config.subject_iq_enabled ? iq_marks : 0,
      gk_marks: config.subject_gk_enabled ? gk_marks : 0,
      lang_marks: config.subject_lang_enabled ? lang_marks : 0,
      total_marks,
      exam_date: activeExamDate,
      language: "Sinhala",
      whatsapp,
      created_at: new Date().toISOString()
    };

    // Try inserting into Supabase
    try {
      let { error } = await supabaseAdmin.from("students_results").insert([studentRecord]);

      if (error) {
        // If error is due to missing lang_marks column in the database, retry without lang_marks
        if (error.message?.includes("lang_marks") || error.details?.includes("lang_marks")) {
          const fallbackRecord = { ...studentRecord };
          delete fallbackRecord.lang_marks;
          await supabaseAdmin.from("students_results").insert([fallbackRecord]);
        } else {
          console.warn("Supabase insert notice (saving to local persistence fallback):", error.message || error);
        }
      }
    } catch (dbErr: any) {
      console.warn("Supabase network/connection exception (saving to local persistence fallback):", dbErr?.message);
    }

    // Always ensure local persistence is safely saved/updated
    saveLocalResult(studentRecord);

    revalidatePath("/admin");
    revalidatePath("/leaderboard");
    revalidatePath("/result");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Something went wrong" };
  }
}

export async function searchStudent(nic: string, examDate?: string): Promise<{ success: boolean; data?: StudentResult[]; error?: string }> {
  try {
    if (!nic) {
      return { success: false, error: "NIC is required." };
    }

    // Check system config
    const config = await getSystemConfig();
    if (!config.view_rankings) {
      return { success: false, error: "Result viewing is currently disabled by the administrator." };
    }

    const activeDate = config.active_exam_date;
    let effectiveDate = activeDate;

    // If a different date is requested, check if it's an admin
    if (examDate && examDate !== activeDate) {
      const cookieStore = await cookies();
      if (cookieStore.get("admin_token")) {
        effectiveDate = examDate;
      }
    }

    const { data, error } = await supabaseAdmin
      .from("students_results")
      .select("*")
      .eq("nic", nic)
      .eq("exam_date", effectiveDate);

    if (error) {
      console.warn("searchStudent Supabase error:", error.message);
      const localData = getLocalResults();
      const localMatches = localData.filter(s => s.nic === nic && (!effectiveDate || s.exam_date === effectiveDate));
      if (localMatches.length > 0) {
        return { success: true, data: localMatches };
      }
      return { success: false, error: "Result not found for this NIC on the active exam date." };
    }

    if (!data || data.length === 0) {
      const localData = getLocalResults();
      const localMatches = localData.filter(s => s.nic === nic && (!effectiveDate || s.exam_date === effectiveDate));
      if (localMatches.length > 0) {
        return { success: true, data: localMatches };
      }
      return { success: false, error: "Result not found for this NIC on the active exam date." };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Something went wrong" };
  }
}

export async function getStudentRank(
  resultId: string, 
  type: 'island' | 'province' | 'district',
  sortBy: 'total_marks' | 'iq_marks' | 'gk_marks' | 'lang_marks' = 'total_marks',
  scope: 'subject' | 'general' | 'category' = 'subject',
  ignoreLanguage: boolean = false
) {
  try {
    let student: any = null;
    try {
      const { data, error } = await supabaseAdmin
        .from("students_results")
        .select("*")
        .eq("id", resultId)
        .single();
      if (!error && data) student = data;
    } catch (e) {
      // Supabase unavailable
    }

    if (!student) {
      const localResults = getLocalResults();
      student = localResults.find(r => r.id === resultId);
    }
 
    if (!student) {
      return { rank: null, totalCandidates: 0, error: "Student not found" };
    }
 
    const config = await getSystemConfig();
    const systemRankingMode = config.ranking_mode || "general";
    const effectiveRankingMode = scope === 'category' ? 'categorized' : (scope === 'general' ? 'general' : systemRankingMode);

    const computeLocalRank = () => {
      const localData = getLocalResults();
      let pool = localData.filter(r => !student.exam_date || r.exam_date === student.exam_date);
      if (type === 'province') pool = pool.filter(r => r.province === student.province);
      else if (type === 'district') pool = pool.filter(r => r.district === student.district);
      if (effectiveRankingMode === 'categorized') pool = pool.filter(r => r.category === student.category);
      if (student.language && !ignoreLanguage) pool = pool.filter(r => r.language === student.language);

      const uniquePool = new Map<string, number>();
      pool.forEach(row => {
        const val = (row as any)[sortBy] ?? 0;
        const cur = uniquePool.get(row.nic);
        if (cur === undefined || val > cur) uniquePool.set(row.nic, val);
      });
      const studentScore = (student as any)[sortBy] ?? 0;
      let higher = 0;
      uniquePool.forEach(score => {
        if (score > studentScore) higher++;
      });
      return { rank: higher + 1, totalCandidates: uniquePool.size };
    };

    if (scope === 'subject') {
      try {
        let query = supabaseAdmin.from("students_results").select("id", { count: 'exact', head: true });
        query = query.eq('subject', student.subject);
        if (student.exam_date) query = query.eq('exam_date', student.exam_date);
        
        if (type === 'province') query = query.eq('province', student.province);
        else if (type === 'district') query = query.eq('district', student.district);
        if (effectiveRankingMode === 'categorized') query = query.eq('category', student.category);
        if (student.language && !ignoreLanguage) query = query.eq('language', student.language);

        const { count: totalCandidates, error: countErr } = await query;
        if (countErr) throw countErr;

        let higherScoresQuery = supabaseAdmin
          .from("students_results")
          .select("id", { count: 'exact', head: true })
          .eq('subject', student.subject)
          .gt(sortBy, student[sortBy]);
        
        if (student.exam_date) higherScoresQuery = higherScoresQuery.eq('exam_date', student.exam_date);

        if (type === 'province') higherScoresQuery = higherScoresQuery.eq('province', student.province);
        else if (type === 'district') higherScoresQuery = higherScoresQuery.eq('district', student.district);
        if (effectiveRankingMode === 'categorized') higherScoresQuery = higherScoresQuery.eq('category', student.category);
        if (student.language && !ignoreLanguage) higherScoresQuery = higherScoresQuery.eq('language', student.language);

        const { count: higherScoresCount, error: rankErr } = await higherScoresQuery;
        if (rankErr) throw rankErr;

        const rank = (higherScoresCount || 0) + 1;
        return { rank, totalCandidates: totalCandidates || 0 };
      } catch (err) {
        return computeLocalRank();
      }
    } else {
      try {
        let poolData: any[] = [];
        let from = 0;
        const pageSize = 1000;
        let finished = false;

        while (!finished) {
          let pageQuery = supabaseAdmin
            .from("students_results")
            .select("nic, " + sortBy)
            .range(from, from + pageSize - 1);

          if (type === 'province') pageQuery = pageQuery.eq('province', student.province);
          else if (type === 'district') pageQuery = pageQuery.eq('district', student.district);

          if (student.exam_date) pageQuery = pageQuery.eq('exam_date', student.exam_date);

          if (effectiveRankingMode === 'categorized') {
            pageQuery = pageQuery.eq('category', student.category);
          }

          if (student.language && !ignoreLanguage) {
            pageQuery = pageQuery.eq('language', student.language);
          }

          const { data, error } = await pageQuery;
          if (error) throw error;
          if (!data || data.length === 0) {
            finished = true;
          } else {
            poolData = poolData.concat(data);
            if (data.length < pageSize) finished = true;
            else from += pageSize;
          }
        }

        const uniquePool = new Map<string, number>();
        (poolData as any[]).forEach(row => {
          const currentScore = row[sortBy];
          const existingScore = uniquePool.get(row.nic);
          if (existingScore === undefined || currentScore > existingScore) {
            uniquePool.set(row.nic, currentScore);
          }
        });

        const totalCandidates = uniquePool.size;
        const studentScore = student[sortBy];
        
        let higherCount = 0;
        uniquePool.forEach((score) => {
          if (score > studentScore) {
            higherCount++;
          }
        });

        return { rank: higherCount + 1, totalCandidates };
      } catch (err) {
        return computeLocalRank();
      }
    }
  } catch (error: any) {
    return { rank: null, totalCandidates: 0, error: error.message };
  }
}

export async function getCategoryPeakMarks(category: string, province?: string, district?: string, examDate?: string) {
  try {
    const config = await getSystemConfig();
    const activeDate = config.active_exam_date;
    let effectiveDate = activeDate;

    if (examDate && examDate !== activeDate) {
      const cookieStore = await cookies();
      if (cookieStore.get("admin_token")) {
        effectiveDate = examDate;
      }
    }

    let query = supabaseAdmin
      .from("students_results")
      .select("*")
      .eq("category", category)
      .eq("exam_date", effectiveDate);
    
    if (province) query = query.eq("province", province);
    if (district) query = query.eq("district", district);

    const { data, error } = await query;
    if (error) throw error;

    let maxIQ = 0;
    let maxGK = 0;
    let maxLang = 0;

    data?.forEach(row => {
      if (row.iq_marks && row.iq_marks > maxIQ) maxIQ = row.iq_marks;
      if (row.gk_marks && row.gk_marks > maxGK) maxGK = row.gk_marks;
      if (row.lang_marks && row.lang_marks > maxLang) maxLang = row.lang_marks;
    });

    return { success: true, maxIQ, maxGK, maxLang };
  } catch (err: any) {
    const local = getLocalResults().filter(r => 
      r.category === category && 
      (!examDate || r.exam_date === examDate) &&
      (!province || r.province === province) &&
      (!district || r.district === district)
    );
    let maxIQ = 0;
    let maxGK = 0;
    let maxLang = 0;
    local.forEach(row => {
      if (row.iq_marks && row.iq_marks > maxIQ) maxIQ = row.iq_marks;
      if (row.gk_marks && row.gk_marks > maxGK) maxGK = row.gk_marks;
      if (row.lang_marks && row.lang_marks > maxLang) maxLang = row.lang_marks;
    });
    return { success: true, maxIQ, maxGK, maxLang };
  }
}

export async function getStudentCandidateStats(resultId: string) {
  try {
    let student: any = null;
    try {
      const { data, error } = await supabaseAdmin
        .from("students_results")
        .select("*")
        .eq("id", resultId)
        .single();
      if (!error && data) student = data;
    } catch (e) {}

    if (!student) {
      student = getLocalResults().find(r => r.id === resultId);
    }

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    const { subject, province, district } = student;

    // Helper for counts
    const getCount = async (filters: { subject?: string; province?: string; district?: string; examDate?: string }) => {
      try {
        let query = supabaseAdmin.from("students_results").select("id", { count: 'exact', head: true });
        if (filters.subject) query = query.eq('subject', filters.subject);
        if (filters.province) query = query.eq('province', filters.province);
        if (filters.district) query = query.eq('district', filters.district);
        if (filters.examDate) query = query.eq('exam_date', filters.examDate);
        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
      } catch (err) {
        let pool = getLocalResults();
        if (filters.subject) pool = pool.filter(r => r.subject === filters.subject);
        if (filters.province) pool = pool.filter(r => r.province === filters.province);
        if (filters.district) pool = pool.filter(r => r.district === filters.district);
        if (filters.examDate) pool = pool.filter(r => r.exam_date === filters.examDate);
        return pool.length;
      }
    };

    // Main Category Counts (Island, Province, District)
    const [catIsland, catProvince, catDistrict] = await Promise.all([
      getCount({}),
      getCount({ province }),
      getCount({ district })
    ]);

    // Subject Counts (Island, Province, District)
    const [subIsland, subProvince, subDistrict] = await Promise.all([
      getCount({ subject }),
      getCount({ subject, province }),
      getCount({ subject, district })
    ]);

    return {
      success: true,
      categoryStats: { island: catIsland, province: catProvince, district: catDistrict },
      subjectStats: { island: subIsland, province: subProvince, district: subDistrict }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getGlobalCandidateStats(subject: string, examDate?: string) {
  try {
    const config = await getSystemConfig();
    const activeDate = config.active_exam_date;
    let effectiveDate = activeDate;

    if (examDate && examDate !== activeDate) {
      const cookieStore = await cookies();
      if (cookieStore.get("admin_token")) {
        effectiveDate = examDate;
      }
    }

    // Helper for counts
    const getCount = async (filters: { subject?: string; examDate?: string }) => {
      let query = supabaseAdmin.from("students_results").select("id", { count: 'exact', head: true });
      if (filters.subject) query = query.eq('subject', filters.subject);
      query = query.eq('exam_date', filters.examDate || effectiveDate);
      const { count } = await query;
      return count || 0;
    };

    const catTotal = await getCount({ examDate: effectiveDate });
    const subTotal = await getCount({ subject, examDate: effectiveDate });

    return {
      success: true,
      categoryTotal: catTotal,
      subjectTotal: subTotal
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getAdminRankings(
  params: {
    subject?: string;
    province?: string;
    district?: string;
    category?: string;
    sortBy?: "total_marks" | "iq_marks" | "gk_marks" | "lang_marks";
    examDate?: string;
    language?: string;
  }
) {
  try {
    const config = await getSystemConfig();
    const activeDate = config.active_exam_date;
    let effectiveDate = activeDate;

    // If a different date is requested, check if it's an admin
    if (params.examDate && params.examDate !== activeDate) {
      const cookieStore = await cookies();
      if (cookieStore.get("admin_token")) {
        effectiveDate = params.examDate;
      }
    }

    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let finished = false;

    while (!finished) {
      let pageQuery = supabaseAdmin.from("students_results").select("*");

      if (params.subject) pageQuery = pageQuery.eq("subject", params.subject);
      if (params.province) pageQuery = pageQuery.eq("province", params.province);
      if (params.district) pageQuery = pageQuery.eq("district", params.district);
      if (params.category) pageQuery = pageQuery.eq("category", params.category);
      if (params.language) pageQuery = pageQuery.eq("language", params.language);
      
      // Always filter by the effective date
      pageQuery = pageQuery.eq("exam_date", effectiveDate);

      const sortColumn = params.sortBy || "total_marks";
      pageQuery = pageQuery.order(sortColumn, { ascending: false }).range(from, from + pageSize - 1);

      const { data, error } = await pageQuery;

      if (error) {
        console.warn("getAdminRankings Supabase error:", error.message);
        const localData = getLocalResults();
        let filtered = localData.filter(s => !effectiveDate || s.exam_date === effectiveDate);
        if (params.category && params.category !== "ALL") filtered = filtered.filter(s => s.category === params.category);
        if (params.province) filtered = filtered.filter(s => s.province === params.province);
        if (params.district) filtered = filtered.filter(s => s.district === params.district);
        const sortCol = params.sortBy || "total_marks";
        filtered.sort((a: any, b: any) => (b[sortCol] ?? 0) - (a[sortCol] ?? 0));
        return { success: true, data: filtered };
      }

      if (!data || data.length === 0) {
        finished = true;
      } else {
        allData = allData.concat(data);
        if (data.length < pageSize) finished = true;
        else from += pageSize;
      }
      
      // Safety cap
      if (allData.length >= 200000) finished = true;
    }

    return { success: true, data: allData as StudentResult[] };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function adminLogin(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  
  const validUser = process.env.ADMIN_USERNAME || "admin";
  const validPass = process.env.ADMIN_PASSWORD || "admin123";

  if (username === validUser && password === validPass) {
    const cookieStore = await cookies();
    cookieStore.set("admin_token", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 // 1 day
    });
    return { success: true };
  }
  return { success: false, error: "Invalid credentials" };
}

export async function verifyAdminPassword(password: string) {
  const validPass = process.env.ADMIN_PASSWORD || "admin123";
  return password === validPass;
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
  return { success: true };
}

/** 
 * ADMIN EXCLUSIVE ACTIONS 
 * (In a real app, these should check for admin_token cookie again or use supabaseAdmin Auth)
 */

export async function deleteAllData() {
  const cookieStore = await cookies();
  if (!cookieStore.get("admin_token")) return { success: false, error: "Unauthorized" };

  try {
    const { error } = await supabaseAdmin
      .from("students_results")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Standard way to delete all in supabaseAdmin without RLS issues sometimes

    if (error) return { success: false, error: error.message };
    
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getSystemConfig() {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_config")
      .select("*");
    
    if (error || !data) {
      const localMap = getLocalConfigMap();
      return { 
        marks_entry: localMap["marks_entry_enabled"] === "true", 
        view_rankings: localMap["view_rankings_enabled"] === "true", 
        ranking_mode: localMap["ranking_mode"] || "general",
        active_exam_date: localMap["active_exam_date"] || new Date().toISOString().split('T')[0],
        subject_iq_enabled: localMap["subject_iq_enabled"] === "true",
        subject_gk_enabled: localMap["subject_gk_enabled"] === "true",
        subject_lang_enabled: localMap["subject_lang_enabled"] === "true",
        db_connected: false,
      };
    }
    
    const configMap: Record<string, boolean> = {};
    data.forEach(item => {
      configMap[item.key] = item.value === "true";
    });
    
    return {
      marks_entry: configMap["marks_entry_enabled"] ?? true,
      view_rankings: configMap["view_rankings_enabled"] ?? true,
      ranking_mode: data.find(c => c.key === "ranking_mode")?.value || "general",
      active_exam_date: data.find(c => c.key === "active_exam_date")?.value || new Date().toISOString().split('T')[0],
      subject_iq_enabled: configMap["subject_iq_enabled"] ?? true,
      subject_gk_enabled: configMap["subject_gk_enabled"] ?? true,
      subject_lang_enabled: configMap["subject_lang_enabled"] ?? true,
      db_connected: true,
    };
  } catch (err: any) {
    const localMap = getLocalConfigMap();
    return { 
      marks_entry: localMap["marks_entry_enabled"] === "true", 
      view_rankings: localMap["view_rankings_enabled"] === "true", 
      ranking_mode: localMap["ranking_mode"] || "general",
      active_exam_date: localMap["active_exam_date"] || new Date().toISOString().split('T')[0],
      subject_iq_enabled: localMap["subject_iq_enabled"] === "true",
      subject_gk_enabled: localMap["subject_gk_enabled"] === "true",
      subject_lang_enabled: localMap["subject_lang_enabled"] === "true",
      db_connected: false,
    };
  }
}

export async function getUserPerformance(nic: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("students_results")
      .select("*")
      .eq("nic", nic)
      .order("exam_date", { ascending: true });

    if (error) throw error;

    const performanceMap = new Map<string, { iq: number, gk: number, lang?: number, total: number }>();
    data?.forEach(row => {
      performanceMap.set(row.exam_date, { iq: row.iq_marks, gk: row.gk_marks, lang: row.lang_marks, total: row.total_marks });
    });

    return { 
      success: true, 
      data: Array.from(performanceMap.entries()).map(([date, marks]) => ({
        date,
        ...marks
      }))
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleConfig(
  key: "marks_entry_enabled" | "view_rankings_enabled" | "ranking_mode" | "active_exam_date" | "subject_iq_enabled" | "subject_gk_enabled" | "subject_lang_enabled", 
  currentValue: any
) {
  const cookieStore = await cookies();
  if (!cookieStore.get("admin_token")) return { success: false, error: "Unauthorized" };

  let newValue: string;
  if (key === "ranking_mode") {
    newValue = currentValue === "general" ? "categorized" : "general";
  } else if (key === "active_exam_date") {
    newValue = currentValue; // currentValue is the new date string in this case
  } else {
    newValue = (!currentValue).toString();
  }

  // Always save locally so system config works immediately even when Supabase is offline/paused
  saveLocalConfig(key, newValue);

  try {
    const { error } = await supabaseAdmin
      .from("system_config")
      .upsert({ key: key, value: newValue }, { onConflict: 'key' });

    if (error) {
      console.warn("Supabase upsert warning:", error.message);
    }
  } catch (err: any) {
    console.warn("Supabase network error (using local storage fallback):", err?.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/enter-marks");
  revalidatePath("/result");
  revalidatePath("/leaderboard");
  return { success: true };
}
export async function deleteStudent(id: string) {
  const cookieStore = await cookies();
  if (!cookieStore.get("admin_token")) return { success: false, error: "Unauthorized" };

  try {
    deleteLocalResult(id);
    await supabaseAdmin
      .from("students_results")
      .delete()
      .eq("id", id);

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    deleteLocalResult(id);
    revalidatePath("/admin");
    return { success: true };
  }
}

export async function getOverallCandidateCount(examDate?: string) {
  try {
    const config = await getSystemConfig();
    const activeDate = config.active_exam_date;
    let effectiveDate = activeDate;

    if (examDate && examDate !== activeDate) {
      const cookieStore = await cookies();
      if (cookieStore.get("admin_token")) {
        effectiveDate = examDate;
      }
    }

    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let finished = false;

    while (!finished) {
      let query = supabaseAdmin
        .from("students_results")
        .select("nic")
        .eq("exam_date", effectiveDate)
        .range(from, from + pageSize - 1);
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (!data || data.length === 0) {
        finished = true;
      } else {
        allData = allData.concat(data);
        if (data.length < pageSize) finished = true;
        else from += pageSize;
      }

      if (allData.length >= 200000) finished = true;
    }
    
    const uniqueNics = new Set(allData.map(item => item.nic));
    return { success: true, count: uniqueNics.size };
  } catch (err: any) {
    const local = getLocalResults().filter(r => !examDate || r.exam_date === examDate);
    const uniqueNics = new Set(local.map(item => item.nic));
    return { success: true, count: uniqueNics.size };
  }
}

export async function getAdminContacts() {
  const cookieStore = await cookies();
  if (!cookieStore.get("admin_token")) return { success: false, error: "Unauthorized", data: [] };

  try {
    const config = await getSystemConfig();
    const activeDate = config.active_exam_date;

    const { data, error } = await supabaseAdmin
      .from("students_results")
      .select("id, nic, whatsapp, name, total_marks, iq_marks, gk_marks")
      .eq("exam_date", activeDate)
      .order("total_marks", { ascending: false });

    if (error) throw error;

    // Group by NIC to get unique contacts (highest marks first since we ordered by total_marks)
    const contactsMap = new Map<string, { id: string, nic: string, whatsapp: string, name: string, total_marks: number, iq_marks: number, gk_marks: number, ids: string[] }>();
    data?.forEach(row => {
      if (row.whatsapp) {
        if (!contactsMap.has(row.nic)) {
          contactsMap.set(row.nic, { 
            id: row.id,
            nic: row.nic, 
            whatsapp: row.whatsapp, 
            name: row.name, 
            total_marks: row.total_marks,
            iq_marks: row.iq_marks,
            gk_marks: row.gk_marks,
            ids: [row.id]
          });
        } else {
          contactsMap.get(row.nic)?.ids.push(row.id);
        }
      }
    });

    return { success: true, data: Array.from(contactsMap.values()) };
  } catch (err: any) {
    const config = await getSystemConfig();
    const activeDate = config.active_exam_date;
    const local = getLocalResults().filter(r => !activeDate || r.exam_date === activeDate);
    const contactsMap = new Map<string, { id: string, nic: string, whatsapp: string, name: string, total_marks: number, iq_marks: number, gk_marks: number, ids: string[] }>();
    local.forEach(row => {
      if (row.whatsapp) {
        if (!contactsMap.has(row.nic)) {
          contactsMap.set(row.nic, {
            id: row.id,
            nic: row.nic,
            whatsapp: row.whatsapp,
            name: row.name,
            total_marks: row.total_marks,
            iq_marks: row.iq_marks,
            gk_marks: row.gk_marks,
            ids: [row.id]
          });
        } else {
          contactsMap.get(row.nic)?.ids.push(row.id);
        }
      }
    });
    return { success: true, data: Array.from(contactsMap.values()) };
  }
}
