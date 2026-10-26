import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NamePicker } from "@/features/groups/NamePicker";
import { BillScreen } from "@/features/scan/BillScreen";
import { loadBill } from "@/features/scan/queries";
import { AppStage } from "@/ui/AppStage";
import { Lockup } from "@/ui/brand/Wordmark";
import { ScreenSkeleton } from "@/ui/Screen";

export const metadata = { title: "Claim your items", robots: { index: false } };

/** The claim link: everyone ticks what they had, sees who had what, then pays. */
export default function BillPage({ params, searchParams }: PageProps<"/b/[token]">) {
  return (
    <AppStage>
      <header className="mx-auto flex w-full max-w-[720px] items-center px-4 pt-4 sm:px-6">
        <Lockup tone="light" />
      </header>
      <main className="mx-auto w-full max-w-[720px] px-4 pt-4 pb-20 sm:px-6">
        <Suspense fallback={<ScreenSkeleton />}>
          <Bill params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </AppStage>
  );
}

async function Bill({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const view = await loadBill(token);
  if (!view) notFound();
  const { ctx } = view;
  if (ctx.me?.status !== "active") {
    return (
      <NamePicker
        token={ctx.group.token}
        groupName={view.bill.title}
        pendingName={ctx.me?.status === "pending" ? ctx.me.name : null}
        people={ctx.participants
          .filter((p) => p.status === "active")
          .map((p) => ({ id: p.id, name: p.name, taken: !!p.device_id }))}
      />
    );
  }
  const query = await searchParams;
  const share = query.share === "1";
  return (
    <BillScreen
      view={view}
      step={query.step === "items" ? "items" : query.step === "payment" ? "payment" : undefined}
      showShare={share || (view.isBillOrganizer && view.bill.status === "claiming")}
    />
  );
}
