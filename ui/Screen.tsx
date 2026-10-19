import type { ReactNode } from "react";

/** Screen title block: display font, entering with fadeUp (DESIGN.md sections 3 and 5). */
export function ScreenTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="m-fade-up mb-5 flex flex-col gap-2">
      {eyebrow && <span className="text-[13px] font-semibold text-subtle-dark">{eyebrow}</span>}
      <h1
        className="m-0 text-paper"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "clamp(28px, 6vw, 36px)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h1>
      {children && <div className="text-base text-muted-dark">{children}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-7 mb-3 flex items-center justify-between gap-3">
      <h2 className="display m-0 text-[22px] font-bold text-paper">{children}</h2>
      {action}
    </div>
  );
}

/**
 * Holds the screen's one main action. On phones it is pinned above the bottom tab bar,
 * within thumb reach; on wide screens it sits in the flow.
 */
export function ActionDock({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-[76px] z-30 flex justify-center px-4 md:static md:mt-6 md:justify-start md:px-0">
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-full md:justify-start">
        {children}
      </div>
    </div>
  );
}

/** Skeleton shown while a screen's data streams in. */
export function ScreenSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="flex flex-col gap-4 pt-2">
      <div className="h-9 w-2/3 animate-pulse rounded-xl bg-white/10" />
      <div className="h-28 animate-pulse rounded-[22px] bg-white/10" />
      <div className="h-40 animate-pulse rounded-[22px] bg-white/10" />
    </div>
  );
}

/** Mint and Coral double underline that draws itself, for finished states (Fully paid). */
export function Celebrate({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="display text-[28px] font-bold text-paper">{children}</div>
      <div className="flex w-full max-w-64 flex-col gap-1.5" aria-hidden="true">
        <span className="m-draw block h-1.5 rounded-full bg-mint" />
        <span
          className="m-draw block h-1.5 rounded-full bg-coral"
          style={{ animationDelay: "0.12s" }}
        />
      </div>
    </div>
  );
}
