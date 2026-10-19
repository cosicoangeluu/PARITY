import type { ReactNode } from "react";
import { Grain } from "./Grain";

/**
 * The Ink stage every app screen sits on: grain plus the Mint and Coral orbs, dimmed so
 * content keeps contrast. Same stage as the landing hero, without the intro.
 */
export function AppStage({ children }: { children: ReactNode }) {
  return (
    <div className="stage overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-60"
      >
        <div className="orb orb-mint" />
        <div className="orb orb-coral" />
        <Grain id="app-grain" />
      </div>
      {children}
    </div>
  );
}
