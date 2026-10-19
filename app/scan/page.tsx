import { ScanFlow } from "@/features/scan/ScanFlow";
import { AppStage } from "@/ui/AppStage";
import { Lockup } from "@/ui/brand/Wordmark";
import { ScreenTitle } from "@/ui/Screen";

export const metadata = { title: "Scan a receipt" };

/** One-off bill without a Group: the claim link stands on its own. */
export default function QuickScanPage() {
  return (
    <AppStage>
      <header className="mx-auto flex w-full max-w-[720px] items-center px-4 pt-4 sm:px-6">
        <Lockup tone="light" />
      </header>
      <main className="mx-auto w-full max-w-[720px] px-4 pt-6 pb-20 sm:px-6">
        <ScreenTitle eyebrow="Scan & Split" title="Scan a receipt">
          Share one link and everyone ticks what they had. No Group or sign-up needed.
        </ScreenTitle>
        <ScanFlow groupToken={null} />
      </main>
    </AppStage>
  );
}
