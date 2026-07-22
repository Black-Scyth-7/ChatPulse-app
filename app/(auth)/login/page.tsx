"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * Where users land after a successful sign-in. Kept in one place so the button
 * handlers stay in sync.
 */
const POST_LOGIN_REDIRECT = "/channel/general";

/** GitHub mark. `currentColor` so it inherits the button's text colour. */
function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
      />
    </svg>
  );
}

/** Google "G" mark. Uses its brand colours, so it does not inherit currentColor. */
function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={20} height={20}>
      <path
        fill="#4285F4"
        d="M23.52 12.273c0-.851-.076-1.67-.218-2.455H12v4.642h6.458a5.52 5.52 0 0 1-2.394 3.622v3.01h3.878c2.27-2.09 3.578-5.17 3.578-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.956-1.075 7.942-2.908l-3.878-3.01c-1.075.72-2.45 1.145-4.064 1.145-3.125 0-5.77-2.11-6.714-4.946H1.276v3.11A11.997 11.997 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.286 14.28A7.216 7.216 0 0 1 4.91 12c0-.79.136-1.558.376-2.28V6.61H1.276A11.997 11.997 0 0 0 0 12c0 1.937.464 3.77 1.276 5.39l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.773c1.762 0 3.344.606 4.59 1.795l3.44-3.44C17.952 1.19 15.235 0 12 0A11.997 11.997 0 0 0 1.276 6.61l4.01 3.11C6.23 6.883 8.875 4.774 12 4.774Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  // "signin" = existing account; "signup" = create one. The email/password form
  // is shared between the two modes, with the extra name field shown for signup.
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Sign-up first provisions the account, then falls through to the same
      // credentials sign-in below so the user lands logged in.
      if (isSignup) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(
            data?.error ?? "Could not create your account. Please try again.",
          );
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(
          isSignup
            ? "Account created, but sign-in failed. Try signing in."
            : "Invalid email or password.",
        );
        return;
      }

      router.push(POST_LOGIN_REDIRECT);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-md">
        {/* Wordmark */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-accent-fg">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width={18}
              height={18}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight text-text">
            ChatPulse
          </span>
        </div>

        <h1 className="mb-6 text-center text-lg font-semibold text-text">
          {isSignup ? "Create your account" : "Sign in to ChatPulse"}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {isSignup && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-text">Name</span>
              <input
                type="text"
                name="name"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus-visible:shadow-focus"
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-text">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus-visible:shadow-focus"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-text">Password</span>
            <input
              type="password"
              name="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus-visible:shadow-focus"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex w-full items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors duration-fast hover:opacity-90 focus:outline-none focus-visible:shadow-focus disabled:opacity-60"
          >
            {submitting
              ? isSignup
                ? "Creating account…"
                : "Signing in…"
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          {isSignup ? "Already have an account?" : "New to ChatPulse?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? "signin" : "signup");
              setError(null);
            }}
            className="font-medium text-accent hover:underline focus:outline-none focus-visible:shadow-focus"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-text-muted">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() =>
              signIn("github", { callbackUrl: POST_LOGIN_REDIRECT })
            }
            className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-surface-raised px-4 py-2.5 text-sm font-medium text-text transition-colors duration-fast hover:bg-surface-overlay focus:outline-none focus-visible:shadow-focus"
          >
            <GitHubIcon />
            Continue with GitHub
          </button>
          <button
            type="button"
            onClick={() =>
              signIn("google", { callbackUrl: POST_LOGIN_REDIRECT })
            }
            className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-surface-raised px-4 py-2.5 text-sm font-medium text-text transition-colors duration-fast hover:bg-surface-overlay focus:outline-none focus-visible:shadow-focus"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          By continuing you agree to the ChatPulse terms of service.
        </p>
      </div>
    </main>
  );
}
