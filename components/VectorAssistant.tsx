"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useRouter } from "next/navigation";

type AssistantState =
  | "idle"
  | "starting"
  | "listening"
  | "speaking"
  | "unsupported"
  | "error";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
    length: number;
  };
};

type SpeechRecognitionErrorLike = {
  error: string;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function getPreferredVoice() {
  const voices = window.speechSynthesis.getVoices();

  return (
    voices.find((voice) =>
      /david|mark|daniel|george|james|ryan|alex/i.test(voice.name)
    ) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
    voices[0]
  );
}

function normalizeSpeech(value: string) {
  return value
    .toLowerCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\b(victor|vectors)\b/g, "vector")
    .replace(/\bcheck list\b/g, "checklist")
    .replace(/\bsunday swing\b/g, "sunday planning")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

export default function VectorAssistant() {
  const router = useRouter();

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false);
  const listeningRef = useRef(false);
  const speakingRef = useRef(false);
  const pausedForSpeechRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const lastCommandRef = useRef("");
  const lastCommandTimeRef = useRef(0);

  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<AssistantState>("idle");

  const clearRestartTimer = () => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const startRecognition = () => {
    if (!activeRef.current || speakingRef.current || listeningRef.current) {
      return;
    }

    try {
      pausedForSpeechRef.current = false;
      recognitionRef.current?.start();
      listeningRef.current = true;
      setState("listening");
    } catch {
      listeningRef.current = false;

      if (activeRef.current) {
        restartRecognitionSoon(400);
      }
    }
  };

  const restartRecognitionSoon = (delay = 250) => {
    clearRestartTimer();

    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      startRecognition();
    }, delay);
  };

  const stopRecognitionForSpeech = () => {
    listeningRef.current = false;
    pausedForSpeechRef.current = true;

    try {
      recognitionRef.current?.stop();
    } catch {
      // Already stopped.
    }
  };

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) {
      restartRecognitionSoon(250);
      return;
    }

    stopRecognitionForSpeech();

    speakingRef.current = true;
    setState("speaking");

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getPreferredVoice();

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 1.05;
    utterance.pitch = 0.82;
    utterance.volume = 0.9;

    utterance.onend = () => {
      speakingRef.current = false;

      if (activeRef.current) {
        restartRecognitionSoon(300);
      } else {
        setState("idle");
      }
    };

    utterance.onerror = () => {
      speakingRef.current = false;

      if (activeRef.current) {
        restartRecognitionSoon(300);
      } else {
        setState("idle");
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const runCommand = (rawText: string) => {
    const fullText = normalizeSpeech(rawText);
    const text = fullText.replace(/\bvector\b/g, "").trim() || fullText;
    const now = Date.now();

    if (
      text === lastCommandRef.current &&
      now - lastCommandTimeRef.current < 1800
    ) {
      return;
    }

    lastCommandRef.current = text;
    lastCommandTimeRef.current = now;

    if (includesAny(text, ["delete", "clear all", "remove all", "erase"])) {
      speak("I will not delete or clear saved data by voice in this version.");
      return;
    }

    if (includesAny(text, ["dashboard", "home", "main page"])) {
      router.push("/");
      speak("Opening dashboard.");
      return;
    }

    if (text.includes("checklist") || text.includes("direction engine")) {
      router.push("/checklist");
      speak("Opening checklist.");
      return;
    }

    if (text.includes("journal") || text.includes("journaling")) {
      router.push("/journal");
      speak("Opening journal.");
      return;
    }

    if (text.includes("review") || text.includes("history")) {
      router.push("/review");
      speak("Opening review.");
      return;
    }

    if (
      text.includes("sunday") ||
      text.includes("weekly planning") ||
      text.includes("week planning")
    ) {
      router.push("/sunday-planning");
      speak("Opening Sunday planning.");
      return;
    }

    if (text.includes("settings") || text.includes("preferences")) {
      router.push("/settings");
      speak("Opening settings.");
      return;
    }

    if (
      text.includes("terminal") ||
      text.includes("new trade") ||
      text.includes("trading workspace")
    ) {
      router.push("/terminal");
      speak("Opening the trading workspace.");
      return;
    }

    if (
      includesAny(text, ["what can you do", "help", "commands", "how can you help"])
    ) {
      speak(
        "I can open Trade Wing pages, explain checklist, journal, review, Sunday planning, AOI, SOS, risk to reward, discipline, and tell you today's focus."
      );
      return;
    }

    if (includesAny(text, ["today focus", "today's focus", "mission", "focus today"])) {
      speak("Today your focus is discipline. One setup. Maximum quality. No forced trades.");
      return;
    }

    if (text.includes("explain checklist") || text.includes("what is checklist")) {
      speak(
        "Checklist is your pre trade direction engine. Use it to confirm bias, confluence, risk, and entry conditions before trading."
      );
      return;
    }

    if (text.includes("explain journal") || text.includes("what is journal")) {
      speak(
        "Journal records your trade details, execution, emotions, result, lessons, and linked checklist snapshot."
      );
      return;
    }

    if (text.includes("explain sunday") || text.includes("what is sunday planning")) {
      speak(
        "Sunday planning helps you choose the best pairs for the week and define AOI, support, resistance, confirmation, and what you are waiting for."
      );
      return;
    }

    if (text.includes("explain review") || text.includes("what is review")) {
      speak("Review is for studying completed trades and performance without emotion.");
      return;
    }

    if (text.includes("aoi") || text.includes("area of interest")) {
      speak(
        "AOI means area of interest. In your system, it is a price zone where market acted as both support and resistance."
      );
      return;
    }

    if (text.includes("sos") || text.includes("sign of strength")) {
      speak("SOS means sign of strength. Use it as confirmation, not as a reason to force entry.");
      return;
    }

    if (text.includes("risk to reward") || text.includes("rr")) {
      speak("Risk to reward compares what you risk against what you can make. One to two means risking one unit to target two.");
      return;
    }

    if (text.includes("discipline")) {
      speak("Discipline means waiting for your rules, respecting risk, and avoiding forced trades.");
      return;
    }

    if (text.includes("where") && text.includes("data")) {
      speak("Your saved Trade Wing data is currently stored in this browser on this device unless a backend is added.");
      return;
    }

    if (
      includesAny(text, ["live price", "current price", "news", "alert", "market alert"])
    ) {
      speak("I cannot check live prices or news yet because no reliable live data source is connected.");
      return;
    }

    if (
      fullText.includes("vector") ||
      includesAny(text, ["open", "show", "explain", "what", "how", "where"])
    ) {
      speak("I do not have that command yet. Say help to hear what I can do.");
    }
  };

  const createRecognition = () => {
    const Recognition = getSpeechRecognition();

    if (!Recognition) {
      setState("unsupported");
      setEnabled(false);
      return null;
    }

    const recognition = new Recognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1];

      if (!latest || !latest.isFinal || speakingRef.current) {
        return;
      }

      runCommand(latest[0].transcript);
    };

    recognition.onerror = (event) => {
      listeningRef.current = false;

      if (!activeRef.current || speakingRef.current) {
        return;
      }

      if (event.error === "no-speech" || event.error === "aborted") {
        restartRecognitionSoon(250);
        return;
      }

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        activeRef.current = false;
        setEnabled(false);
        speak("Microphone permission is blocked.");
        return;
      }

      if (event.error === "network") {
        activeRef.current = false;
        setEnabled(false);
        speak("Speech recognition is unavailable in this browser right now.");
        return;
      }

      setState("error");
      restartRecognitionSoon(700);
    };

    recognition.onend = () => {
      listeningRef.current = false;

      if (!activeRef.current || speakingRef.current) {
        return;
      }

      if (pausedForSpeechRef.current) {
        return;
      }

      restartRecognitionSoon(250);
    };

    return recognition;
  };

  const startAssistant = () => {
    if (activeRef.current) return;

    const recognition = createRecognition();

    if (!recognition) {
      return;
    }

    recognitionRef.current = recognition;
    activeRef.current = true;
    setEnabled(true);
    setState("starting");

    speak("Vector online.");
  };

  const stopAssistant = () => {
    activeRef.current = false;
    listeningRef.current = false;
    speakingRef.current = false;
    pausedForSpeechRef.current = false;

    clearRestartTimer();

    try {
      recognitionRef.current?.abort();
    } catch {
      // Already stopped.
    }

    recognitionRef.current = null;
    window.speechSynthesis?.cancel();

    setEnabled(false);
    setState("idle");
  };

  useEffect(() => {
    window.speechSynthesis?.getVoices();

    return () => {
      activeRef.current = false;
      listeningRef.current = false;
      speakingRef.current = false;
      pausedForSpeechRef.current = false;

      clearRestartTimer();

      try {
        recognitionRef.current?.abort();
      } catch {
        // Already stopped.
      }

      window.speechSynthesis?.cancel();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={enabled ? stopAssistant : startAssistant}
      title={
        state === "unsupported"
          ? "Voice not supported"
          : state === "error"
            ? "VECTOR reconnecting"
            : enabled
              ? "VECTOR active"
              : "Activate VECTOR"
      }
      aria-label={enabled ? "Pause VECTOR assistant" : "Activate VECTOR assistant"}
      className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
        state === "error"
          ? "border-red-500/70 bg-red-950/30 text-red-300"
          : enabled
            ? "border-[#159BFF] bg-[#0D2A41] text-[#159BFF]"
            : "border-[#23384C] text-slate-400 hover:bg-[#0C1A26] hover:text-[#159BFF]"
      }`}
    >
      {enabled ? <Mic size={16} /> : <MicOff size={16} />}
    </button>
  );
}