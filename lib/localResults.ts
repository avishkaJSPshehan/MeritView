import fs from 'fs';
import path from 'path';
import { StudentResult } from '@/types';

const RESULTS_FILE = path.join(process.cwd(), 'students_results.json');

export function getLocalResults(): StudentResult[] {
  try {
    if (fs.existsSync(RESULTS_FILE)) {
      const data = fs.readFileSync(RESULTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading local results:", err);
  }
  return [];
}

export function saveLocalResult(record: any): void {
  try {
    const results = getLocalResults();
    if (!record.id) {
      record.id = 'loc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }
    if (!record.created_at) {
      record.created_at = new Date().toISOString();
    }
    const index = results.findIndex(r => r.nic === record.nic && r.exam_date === record.exam_date);
    if (index >= 0) {
      results[index] = { ...results[index], ...record };
    } else {
      results.push(record);
    }
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), 'utf8');
  } catch (err) {
    console.error("Error saving local result:", err);
  }
}

export function deleteLocalResult(id: string): void {
  try {
    const results = getLocalResults();
    const updated = results.filter(r => r.id !== id);
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(updated, null, 2), 'utf8');
  } catch (err) {
    console.error("Error deleting local result:", err);
  }
}

export function deleteLocalResultsByDate(date: string): void {
  try {
    const results = getLocalResults();
    const updated = results.filter(r => r.exam_date !== date);
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(updated, null, 2), 'utf8');
  } catch (err) {
    console.error("Error deleting local results by date:", err);
  }
}

export function deleteAllLocalResults(): void {
  try {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify([], null, 2), 'utf8');
  } catch (err) {
    console.error("Error clearing all local results:", err);
  }
}
