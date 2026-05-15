import { ReactNode } from "react";

type Color = "blue" | "green" | "red" | "amber" | "slate";

const colorMap: Record<Color, { bg: string; icon: string; text: string }> = {
  blue:  { bg: "bg-blue-50",   icon: "text-blue-600",  text: "text-blue-700" },
  green: { bg: "bg-green-50",  icon: "text-green-600", text: "text-green-700" },
  red:   { bg: "bg-red-50",    icon: "text-red-600",   text: "text-red-700" },
  amber: { bg: "bg-amber-50",  icon: "text-amber-600", text: "text-amber-700" },
  slate: { bg: "bg-slate-50",  icon: "text-slate-600", text: "text-slate-700" },
};

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: ReactNode;
  color: Color;
}

export default function StatCard({ label, value, subValue, icon, color }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500 font-medium">{label}</span>
        <span className={`${c.bg} ${c.icon} p-2 rounded-lg`}>{icon}</span>
      </div>
      <div className={`text-xl font-bold ${c.text}`}>{value}</div>
      {subValue && <div className="text-sm text-slate-400 mt-1">{subValue}</div>}
    </div>
  );
}
