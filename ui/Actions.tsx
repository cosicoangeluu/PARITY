import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/** The one main action per screen: Paper pill + round Mint arrow (DESIGN.md section 7). */
function PrimaryInner({ children, icon = "arrow" }: { children: ReactNode; icon?: IconName }) {
  return (
    <>
      <span className="flex min-h-12 items-center rounded-full bg-paper px-5 text-[15px] font-semibold text-ink">
        {children}
      </span>
      <span className="flex size-12 items-center justify-center rounded-full bg-mint text-ink">
        <Icon name={icon} size={18} strokeWidth={2.4} />
      </span>
    </>
  );
}

export function PrimaryLink({
  href,
  children,
  icon,
}: {
  href: string;
  children: ReactNode;
  icon?: IconName;
}) {
  return (
    <Link href={href} className="m-lift inline-flex items-center gap-1.5 no-underline">
      <PrimaryInner icon={icon}>{children}</PrimaryInner>
    </Link>
  );
}

export function PrimaryButton({
  children,
  icon,
  pending,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: IconName; pending?: boolean }) {
  return (
    <button
      type="submit"
      {...props}
      disabled={props.disabled || pending}
      className={`m-lift inline-flex items-center gap-1.5 ${props.className ?? ""}`}
    >
      <PrimaryInner icon={icon}>{pending ? "Working…" : children}</PrimaryInner>
    </button>
  );
}
