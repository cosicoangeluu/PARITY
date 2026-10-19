import { Suspense } from "react";
import { EntryForm } from "@/features/expenses/EntryForm";
import { GroupGate } from "@/features/groups/GroupGate";
import { activeParticipants } from "@/server/access";
import { ScreenSkeleton, ScreenTitle } from "@/ui/Screen";

export default function NewExpensePage({ params }: PageProps<"/g/[token]/expenses/new">) {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <GroupGate params={params}>
        {(ctx) => (
          <div className="flex flex-col gap-2">
            <ScreenTitle eyebrow={ctx.group.name} title="Add an entry" />
            {ctx.group.locked ? (
              <div className="glass text-muted-dark">This Group is locked by the organizer.</div>
            ) : (
              <EntryForm
                token={ctx.group.token}
                meId={ctx.me?.id ?? ""}
                currency={ctx.group.currency}
                people={activeParticipants(ctx).map((p) => ({
                  id: p.id,
                  name: p.name,
                  defaultShare: Number(p.default_share),
                }))}
              />
            )}
          </div>
        )}
      </GroupGate>
    </Suspense>
  );
}
