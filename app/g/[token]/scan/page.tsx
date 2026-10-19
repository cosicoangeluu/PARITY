import { Suspense } from "react";
import { GroupGate } from "@/features/groups/GroupGate";
import { ScanFlow } from "@/features/scan/ScanFlow";
import { activeParticipants } from "@/server/access";
import { ScreenSkeleton, ScreenTitle } from "@/ui/Screen";

export default function GroupScanPage({ params }: PageProps<"/g/[token]/scan">) {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <GroupGate params={params}>
        {(ctx) => (
          <div className="flex flex-col gap-2">
            <ScreenTitle eyebrow="Scan & Split" title="Scan a receipt">
              Everyone with the link ticks what they had.
            </ScreenTitle>
            {ctx.group.locked ? (
              <div className="glass text-muted-dark">This Group is locked by the organizer.</div>
            ) : (
              <ScanFlow
                groupToken={ctx.group.token}
                meId={ctx.me?.id}
                currency={ctx.group.currency}
                people={activeParticipants(ctx).map((p) => ({ id: p.id, name: p.name }))}
              />
            )}
          </div>
        )}
      </GroupGate>
    </Suspense>
  );
}
