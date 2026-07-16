"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ChannelSummary } from "@/lib/types";

/**
 * Client-side store for the current user's channel list. Fetched once from
 * `GET /api/channels` and shared by every sidebar surface (desktop aside and
 * the mobile drawer) so we don't fetch the list twice.
 */

type LoadStatus = "loading" | "ready" | "error";

interface ChannelsContextValue {
  channels: ChannelSummary[];
  status: LoadStatus;
  /** Append a newly created channel (no-op if already present). */
  addChannel: (channel: ChannelSummary) => void;
}

const ChannelsContext = createContext<ChannelsContextValue | null>(null);

export function ChannelsProvider({ children }: { children: React.ReactNode }) {
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/channels");
        if (!res.ok) throw new Error(`Failed to load channels (${res.status})`);
        const data: { channels?: ChannelSummary[] } = await res.json();
        if (cancelled) return;
        setChannels(data.channels ?? []);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addChannel = useCallback((channel: ChannelSummary) => {
    setChannels((prev) =>
      prev.some((c) => c.id === channel.id) ? prev : [...prev, channel],
    );
  }, []);

  return (
    <ChannelsContext.Provider value={{ channels, status, addChannel }}>
      {children}
    </ChannelsContext.Provider>
  );
}

export function useChannels(): ChannelsContextValue {
  const ctx = useContext(ChannelsContext);
  if (!ctx) {
    throw new Error("useChannels must be used within a <ChannelsProvider>");
  }
  return ctx;
}
