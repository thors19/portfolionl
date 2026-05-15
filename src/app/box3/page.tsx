import Box3Calculator from "@/components/Box3Calculator";

export default function Box3Page() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Box 3 calculator</h1>
        <p className="text-slate-500 mt-1">Bereken je vermogensbelasting op basis van de Nederlandse Box 3 regels (2025)</p>
      </div>
      <Box3Calculator />
    </div>
  );
}
