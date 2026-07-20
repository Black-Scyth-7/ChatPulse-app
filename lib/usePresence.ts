"use client";

import { apiUrl } from "@/lib/apiBase";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { PresenceStatus } from "./socket-events";
import { useSocket } from "./useSocket";

/**
 * Client-side presence store, shared by every surface that shows a status dot
 * (sidebar DM list, channel header, DM header). Seeded once from
 * `GET /api/users/online` and kept live by the `presence:changed` broadcast, so
 * we fetch the roster a single time and every avatar reads the same map.
 *
 * The map only holds users who are *not* offline (online/away). A user going
 * offline is removed, and `getStatus` returns "offline" for anyone absent —
 * which keeps the map bounded as people come and go over a long session.
 */

interface PresenceContextValue {
  /** Live status per user id; absent users are offline. */
  statuses: Map<string, PresenceStatus>;
  /** Status for a single user, defaulting to "offline" when unknown. */
  getStatus: (userId: string) => PresenceStatus;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

/** Dot colour token per presence status (semantic palette from tokens.md). */
export const PRESENCE_DOT: Record<PresenceStatus, string> = {
  online: "bg-success",
  away: "bg-warning",
  offline: "bg-offline",
};

/** Human label per presence status. */
export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  online: "Online",
  away: "Away",
  offline: "Offline",
};

/** Sort rank so online sorts before away before offline. */
export function presenceRank(status: PresenceStatus): number {
  return status === "online" ? 0 : status === "away" ? 1 : 2;
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { on, off } = useSocket();
  const [statuses, setStatuses] = useState<Map<string, PresenceStatus>>(
    () => new Map(),
  );

  // Seed the roster from the REST endpoint on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/users/online"));
        if (!res.ok) return;
        const data: { userId: string; status: PresenceStatus }[] =
          await res.json();
        if (cancelled) return;
        setStatuses(
          new Map(
            data
              .filter((u) => u.status !== "offline")
              .map((u) => [u.userId, u.status]),
          ),
        );
      } catch {
        // Leave the map empty; everyone reads as offline until an event lands.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fold each live change into the map.
  useEffect(() => {
    const onChanged = (data: { userId: string; status: PresenceStatus }) => {
      setStatuses((prev) => {
        const next = new Map(prev);
        if (data.status === "offline") next.delete(data.userId);
        else next.set(data.userId, data.status);
        return next;
      });
    };
    on("presence:changed", onChanged);
    return () => {
      off("presence:changed", onChanged);
    };
  }, [on, off]);

  const getStatus = useCallback(
    (userId: string): PresenceStatus => statuses.get(userId) ?? "offline",
    [statuses],
  );

  return createElement(
    PresenceContext.Provider,
    { value: { statuses, getStatus } },
    children,
  );
}

export function usePresence(): PresenceContextValue {
  const ctx = useContext(PresenceContext);
  if (!ctx) {
    throw new Error("usePresence must be used within a <PresenceProvider>");
  }
  return ctx;
}
