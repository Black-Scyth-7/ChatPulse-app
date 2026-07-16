"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/**
 * Message body renderer. Renders a constrained subset of GitHub-flavored
 * markdown (bold, italic, code, links, lists, quotes) styled with the app's
 * design tokens. Links open in a new tab; images are intentionally not
 * enlarged here — message bodies are text-first.
 */
const components: Components = {
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline underline-offset-2 hover:text-accent-hover"
    >
      {children}
    </a>
  ),
  p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-1 list-disc pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1 list-decimal pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="my-0.5">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-1 border-l-2 border-border-strong pl-3 text-text-secondary">
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code
          className="block overflow-x-auto rounded bg-surface-inset p-2 font-mono text-sm"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-surface-inset px-1 py-0.5 font-mono text-[0.85em]"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="my-1">{children}</pre>,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="break-words text-base text-text [&_strong]:font-semibold [&_em]:italic">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
