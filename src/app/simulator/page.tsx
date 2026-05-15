import InlegSimulator from "@/components/InlegSimulator";

export default function SimulatorPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inleg simulator</h1>
        <p className="text-slate-500 mt-1">Simuleer de groei van je DEGIRO portefeuille op basis van maandelijkse inleg en verwacht rendement</p>
      </div>
      <InlegSimulator />
    </div>
  );
}
