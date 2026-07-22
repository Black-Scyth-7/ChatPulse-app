"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { isNativePlatform } from "@/lib/capacitor";
import { initStatusBar, hideSplash } from "@/lib/nativeShell";

/**
 * Native UX layer for the Android app (CHAA-56). Wraps the authenticated shell
 * and, only inside the Capacitor native build, wires up:
 *
 *  - Status bar theming + splash hide (see lib/nativeShell.ts).
 *  - The Android hardware **back button** (`@capacitor/app` `backButton`):
 *      1. If a modal has registered a back handler → close the top-most modal.
 *      2. Else if a chat/DM is open → go back to the conversation list.
 *      3. Else (on the list root) → show a confirm-exit dialog.
 *
 * Modals opt in with {@link useBackHandler}, which pushes a close handler onto a
 * LIFO stack while the modal is open. On web/desktop the provider is an inert
 * pass-through: `isNativePlatform()` is false, so no listeners are attached.
 */

type BackHandler = () => void;
/** A live reference to a modal's current close handler (kept fresh via a ref). */
type BackHandlerRef = { current: BackHandler };

interface NativeUxContextValue {
  /** Register a modal close handler; returns an unregister fn. Native-only use. */
  registerBackHandler: (ref: BackHandlerRef) => () => void;
}

const NativeUxContext = createContext<NativeUxContextValue | null>(null);

export function NativeUxProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // A LIFO stack of open-modal close handlers. The back button pops the top one.
  const stackRef = useRef<BackHandlerRef[]>([]);
  // Read router/pathname inside the (once-registered) back listener via refs so
  // it never needs to re-subscribe as the route changes.
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const [exitOpen, setExitOpen] = useState(false);
  const exitOpenRef = useRef(exitOpen);
  exitOpenRef.current = exitOpen;

  const registerBackHandler = useCallback((ref: BackHandlerRef) => {
    stackRef.current.push(ref);
    return () => {
      stackRef.current = stackRef.current.filter((r) => r !== ref);
    };
  }, []);

  // Status bar + splash: assert once the shell mounts on the native platform.
  useEffect(() => {
    if (!isNativePlatform()) return;
    void initStatusBar();
    void hideSplash();
  }, []);

  // Hardware back button: registered once; all state read through refs.
  useEffect(() => {
    if (!isNativePlatform()) return;
    let remove: (() => void) | undefined;
    void (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", () => {
          // 1. A confirm-exit dialog is up → back dismisses it.
          if (exitOpenRef.current) {
            setExitOpen(false);
            return;
          }
          // 2. An open modal registered a handler → close the top-most one.
          const top = stackRef.current[stackRef.current.length - 1];
          if (top) {
            top.current();
            return;
          }
          // 3. A chat/DM is open → return to the conversation list.
          if (/^\/(channel|dm)\/[^/]+/.test(pathnameRef.current)) {
            routerRef.current.push("/");
            return;
          }
          // 4. On the list root → confirm before exiting the app.
          setExitOpen(true);
        });
        remove = () => void handle.remove();
      } catch {
        // @capacitor/app missing — leave default (immediate-exit) behaviour.
      }
    })();
    return () => remove?.();
  }, []);

  const confirmExit = useCallback(() => {
    void (async () => {
      try {
        const { App } = await import("@capacitor/app");
        await App.exitApp();
      } catch {
        setExitOpen(false);
      }
    })();
  }, []);

  return (
    <NativeUxContext.Provider value={{ registerBackHandler }}>
      {children}
      {exitOpen && (
        <div
          className="fixed inset-0 z-overlay flex items-center justify-center bg-black/60 px-6"
          role="dialog"
          aria-modal="true"
          aria-label="Exit ChatPulse"
          onClick={() => setExitOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-lg border border-border bg-surface-overlay p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-medium text-text">Exit ChatPulse?</p>
            <p className="mt-1 text-sm text-text-secondary">
              You&apos;ll stop receiving in-app notifications until you reopen it.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExitOpen(false)}
                className="inline-flex h-9 items-center rounded px-3 text-sm font-medium text-text-secondary transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:shadow-focus"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmExit}
                className="inline-flex h-9 items-center rounded bg-danger px-3 text-sm font-medium text-white transition-colors duration-fast hover:opacity-90 focus:outline-none focus-visible:shadow-focus"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </NativeUxContext.Provider>
  );
}

/**
 * Register a close handler for the Android hardware back button while `active`
 * is true (e.g. a modal is open). While registered, pressing back invokes
 * `onBack` instead of navigating. Multiple open modals stack; back closes the
 * most recently opened first. No-op off the native platform.
 */
export function useBackHandler(active: boolean, onBack: BackHandler): void {
  const ctx = useContext(NativeUxContext);
  const ref = useRef(onBack);
  ref.current = onBack;

  useEffect(() => {
    if (!active || !ctx) return;
    return ctx.registerBackHandler(ref);
  }, [active, ctx]);
}
