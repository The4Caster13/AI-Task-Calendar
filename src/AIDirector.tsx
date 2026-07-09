import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type AIProvider = "claude" | "gemini";
interface AIMessage { id: string; role: "user" | "assistant"; content: string; provider?: AIProvider; }
interface ToolCall { name: string; input: Record<string, any>; }
type ChatHistories = Record<AIProvider, AIMessage[]>;

const INITIAL_AI_MESSAGE: AIMessage = {
  id: "init",
  role: "assistant",
  content: "Good morning. I've reviewed your project load. **Onboarding Revamp** is close to completion. Want to start there?",
};

const PROVIDER_LABEL: Record<AIProvider, string> = { claude: "Claude", gemini: "Gemini" };
const CHAT_STORAGE_KEY = "ai-director-chat-history";
const MAX_STORED_MESSAGES = 50;

function loadStoredHistories(): ChatHistories {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.claude) && Array.isArray(parsed.gemini)) {
      return parsed;
    }
    // Migrate the old shared-history format (a flat array) into Claude's thread.
    if (Array.isArray(parsed) && parsed.length > 0) {
      return { claude: parsed, gemini: [INITIAL_AI_MESSAGE] };
    }
  } catch {
    // corrupt or unavailable storage — fall back to the default greeting
  }
  return { claude: [INITIAL_AI_MESSAGE], gemini: [INITIAL_AI_MESSAGE] };
}

// Floating AI chat bubble — mounted once at the app level so it's available
// on every page, not just the dashboard.
export default function AIDirector({ state, setState }: { state: any; setState: any }) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<AIProvider>("claude");
  const [histories, setHistories] = useState<ChatHistories>(loadStoredHistories);
  const [input, setInput] = useState("");
  const [sendingFlags, setSendingFlags] = useState<Record<AIProvider, boolean>>({ claude: false, gemini: false });
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = histories[provider];
  const isSending = sendingFlags[provider];

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending, open, provider]);

  useEffect(() => {
    const trimmed: ChatHistories = {
      claude: histories.claude.slice(-MAX_STORED_MESSAGES),
      gemini: histories.gemini.slice(-MAX_STORED_MESSAGES),
    };
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(trimmed));
  }, [histories]);

  const goals: any[] = Array.isArray(state?.goals) ? state.goals : [];

  // Applies add_task/remove_task/add_project/remove_project tool calls to the
  // real, persisted project state and returns human-readable confirmations to
  // show in the chat.
  const applyToolCalls = (toolCalls: ToolCall[]): string[] => {
    if (!toolCalls || toolCalls.length === 0) return [];
    const notes: string[] = [];

    setState((prev: any) => {
      let nextGoals: any[] = Array.isArray(prev?.goals) ? [...prev.goals] : [];

      for (const call of toolCalls) {
        if (call.name === "add_task") {
          const projectTitle = String(call.input?.projectTitle ?? "").trim();
          const title = String(call.input?.title ?? "").trim();
          if (!title) { notes.push("Couldn't add a task without a title."); continue; }
          if (nextGoals.length === 0) { notes.push("There are no projects to add a task to yet."); continue; }

          let targetIndex = nextGoals.findIndex((g) => g.title?.toLowerCase() === projectTitle.toLowerCase());
          if (targetIndex === -1) targetIndex = nextGoals.findIndex((g) => g.title?.toLowerCase().includes(projectTitle.toLowerCase()));
          if (targetIndex === -1) targetIndex = 0;

          const target = nextGoals[targetIndex];
          const newTask = {
            id: crypto.randomUUID(),
            title,
            weight: 3,
            completed: false,
            isPriority: !!call.input?.isPriority,
          };
          nextGoals[targetIndex] = { ...target, tasks: [...(target.tasks ?? []), newTask], updatedAt: Date.now() };
          notes.push(`✓ Added "${title}" to ${target.title}.`);
        }

        if (call.name === "remove_task") {
          const taskTitle = String(call.input?.taskTitle ?? "").trim();
          const projectTitle = call.input?.projectTitle ? String(call.input.projectTitle).trim().toLowerCase() : null;
          if (!taskTitle) { notes.push("Couldn't remove a task without a title."); continue; }

          let removed = false;
          nextGoals = nextGoals.map((g) => {
            if (removed) return g;
            if (projectTitle && !g.title?.toLowerCase().includes(projectTitle)) return g;
            const tasks = g.tasks ?? [];
            const idx = tasks.findIndex((t: any) => t.title?.toLowerCase().includes(taskTitle.toLowerCase()));
            if (idx === -1) return g;
            removed = true;
            notes.push(`✓ Removed "${tasks[idx].title}" from ${g.title}.`);
            return { ...g, tasks: tasks.filter((_: any, i: number) => i !== idx), updatedAt: Date.now() };
          });
          if (!removed) notes.push(`Couldn't find a task matching "${taskTitle}".`);
        }

        if (call.name === "add_project") {
          const title = String(call.input?.title ?? "").trim();
          if (!title) { notes.push("Couldn't create a project without a title."); continue; }

          const description = String(call.input?.description ?? "").trim();
          const deadlineInput = call.input?.deadline ? String(call.input.deadline).trim() : "";
          const deadlineMs = deadlineInput ? new Date(deadlineInput).getTime() : NaN;

          const palette = ["#5b4be0", "#00d4ff", "#a855f7", "#39ff14", "#f59e0b", "#ef4444"];
          const newGoal = {
            id: crypto.randomUUID(),
            title,
            description,
            color: palette[nextGoals.length % palette.length],
            tasks: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: "active",
            ...(Number.isFinite(deadlineMs) ? { deadline: deadlineMs } : {}),
          };
          nextGoals = [...nextGoals, newGoal];
          notes.push(`✓ Created project "${title}".`);
        }

        if (call.name === "remove_project") {
          const projectTitle = String(call.input?.projectTitle ?? "").trim();
          if (!projectTitle) { notes.push("Couldn't remove a project without a title."); continue; }

          let idx = nextGoals.findIndex((g) => g.title?.toLowerCase() === projectTitle.toLowerCase());
          if (idx === -1) idx = nextGoals.findIndex((g) => g.title?.toLowerCase().includes(projectTitle.toLowerCase()));

          if (idx === -1) {
            notes.push(`Couldn't find a project matching "${projectTitle}".`);
          } else {
            const removedTitle = nextGoals[idx].title;
            nextGoals = nextGoals.filter((_, i) => i !== idx);
            notes.push(`✓ Removed project "${removedTitle}" and all its tasks.`);
          }
        }
      }

      return { ...prev, goals: nextGoals };
    });

    return notes;
  };

  const sendMessage = async () => {
    const text = input.trim();
    const activeProvider = provider;
    if (!text || sendingFlags[activeProvider]) return;

    const userMessage: AIMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const nextMessages = [...histories[activeProvider], userMessage];

    setHistories((prev) => ({ ...prev, [activeProvider]: nextMessages }));
    setInput("");
    setSendingFlags((prev) => ({ ...prev, [activeProvider]: true }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: activeProvider,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          context: {
            projects: goals.map((g) => ({
              title: g.title,
              tasks: (g.tasks ?? []).map((t: any) => ({ title: t.title, completed: !!t.completed })),
            })),
          },
        }),
      });
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      const data = await res.json();
      const answeredBy: AIProvider = data.provider ?? activeProvider;

      const replies: AIMessage[] = [];
      if (data.reply) {
        replies.push({ id: crypto.randomUUID(), role: "assistant", content: data.reply, provider: answeredBy });
      }
      for (const note of applyToolCalls(data.toolCalls ?? [])) {
        replies.push({ id: crypto.randomUUID(), role: "assistant", content: note, provider: answeredBy });
      }
      setHistories((prev) => ({ ...prev, [activeProvider]: [...prev[activeProvider], ...replies] }));
    } catch (err) {
      setHistories((prev) => ({
        ...prev,
        [activeProvider]: [...prev[activeProvider], {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Sorry, I couldn't reach ${PROVIDER_LABEL[activeProvider]} just now. Make sure the API server is running and its API key is set.`,
        }],
      }));
    } finally {
      setSendingFlags((prev) => ({ ...prev, [activeProvider]: false }));
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 w-80 h-[28rem] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-border flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent"><Sparkles size={16} /></div>
                <div>
                  <p className="text-xs font-bold">AI Director</p>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">Live Analysis</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/40 border border-border">
                <button
                  onClick={() => setProvider("claude")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-colors",
                    provider === "claude" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles size={10} /> Claude
                </button>
                <button
                  onClick={() => setProvider("gemini")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-colors",
                    provider === "gemini" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Zap size={10} /> Gemini
                </button>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 p-5 overflow-y-auto space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={cn("max-w-[85%]", m.role === "assistant" ? "mr-auto" : "ml-auto")}>
                  <div
                    className={cn(
                      "p-3 rounded-xl text-xs leading-relaxed",
                      m.role === "assistant"
                        ? "bg-muted/20 border border-border text-muted-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    {m.content}
                  </div>
                  {m.role === "assistant" && m.provider && (
                    <p className="text-[9px] font-mono text-muted-foreground/70 uppercase tracking-tighter mt-1 ml-1">
                      {PROVIDER_LABEL[m.provider]}
                    </p>
                  )}
                </div>
              ))}
              {isSending && (
                <div className="p-3 rounded-xl bg-muted/20 border border-border text-xs text-muted-foreground mr-auto w-fit">
                  Thinking…
                </div>
              )}
            </div>
            <div className="p-5 border-t border-border shrink-0">
              <div className="relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={isSending}
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 pr-10 text-xs outline-none focus:border-primary/50 disabled:opacity-60"
                  placeholder="Ask anything..."
                />
                <button
                  onClick={sendMessage}
                  disabled={isSending || !input.trim()}
                  aria-label="Send message"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-white disabled:opacity-40"
                >
                  <Send size={10} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AI Director" : "Open AI Director"}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </button>
    </>
  );
}
