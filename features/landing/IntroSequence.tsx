"use client";

import { useLayoutEffect, useRef } from "react";
import { Mark } from "@/ui/brand/Mark";
import { Grain } from "@/ui/Grain";

/** 0–2.6 s: paper, the mark grows from a dot, P A R I T Y fades in, the bars level out. */
export function IntroSequence() {
  const initialized = useRef(false);

  useLayoutEffect(() => {
    // Strict Mode replays effects; it must not skip the first visit's animation.
    if (initialized.current) return;
    initialized.current = true;
    let skip = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      skip = skip || sessionStorage.getItem("parity_intro_seen") !== null;
      sessionStorage.setItem("parity_intro_seen", "1");
    } catch {
      // The intro still works when browser storage is unavailable.
    }
    document.documentElement.dataset.intro = skip ? "skip" : "play";
  }, []);

  return (
    <>
      <Grain id="paper-grain" opacity={0.35} blend="multiply" frequency={0.85} />
      <div className="intro" aria-hidden="true">
        <Mark size={80} className="intro-mark" barClassNames={["intro-bar-a", "intro-bar-b"]} />
        <div className="intro-word">
          {"PARITY".split("").map((letter, i) => (
            <span
              key={letter + i}
              className="intro-letter"
              style={{ animationDelay: `${0.35 + i * 0.1}s` }}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
