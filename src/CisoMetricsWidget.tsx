import React, { useState } from 'react';

export default function CisoMetricsWidget() {
  const [activeTab, setActiveTab] = useState<'overview' | 'simulation' | 'compliance'>('overview');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 font-sans mt-8">
      {/* Widget Header & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="h-2.5 w-2.5 bg-emerald-400 rounded-full animate-ping"></span>
            CISO Executive Risk Posture
          </h2>
          <p className="text-xs text-slate-400 mt-1">Real-time threat telemetry & compliance mapping</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            Overview
          </button>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${activeTab === 'simulation' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            Attack Tree Sim
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${activeTab === 'compliance' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            Global Compliance
          </button>
        </div>
      </div>

      {/* Tab 1: Overview & Metrics */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Risk Score</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-amber-400">74</span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-amber-400 h-full w-[74%] rounded-full"></div>
            </div>
            <p className="text-[11px] text-amber-400/80 mt-2">Moderate Risk (Pending Patch)</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Automated Patch Readiness</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-emerald-400">98.2%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-400 h-full w-[98%] rounded-full"></div>
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-2">Meta Muse Engine Active</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Threats</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-rose-500">1</span>
              <span className="text-xs text-slate-400">Critical CVE</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-rose-500 h-full w-[25%] rounded-full"></div>
            </div>
            <p className="text-[11px] text-rose-400/80 mt-2">SQL Injection (CVE-2026-9912)</p>
          </div>
        </div>
      )}

      {/* Tab 2: Attack Tree Simulation */}
      {activeTab === 'simulation' && (
        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl font-mono text-xs">
          <div className="text-indigo-400 font-semibold mb-2">Simulated Blast Radius (What-If Scenario)</div>
          <div className="space-y-2 text-slate-300">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-rose-950 border border-rose-800 text-rose-400 rounded">Entry</span>
              <span>SQL Injection in Auth API (`/api/v1/login`)</span>
            </div>
            <div className="ml-4 pl-4 border-l border-slate-800 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-950 border border-amber-800 text-amber-400 rounded">Pivot</span>
              <span>PostgreSQL Role Privilege Escalation</span>
            </div>
            <div className="ml-8 pl-4 border-l border-slate-800 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-400 rounded">Target</span>
              <span>Encrypted User Data Vault Exfiltration</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Global Compliance Frameworks */}
      {activeTab === 'compliance' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { name: "GDPR", status: "Compliant", color: "text-emerald-400 border-emerald-900/50 bg-emerald-950/30" },
            { name: "EU AI Act", status: "Compliant", color: "text-emerald-400 border-emerald-900/50 bg-emerald-950/30" },
            { name: "PCI-DSS v4.0", status: "Action Required", color: "text-amber-400 border-amber-900/50 bg-amber-950/30" },
            { name: "ISO 27001", status: "Compliant", color: "text-emerald-400 border-emerald-900/50 bg-emerald-950/30" },
          ].map((item, idx) => (
            <div key={idx} className={`p-3 rounded-lg border ${item.color}`}>
              <div className="font-bold text-sm text-slate-200">{item.name}</div>
              <div className="text-[11px] mt-1 font-medium">{item.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}