-- =========================================================================
-- COMPLETE SUPABASE DATABASE SCHEMA FOR MERITVIEW / RANKING SYSTEM
-- =========================================================================

-- 1. Table: students_results
CREATE TABLE IF NOT EXISTS public.students_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nic text NOT NULL,
  name text NOT NULL,
  province text NOT NULL,
  district text NOT NULL,
  category text NOT NULL,                     -- e.g. 'Open' or 'limited'
  subject text NOT NULL DEFAULT 'General',    -- Default 'General' for public service exam
  iq_marks integer NOT NULL DEFAULT 0,        -- IQ paper marks (0-100)
  gk_marks integer NOT NULL DEFAULT 0,        -- General Knowledge paper marks (0-100)
  lang_marks integer NOT NULL DEFAULT 0,      -- Language Proficiency paper marks (0-100)
  total_marks integer NOT NULL DEFAULT 0,     -- Aggregate score (sum of active subjects)
  exam_date text,                             -- Scheduled examination date (YYYY-MM-DD)
  language text DEFAULT 'Sinhala',            -- Medium / default language
  whatsapp text,                              -- Contact WhatsApp number
  created_at timestamp DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS students_results_total_marks_idx ON public.students_results (total_marks DESC);
CREATE INDEX IF NOT EXISTS students_results_iq_marks_idx ON public.students_results (iq_marks DESC);
CREATE INDEX IF NOT EXISTS students_results_gk_marks_idx ON public.students_results (gk_marks DESC);
CREATE INDEX IF NOT EXISTS students_results_lang_marks_idx ON public.students_results (lang_marks DESC);
CREATE INDEX IF NOT EXISTS students_results_province_idx ON public.students_results (province);
CREATE INDEX IF NOT EXISTS students_results_district_idx ON public.students_results (district);
CREATE INDEX IF NOT EXISTS students_results_category_idx ON public.students_results (category);
CREATE INDEX IF NOT EXISTS students_results_subject_idx ON public.students_results (subject);
CREATE INDEX IF NOT EXISTS students_results_exam_date_idx ON public.students_results (exam_date);
CREATE INDEX IF NOT EXISTS students_results_nic_idx ON public.students_results (nic);
CREATE UNIQUE INDEX IF NOT EXISTS students_results_nic_exam_date_idx ON public.students_results (nic, exam_date);

-- 3. Table: system_config (Feature Toggles, Active Date & Subject Controls)
CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Initial Seed Defaults for system_config
INSERT INTO public.system_config (key, value) VALUES 
('marks_entry_enabled', 'true'),
('view_rankings_enabled', 'true'),
('subject_iq_enabled', 'true'),
('subject_gk_enabled', 'true'),
('subject_lang_enabled', 'true'),
('ranking_mode', 'general'),
('active_exam_date', CURRENT_DATE::text)
ON CONFLICT (key) DO NOTHING;

-- =========================================================================
-- MIGRATION SCRIPT FOR EXISTING DATABASE
-- (Copy and run this in Supabase SQL Editor if upgrading an existing database)
-- =========================================================================

-- Add any missing columns
ALTER TABLE public.students_results ADD COLUMN IF NOT EXISTS lang_marks integer DEFAULT 0;
ALTER TABLE public.students_results ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.students_results ADD COLUMN IF NOT EXISTS exam_date text;
ALTER TABLE public.students_results ADD COLUMN IF NOT EXISTS language text DEFAULT 'Sinhala';

-- Insert subject toggle defaults into system_config
INSERT INTO public.system_config (key, value) VALUES 
('subject_iq_enabled', 'true'),
('subject_gk_enabled', 'true'),
('subject_lang_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Performance index for exam_date filtering & date-based purging
CREATE INDEX IF NOT EXISTS students_results_exam_date_idx ON public.students_results (exam_date);

-- If Row Level Security (RLS) is enabled, ensure DELETE policy is granted:
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'students_results' AND policyname = 'Allow delete on students_results'
  ) THEN
    CREATE POLICY "Allow delete on students_results" 
    ON public.students_results 
    FOR DELETE 
    USING (true);
  END IF;
END $$;

-- Enforce that the same NIC cannot be submitted more than once for the same exam date
CREATE UNIQUE INDEX IF NOT EXISTS students_results_nic_exam_date_idx ON public.students_results (nic, exam_date);

