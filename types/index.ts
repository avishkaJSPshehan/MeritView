export type StudentResult = {
  id: string;
  nic: string;
  name: string;
  province: string;
  district: string;
  category: string;
  subject: string;
  iq_marks: number;
  gk_marks: number;
  lang_marks?: number;
  total_marks: number;
  created_at: string;
  exam_date: string;
  language?: string;
  whatsapp?: string;
};

export type StudentRankData = StudentResult & {
  island_rank?: number | null;
  province_rank?: number | null;
  district_rank?: number | null;
};
