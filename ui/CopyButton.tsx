"use client";

import { useState } from "react";
import { Icon } from "./Icon";

export function CopyButton({
  text,
  label = "Copy",
  className = "btn-outline-light",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          window.prompt("Copy this:", text);
        }
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={16} />
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

/** Uses the phone's share sheet (Messenger, Viber, SMS) when available, otherwise copies. */
export function ShareButton({
  url,
  text,
  label = "Share link",
}: {
  url: string;
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-outline-light"
      onClick={async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title: "Parity", text, url });
            return;
          } catch {
            // Cancelled: fall through to copy.
          }
        }
        await navigator.clipboard.writeText(`${text} ${url}`).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      <Icon name={copied ? "check" : "share"} size={16} />
      {copied ? "Link copied" : label}
    </button>
  );
}
