"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart as ChartIcon, Brain, BookOpen, GraduationCap } from "lucide-react";

interface PerformanceDataPoint {
  date: string;
  examName: string;
  iq: number | null;
  gk: number | null;
  lang: number | null;
  total: number;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  name: string;
}

const SUBJECT_CONFIGS = [
  {
    key: "iq" as const,
    name: "බුද්ධි පරීක්ෂණය",
    shortName: "බුද්ධි පරීක්ෂණය",
    color: "#ef4444", // Red (matches reference image)
    icon: Brain,
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200"
  },
  {
    key: "gk" as const,
    name: "සාමාන්‍ය දැනීම",
    shortName: "සාමාන්‍ය දැනීම",
    color: "#3b82f6", // Blue
    icon: BookOpen,
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200"
  },
  {
    key: "lang" as const,
    name: "භාෂා හැකියාව",
    shortName: "භාෂා හැකියාව",
    color: "#10b981", // Emerald
    icon: GraduationCap,
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-200"
  }
];

export default function PerformanceChart({ data, name }: PerformanceChartProps) {
  if (!data || data.length === 0) return null;

  // Compute peak score for each subject, considering only entered (non-null) marks
  const getPeak = (key: "iq" | "gk" | "lang") => {
    const validScores = data
      .map((d) => d[key])
      .filter((v): v is number => typeof v === "number");
    return validScores.length > 0 ? Math.max(...validScores) : null;
  };

  return (
    <Card className="w-full border-0 shadow-2xl rounded-[2.5rem] md:rounded-[3rem] bg-white ring-1 ring-black/5 overflow-hidden animate-in fade-in zoom-in duration-700">
      <CardHeader className="pb-4 px-6 md:px-10 pt-8 md:pt-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <CardTitle className="text-2xl md:text-3xl font-black text-foreground flex items-center gap-3">
              <ChartIcon className="w-7 h-7 text-primary" />
              Performance Growth
            </CardTitle>
            <p className="text-muted-foreground font-medium text-sm md:text-base">
              Tracking exam progress across all subjects for <span className="text-foreground font-bold">{name}</span>
            </p>
          </div>

          {/* Subject Legend Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {SUBJECT_CONFIGS.map((sub) => {
              const Icon = sub.icon;
              return (
                <div
                  key={sub.key}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${sub.bg} ${sub.text} ${sub.border}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: sub.color }}
                  />
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sub.shortName}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-10 pt-2 md:pt-4">
        {/* Line Chart */}
        <div className="h-[320px] md:h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 20, right: 20, left: -10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                dy={10}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                dx={-8}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0]?.payload as PerformanceDataPoint;
                  return (
                    <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl ring-1 ring-black/10 border-0 min-w-[200px]">
                      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">
                        {item.examName || label}
                      </p>
                      <div className="space-y-1.5">
                        {SUBJECT_CONFIGS.map((sub) => {
                          const val = item[sub.key];
                          if (val === null || val === undefined) return null;
                          return (
                            <div
                              key={sub.key}
                              className="flex items-center justify-between text-xs font-bold"
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: sub.color }}
                                />
                                <span className="text-neutral-700">{sub.shortName}</span>
                              </div>
                              <span style={{ color: sub.color }} className="font-extrabold text-sm">
                                {val}
                              </span>
                            </div>
                          );
                        })}
                        <div className="pt-2 mt-2 border-t border-neutral-100 flex items-center justify-between text-xs font-black">
                          <span className="text-neutral-500">Total Marks</span>
                          <span className="text-foreground text-sm">{item.total}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ paddingTop: "20px", fontSize: "12px", fontWeight: "700" }}
              />

              {/* IQ Line */}
              <Line
                type="linear"
                dataKey="iq"
                name="IQ"
                stroke="#ef4444"
                strokeWidth={3}
                connectNulls={false}
                dot={{ r: 5, fill: "#ef4444", stroke: "#ffffff", strokeWidth: 2 }}
                activeDot={{ r: 7, fill: "#ef4444", stroke: "#ffffff", strokeWidth: 2 }}
              />

              {/* GK Line */}
              <Line
                type="linear"
                dataKey="gk"
                name="GK"
                stroke="#3b82f6"
                strokeWidth={3}
                connectNulls={false}
                dot={{ r: 5, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
                activeDot={{ r: 7, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
              />

              {/* Language Line */}
              <Line
                type="linear"
                dataKey="lang"
                name="Language"
                stroke="#10b981"
                strokeWidth={3}
                connectNulls={false}
                dot={{ r: 5, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
                activeDot={{ r: 7, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {SUBJECT_CONFIGS.map((sub) => {
            const peak = getPeak(sub.key);
            const Icon = sub.icon;
            return (
              <div
                key={sub.key}
                className={`${sub.bg} p-5 rounded-3xl border ${sub.border} flex flex-col items-center shadow-sm relative overflow-hidden`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sub.shortName} Peak</span>
                </div>
                <p className={`text-3xl font-black ${sub.text} tracking-tight`}>
                  {peak !== null ? `${peak}` : "—"}
                </p>
                <p className="text-[10px] font-medium text-neutral-400 mt-0.5">
                  {peak !== null ? "Highest recorded" : "No marks entered"}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
