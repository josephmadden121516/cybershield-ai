import { useState } from 'react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type Language = 'en' | 'es';

export default function ExecutiveBriefing() {
  const [lang, setLang] = useState<Language>('en');
  const [loading, setLoading] = useState(false);
  const [remediationResult, setRemediationResult] = useState<{ patchedCode: string; explanation: string } | null>(null);

  // Dictionary for Bilingual Executive Content
  const t = {
    en: {
      title: "ShieldPocket Executive Board Briefing",
      subtitle: "Global AI Developer Hackathon — Automated Remediation & Risk Analysis",
      status: "System Risk Status: CRITICAL",
      vulnerability: "SQL Injection vulnerability detected in authentication module.",
      triggerBtn: "Generate AI Automated Patch via Meta Muse",
      loadingText: "Synthesizing secure patch...",
      patchedHeader: "Generated Remediation Script",
      explanationHeader: "Executive Risk Summary",
    },
    es: {
      title: "Informe de la Junta Directiva de ShieldPocket",
      subtitle: "Hackathon Global de Desarrolladores de IA — Remediación Automatizada y Análisis de Riesgos",
      status: "Estado de Riesgo del Sistema: CRÍTICO",
      vulnerability: "Vulnerabilidad de inyección SQL detectada en el módulo de autenticación.",
      triggerBtn: "Generar Parche Automático con Meta Muse",
      loadingText: "Sintetizando parche seguro...",
      patchedHeader: "Script de Remediación Generado",
      explanationHeader: "Resumen Ejecutivo de Riesgos",
    }
  };

  const handleGeneratePatch = async () => {
    setLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      alert('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.');
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('generate-remediation', {
        body: {
          vulnerability: { id: "CVE-2026-9912", severity: "CRITICAL", type: "SQL Injection" },
          codeSnippet: "const query = `SELECT * FROM users WHERE username = '${userInput}'`;",
          language: "TypeScript"
        }
      });

      if (error) throw error;
      setRemediationResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Error generating remediation: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      {/* Top Header & Language Toggle */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-emerald-400">{t[lang].title}</h1>
          <p className="text-sm text-slate-400 mt-1">{t[lang].subtitle}</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button 
            onClick={() => setLang('en')} 
            className={`px-3 py-1 rounded-md text-xs font-medium transition ${lang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            EN
          </button>
          <button 
            onClick={() => setLang('es')} 
            className={`px-3 py-1 rounded-md text-xs font-medium transition ${lang === 'es' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            ES
          </button>
        </div>
      </div>

      {/* Risk Alert Banner */}
      <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-5 mb-8 shadow-lg">
        <div className="flex items-center space-x-3">
          <span className="h-3 w-3 bg-rose-500 rounded-full animate-pulse"></span>
          <span className="text-rose-400 font-semibold tracking-wider text-xs uppercase">{t[lang].status}</span>
        </div>
        <p className="text-slate-200 mt-2 text-lg font-medium">{t[lang].vulnerability}</p>
        <button
          onClick={handleGeneratePatch}
          disabled={loading}
          className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition shadow-md disabled:opacity-50">
          {loading ? t[lang].loadingText : t[lang].triggerBtn}
        </button>
      </div>

      {/* Results Section */}
      {remediationResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">{t[lang].patchedHeader}</h3>
            <pre className="bg-slate-950 p-4 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800">
              {remediationResult.patchedCode}
            </pre>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-3">{t[lang].explanationHeader}</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{remediationResult.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}