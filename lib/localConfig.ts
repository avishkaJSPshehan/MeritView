import fs from 'fs';
import path from 'path';

const FALLBACK_FILE = path.join(process.cwd(), 'system_config.json');

const DEFAULT_CONFIG: Record<string, string> = {
  marks_entry_enabled: "true",
  view_rankings_enabled: "true",
  ranking_mode: "general",
  active_exam_date: new Date().toISOString().split('T')[0],
  subject_iq_enabled: "true",
  subject_gk_enabled: "true",
  subject_lang_enabled: "true"
};

export function getLocalConfigMap(): Record<string, string> {
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      const content = fs.readFileSync(FALLBACK_FILE, 'utf8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    }
  } catch (e) {
    console.error("Error reading local config fallback:", e);
  }
  return { ...DEFAULT_CONFIG };
}

export function saveLocalConfig(key: string, value: string): void {
  try {
    const current = getLocalConfigMap();
    current[key] = value;
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(current, null, 2), 'utf8');
  } catch (e) {
    console.error("Error writing local config fallback:", e);
  }
}
