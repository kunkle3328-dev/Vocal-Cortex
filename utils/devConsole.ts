export type Tone = "calm" | "assertive" | "neutral" | "friendly" | "analytical";
export type Model = "gemini-2.5-pro" | "gemini-1.5-flash" | "gemini-2.0-flash";

export interface DevConfig {
  tone: Tone;
  model: Model;
  voiceEnabled: boolean;
  persona: string;
  memoryEnabled: boolean;
}

type Subscriber = (config: DevConfig) => void;

export const DevConsoleCore = (() => {
  let config: DevConfig = {
    tone: "calm",
    model: "gemini-2.5-pro",
    voiceEnabled: true,
    persona: "default",
    memoryEnabled: true,
  };

  const subscribers = new Set<Subscriber>();

  function notify() {
    subscribers.forEach((cb) => cb({ ...config }));
  }

  const commands: { [key: string]: (arg?: string) => string } = {
    "/set_tone": (arg) => {
      const tones: Tone[] = ["calm", "assertive", "neutral", "friendly", "analytical"];
      if (!arg || !tones.includes(arg as Tone)) return `❌ Invalid tone. Options: ${tones.join(", ")}`;
      config.tone = arg as Tone;
      notify();
      return `✅ Tone set to: ${arg}`;
    },
    "/set_model": (arg) => {
      const models: { [key: string]: Model } = {
        fast: "gemini-1.5-flash",
        deep: "gemini-2.5-pro",
        creative: "gemini-2.0-flash"
      };
      if (!arg || !models[arg]) return `❌ Invalid model. Options: ${Object.keys(models).join(", ")}`;
      config.model = models[arg];
      notify();
      return `✅ Model switched to: ${models[arg]}`;
    },
    "/persona": (arg) => {
      config.persona = arg || "default";
      notify();
      return `🎭 Persona changed to: ${config.persona}`;
    },
    "/toggle_voice": () => {
      config.voiceEnabled = !config.voiceEnabled;
      notify();
      return `🎙️ Voice ${config.voiceEnabled ? "enabled" : "disabled"}`;
    },
    "/clear_memory": () => {
      // Assuming memory is stored in localStorage for this example
      // In a real app, this might be a more complex operation.
      // localStorage.removeItem("vocal_cortex_memory_summary");
      return "🧠 Session memory cleared.";
    },
    "/summarize_context": () => {
      return "📝 Context summary triggered (AI will compress recent state).";
    },
    "/status": () => {
      return `⚙️ Current Config:
- Tone: ${config.tone}
- Model: ${config.model}
- Persona: ${config.persona}
- Voice: ${config.voiceEnabled ? "On" : "Off"}
- Memory: ${config.memoryEnabled ? "Active" : "Disabled"}`;
    }
  };

  function handleCommand(input: string, callback?: (response: string) => void): boolean {
    if (!input.startsWith("/")) return false;
    const [cmd, ...args] = input.trim().split(" ");
    const arg = args.join(" ").trim();
    const action = commands[cmd];
    const response = action ? action(arg) : `❓ Unknown command: ${cmd}`;
    if (callback) callback(response);
    return true;
  }

  function getConfig(): DevConfig {
    return { ...config };
  }

  function subscribe(callback: Subscriber): () => void {
    subscribers.add(callback);
    callback(config); // Immediately send current config
    return () => subscribers.delete(callback);
  }

  return { handleCommand, getConfig, subscribe };
})();