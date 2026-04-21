import React, { useState } from "react";
import { Search, FileText, ShieldCheck, ArrowRight, Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";

interface GraphResult {
  file_path: string;
  research: string;
  report: string;
  audit: string;
  iterations: number;
  status: string;
}

export default function App() {
  const [filePath, setFilePath] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GraphResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!filePath.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath }),
      });

      if (!response.ok) throw new Error("Failed to execute research graph");

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isAuditPass = result?.audit.trim().toUpperCase().startsWith("PASS");

  const getReportText = (text: string) => {
    try {
      let cleaned = text;
      // Check if it's still a JSON-like string (structured format)
      if (text.startsWith('[') && text.endsWith(']')) {
        const match = text.match(/['"]text['"]:\s*['"]([\s\S]*?)['\"]/g);
        if (match) {
          cleaned = match.map(m => m.replace(/['"]text['"]:\s*['"]/, '').replace(/['"]$/, '').replace(/\\n/g, '\n')).join('\n\n');
        }
      }

      // Remove any remaining PASS/FAIL markers
      cleaned = cleaned.replace(/^(PASS|FAIL)\s*:?\s*/gi, '').trim();

      return cleaned;
    } catch (e) {
      return text;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9ff] via-[#fff5f8] to-[#f5faff] text-[#141414] font-sans selection:bg-[#ff85a2] selection:text-white">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-pink-200 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-200 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[#141414]/5 p-6 flex justify-between items-center bg-white/40 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase italic font-serif">Iterative Research Graph</h1>
          <p className="text-xs font-mono opacity-60 uppercase tracking-widest">LangGraph + Gemma4</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="border-[#141414] font-mono">
            v1.0.0
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Control Panel */}
        <div className="lg:col-span-4 space-y-6 relative z-10">
          <Card className="bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl shadow-xl shadow-pink-500/5">
            <CardHeader className="border-b border-[#141414]/5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-pink-600">Configuration</CardTitle>
              <CardDescription className="text-xs italic opacity-60">Define your research parameters</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-60">File Path</label>
                <Input
                  placeholder="e.g. dataset/lab.csv"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  className="bg-white/50 border-[#141414]/10 rounded-2xl focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:border-pink-300 transition-all px-4"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleRun}
                disabled={loading || !filePath.trim()}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl hover:shadow-lg hover:shadow-pink-500/20 transition-all font-semibold py-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing Graph...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run Workflow
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Workflow Status */}
          <Card className="bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl shadow-xl shadow-blue-500/5">
            <CardHeader className="border-b border-[#141414]/5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-blue-600">Workflow State</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {[
                  { id: "research", label: "Research", icon: Search, color: "bg-pink-400" },
                  { id: "report", label: "Report", icon: FileText, color: "bg-purple-400" },
                  { id: "audit", label: "Audit", icon: ShieldCheck, color: "bg-blue-400" },
                ].map((node, index) => (
                  <div key={node.id} className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl bg-white shadow-sm text-[#141414]/80 ${loading ? 'animate-bounce' : ''}`}>
                      <node.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase text-[#141414]/40 tracking-wider font-mono">{node.label}</p>
                      <div className="h-2 bg-white/80 rounded-full mt-1.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: result ? "100%" : loading ? "50%" : "0%" }}
                          className={`h-full ${node.color} rounded-full`}
                        />
                      </div>
                    </div>
                    {index < 2 && <ArrowRight className="h-4 w-4 opacity-10" />}
                  </div>
                ))}
              </div>

              {result && (
                <div className="mt-8 pt-6 border-t border-[#141414] space-y-2">
                  <div className="flex justify-between text-[10px] font-mono uppercase opacity-60">
                    <span>Iterations</span>
                    <span>{result.iterations} / 3</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono uppercase opacity-60">
                    <span>Final Status</span>
                    <span className={isAuditPass ? "text-green-700" : "text-red-700"}>
                      {isAuditPass ? "PASSED" : "FAILED / MAX ITERATIONS"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {!result && !loading && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center border border-dashed border-[#141414]/30 p-12 text-center"
              >
                <Search className="h-12 w-12 mb-4 opacity-20" />
                <h3 className="font-serif italic text-xl">Ready for Research</h3>
                <p className="text-sm opacity-60 max-w-xs mt-2">
                  Enter a file path and run the workflow to start the iterative research and auditing process.
                </p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center border border-dashed border-[#141414]/30 p-12 text-center"
              >
                <Loader2 className="h-12 w-12 mb-4 animate-spin opacity-20" />
                <h3 className="font-serif italic text-xl">Agent is Working</h3>
                <p className="text-sm opacity-60 max-w-xs mt-2">
                  Gemini is researching, synthesizing, and auditing your request. This may take a few moments.
                </p>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center border border-dashed border-red-500/30 p-12 text-center"
              >
                <XCircle className="h-12 w-12 mb-4 text-red-500 opacity-20" />
                <h3 className="font-serif italic text-xl text-red-700">Execution Error</h3>
                <p className="text-sm opacity-60 max-w-xs mt-2 text-red-600">
                  {error}
                </p>
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Professional Report Display */}
                <div className="bg-white rounded-[40px] shadow-2xl shadow-purple-500/10 p-12 min-h-[800px] relative overflow-hidden border border-white/80">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300" />
                  <div className="flex justify-between items-start mb-12">
                    <div>
                      <h2 className="text-3xl font-serif italic font-bold tracking-tight mb-1 text-purple-900">Hospital Discharge Report</h2>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">Confidential Intelligence Output</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono uppercase opacity-60">Generated: {new Date().toLocaleDateString()}</p>
                      <p className="text-[10px] font-mono uppercase opacity-60">Status: Verified</p>
                    </div>
                  </div>

                  <div className="prose prose-stone max-w-none">
                    <p className="text-base leading-relaxed whitespace-pre-wrap font-serif text-[#141414]/90 first-letter:text-4xl first-letter:font-bold first-letter:mr-2 first-letter:float-left">
                      {getReportText(result.report)}
                    </p>
                  </div>

                  <div className="mt-16 pt-8 border-t border-dashed border-[#141414]/20 flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[9px] font-mono uppercase opacity-40">System Reference: LB-GR-2024</p>
                      <p className="text-[9px] font-mono uppercase opacity-40">Agent: Gemini-4-Model-A</p>
                    </div>
                    <div className="h-8 w-32 border border-[#141414]/20 flex items-center justify-center opacity-20">
                      <span className="text-[8px] font-mono uppercase">Internal Stamp</span>
                    </div>
                  </div>
                </div>

                {/* Audit Result */}
                <Card className={`bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border-white/60 border-2 overflow-hidden ${isAuditPass ? 'shadow-green-500/10' : 'shadow-red-500/10'}`}>
                  <CardHeader className="flex flex-row items-center justify-between border-b border-[#141414]/5 bg-white/30">
                    <div>
                      <CardTitle className={`text-sm font-bold uppercase tracking-wider ${isAuditPass ? 'text-green-600' : 'text-red-600'}`}>Quality Audit Feedback</CardTitle>
                      <CardDescription className="text-xs italic opacity-60">Assessment of report accuracy and completeness</CardDescription>
                    </div>
                    {isAuditPass ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-sm font-mono whitespace-pre-wrap text-[#141414]/80 leading-relaxed">{getReportText(result.audit)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#141414]/5 p-8 mt-12 bg-white/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] font-mono uppercase opacity-40 tracking-widest">
          <span>Iterative Research Graph System</span>
          <span>Aesthetically Clean & Colorful Output</span>
        </div>
      </footer>
    </div>
  );
}
