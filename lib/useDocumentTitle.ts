"use client";

import { useEffect } from "react";

const DEFAULT_TITLE = "ChatPulse";

/**
 * Imperatively drive `document.title` for the current view (e.g.
 * `ChatPulse — #general` or `ChatPulse — DM with Ada`). Pass `null` while the
 * name is still loading to hold the default. Restores the default title when
 * the view unmounts so a stale channel name never lingers after navigation.
 */
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${DEFAULT_TITLE} — ${title}` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
