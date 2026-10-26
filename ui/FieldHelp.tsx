"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

/** A field label with a dismissible speech bubble, using the existing white-card style. */
export function FieldHelp({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const helpId = `${htmlFor}-help`;

  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    document.addEventListener("keydown", dismissEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
      document.removeEventListener("keydown", dismissEscape);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor}>{label}</label>
        <button
          ref={trigger}
          type="button"
          aria-label={`Help with ${label.toLowerCase()}`}
          aria-expanded={open}
          aria-controls={helpId}
          onClick={() => setOpen((value) => !value)}
          className="flex size-11 flex-none items-center justify-center rounded-full text-mint-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint-dark"
        >
          <span
            aria-hidden="true"
            className="flex size-6 items-center justify-center rounded-full border-2 border-current text-sm font-semibold"
          >
            !
          </span>
        </button>
      </div>
      {open && (
        <div
          id={helpId}
          role="note"
          aria-label={`${label} help`}
          className="card m-fade-up absolute inset-x-0 top-full z-40 mt-2 border border-line"
        >
          <span
            aria-hidden="true"
            className="absolute -top-2 right-[14px] size-4 rotate-45 border-t border-l border-line bg-white"
          />
          <div className="flex items-center justify-between gap-2">
            <strong className="display text-lg text-ink">What goes here?</strong>
            <button
              type="button"
              aria-label={`Close ${label.toLowerCase()} help`}
              className="flex size-11 flex-none items-center justify-center rounded-full text-muted-light"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          <p className="m-0 text-sm font-normal leading-relaxed text-muted-light">{children}</p>
        </div>
      )}
    </div>
  );
}
