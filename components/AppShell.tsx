
"use client";

import VectorAssistant from "./VectorAssistant";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import Sidebar from "./Sidebar";
import StartupAnimation from "./StartupAnimation";

const DASHBOARD_TRACKS = [
  "/Audio/dashboard/dashboard-01-startup.mp3",
  "/Audio/dashboard/dashboard-02.mp3",
  "/Audio/dashboard/dashboard-03.mp3",
  "/Audio/dashboard/dashboard-04.mp3",
];

const JOURNAL_TRACKS = [
  "/Audio/journal/journal-01.mp3",
  "/Audio/journal/journal-02.mp3",
];

function isDashboardPath(pathname: string) {
  const path = pathname.toLowerCase();
  return path === "/" || path.includes("dashboard");
}

function isJournalPath(pathname: string) {
  return pathname.toLowerCase().includes("journal");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

type AudioManager = {
  dashboard: HTMLAudioElement | null;
  journal: HTMLAudioElement | null;
  dashboardTrackIndex: number;
  journalTrackIndex: number;
  dashboardStarted: boolean;
  journalStarted: boolean;
  dashboardFadeTimer: number | null;
  dashboardVolumeTimer: number | null;
  journalRestartTimer: number | null;
  dashboardReturnVolume: boolean;
  journalWaiting: boolean;
  initialized: boolean;
};

declare global {
  interface Window {
    __TRADEWING_AUDIO__?: AudioManager;
  }
}

function getAudioManager(): AudioManager {
  if (typeof window === "undefined") {
    throw new Error("Audio manager can only be created in the browser.");
  }

  if (!window.__TRADEWING_AUDIO__) {
    window.__TRADEWING_AUDIO__ = {
      dashboard: null,
      journal: null,
      dashboardTrackIndex: 0,
      journalTrackIndex: 0,
      dashboardStarted: false,
      journalStarted: false,
      dashboardFadeTimer: null,
      dashboardVolumeTimer: null,
      journalRestartTimer: null,
      dashboardReturnVolume: false,
      journalWaiting: false,
      initialized: false,
    };
  }

  return window.__TRADEWING_AUDIO__;
}
function getTimeInZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  return hour * 60 + minute;
}

function isSessionOpen(timeZone: string) {
  const minutes = getTimeInZone(timeZone);
  return minutes >= 8 * 60 && minutes < 17 * 60;
}

function getForexSession() {
  const london = isSessionOpen("Europe/London");
  const newYork = isSessionOpen("America/New_York");
  const tokyo = isSessionOpen("Asia/Tokyo");

  if (london && newYork) {
    return "London · NY Overlap";
  }

  if (london) return "London";
  if (newYork) return "New York";
  if (tokyo) return "Tokyo";
  return "Sydney";
}
export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const routeRef = useRef(pathname || "/");
  const [now, setNow] = useState<Date | null>(null);
  const [session, setSession] = useState("Loading...");

  useEffect(() => {
  const updateClock = () => {
    setNow(new Date());
    setSession(getForexSession());
  };

  updateClock();

  const timer = window.setInterval(updateClock, 1000);

  return () => window.clearInterval(timer);
}, []);
  useEffect(() => {
    routeRef.current = pathname || "/";
  }, [pathname]);

  useEffect(() => {
    const manager = getAudioManager();

    if (!manager.dashboard) {
      manager.dashboard = new Audio(DASHBOARD_TRACKS[0]);
      manager.dashboard.preload = "auto";
      manager.dashboard.volume = 0.8;
    }

    if (!manager.journal) {
      manager.journal = new Audio(JOURNAL_TRACKS[0]);
      manager.journal.preload = "auto";
      manager.journal.volume = 0.65;
    }

    const dashboardAudio = manager.dashboard;
    const journalAudio = manager.journal;

    const safePlay = async (audio: HTMLAudioElement) => {
      try {
        await audio.play();
      } catch {
        // Browser autoplay policy may block sound until interaction.
      }
    };

    const clearDashboardFade = () => {
      if (manager.dashboardFadeTimer !== null) {
        window.clearInterval(manager.dashboardFadeTimer);
        manager.dashboardFadeTimer = null;
      }
    };

    const clearJournalRestart = () => {
      if (manager.journalRestartTimer !== null) {
        window.clearTimeout(manager.journalRestartTimer);
        manager.journalRestartTimer = null;
      }

      manager.journalWaiting = false;
    };

    const pauseDashboard = () => {
      clearDashboardFade();
      manager.dashboardReturnVolume = false;
      dashboardAudio.pause();
    };

    const pauseJournal = () => {
      journalAudio.pause();
    };

    const startDashboardTrack = (index: number) => {
      if (!isDashboardPath(routeRef.current)) return;

      clearDashboardFade();
      manager.dashboardTrackIndex = index;
      manager.dashboardReturnVolume = false;
      dashboardAudio.src = DASHBOARD_TRACKS[index];
      dashboardAudio.currentTime = 0;
      dashboardAudio.volume = index === 0 ? 0.8 : 0.65;
      manager.dashboardStarted = true;

      void safePlay(dashboardAudio);
    };

    const fadeDashboardBackIn = () => {
      clearDashboardFade();
      manager.dashboardReturnVolume = true;
      dashboardAudio.volume = 0.4;

      const startedAt = Date.now();
      const duration = 2000;

      manager.dashboardFadeTimer = window.setInterval(() => {
        const progress = Math.min(
          1,
          (Date.now() - startedAt) / duration
        );

        dashboardAudio.volume = 0.4 + 0.25 * progress;

        if (progress >= 1) {
          clearDashboardFade();
          dashboardAudio.volume = 0.65;
        }
      }, 50);
    };

    const startOrResumeDashboard = () => {
      if (!isDashboardPath(routeRef.current)) return;

      pauseJournal();

      if (!manager.dashboardStarted) {
        startDashboardTrack(0);
        return;
      }

      if (dashboardAudio.paused && !dashboardAudio.ended) {
        fadeDashboardBackIn();
        void safePlay(dashboardAudio);
      }
    };

    const startJournalTrack = (index: number) => {
      if (!isJournalPath(routeRef.current)) return;

      clearJournalRestart();
      manager.journalTrackIndex = index;
      manager.journalWaiting = false;
      journalAudio.src = JOURNAL_TRACKS[index];
      journalAudio.currentTime = 0;
      journalAudio.volume = 0.65;
      manager.journalStarted = true;

      void safePlay(journalAudio);
    };

    const queueJournalRestart = () => {
      if (manager.journalRestartTimer !== null) return;

      manager.journalWaiting = true;

      manager.journalRestartTimer = window.setTimeout(() => {
        manager.journalRestartTimer = null;

        if (!isJournalPath(routeRef.current)) {
          manager.journalWaiting = false;
          return;
        }

        startJournalTrack(0);
      }, 5000);
    };

    const startOrResumeJournal = () => {
      if (!isJournalPath(routeRef.current)) return;

      pauseDashboard();

      if (!manager.journalStarted) {
        startJournalTrack(0);
        return;
      }

      if (manager.journalWaiting) return;

      if (journalAudio.paused && !journalAudio.ended) {
        void safePlay(journalAudio);
      }
    };

    const handleDashboardEnded = () => {
      if (!isDashboardPath(routeRef.current)) return;

      const nextTrack = manager.dashboardTrackIndex + 1;

      if (nextTrack < DASHBOARD_TRACKS.length) {
        startDashboardTrack(nextTrack);
      } else {
        manager.dashboardTrackIndex = 0;
        manager.dashboardStarted = false;
      }
    };

    const handleJournalEnded = () => {
      if (!isJournalPath(routeRef.current)) return;

      const nextTrack = manager.journalTrackIndex + 1;

      if (nextTrack < JOURNAL_TRACKS.length) {
        startJournalTrack(nextTrack);
      } else {
        queueJournalRestart();
      }
    };

    const startDashboardVolumeController = () => {
      if (manager.dashboardVolumeTimer !== null) return;

      manager.dashboardVolumeTimer = window.setInterval(() => {
        if (
          !isDashboardPath(routeRef.current) ||
          dashboardAudio.paused ||
          manager.dashboardTrackIndex !== 0
        ) {
          return;
        }

        if (
          manager.dashboardFadeTimer !== null ||
          manager.dashboardReturnVolume
        ) {
          return;
        }

        const time = dashboardAudio.currentTime;

        if (time < 25) {
          dashboardAudio.volume = 0.8;
        } else if (time < 40) {
          const progress = (time - 25) / 15;

          dashboardAudio.volume = Math.max(
            0.45,
            0.8 - 0.35 * progress
          );
        } else {
          dashboardAudio.volume = 0.45;
        }
      }, 100);
    };

    const syncAudioForRoute = () => {
      routeRef.current = pathname || "/";

      if (isDashboardPath(routeRef.current)) {
        startOrResumeDashboard();
        return;
      }

      if (isJournalPath(routeRef.current)) {
        startOrResumeJournal();
        return;
      }

      pauseDashboard();
      pauseJournal();
    };

    if (!manager.initialized) {
      manager.initialized = true;

      dashboardAudio.addEventListener(
        "ended",
        handleDashboardEnded
      );

      journalAudio.addEventListener(
        "ended",
        handleJournalEnded
      );

      startDashboardVolumeController();
    }

    syncAudioForRoute();

    return () => {
      // Intentionally keep audio manager alive across navigation.
    };
  }, [pathname]);

  return (
    <div className="h-screen overflow-hidden bg-[#05090E] text-slate-100">
      <StartupAnimation />

      <header className="flex h-[80px] shrink-0 items-center justify-between border-b border-[#142A3D] bg-[#05090E] px-7">
        <div className="text-[27px] font-extrabold tracking-[-0.03em] text-white">
          Trade
          <span className="text-[#159BFF]">Wing</span>
        </div>

        <div className="flex items-center gap-5 text-[13px] font-bold">
          <VectorAssistant />

          <span className="text-slate-400">
            {now ? formatDate(now) : "Loading date…"}
          </span>

          <span className="h-5 w-px bg-[#23384C]" />

          <span className="text-slate-300 tabular-nums">
            {now ? formatTime(now) : "--:--:--"}
          </span>

          <span className="h-5 w-px bg-[#23384C]" />

          <span className="flex items-center gap-2 text-[#159BFF]">
  <span className="h-2 w-2 rounded-full bg-[#159BFF]" />
  {session}
</span>

          <span className="h-5 w-px bg-[#23384C]" />

          <button
            type="button"
            aria-label="Notifications"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-[#0C1A26] hover:text-slate-200"
          >
            <Bell size={17} />
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)] min-h-0">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
