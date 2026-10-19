import { PrimaryLink } from "@/ui/Actions";
import { AppStage } from "@/ui/AppStage";
import { Mark } from "@/ui/brand/Mark";

export default function NotFound() {
  return (
    <AppStage>
      <main className="mx-auto flex min-h-dvh max-w-[520px] flex-col items-start justify-center gap-5 px-6">
        <Mark size={64} tone="light" />
        <h1 className="display m-0 text-[36px] font-semibold text-paper">This link doesn't work</h1>
        <p className="m-0 text-muted-dark">
          It may have been typed wrong, or the organizer replaced it with a new one. Ask them for
          the current link.
        </p>
        <PrimaryLink href="/">Go to Parity</PrimaryLink>
      </main>
    </AppStage>
  );
}
