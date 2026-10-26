import { Suspense } from "react";
import { NewEntry } from "@/features/expenses/NewEntry";
import { GroupGate } from "@/features/groups/GroupGate";
import { ScreenSkeleton, ScreenTitle } from "@/ui/Screen";

export default function NewExpensePage({ params }: PageProps<"/g/[token]/expenses/new">) {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <GroupGate params={params}>
        {(ctx) => (
          <div className="flex flex-col gap-2">
            <ScreenTitle eyebrow={ctx.group.name} title="List your items" />
            {ctx.group.locked ? (
              <div className="glass text-muted-dark">This Group is locked by the organizer.</div>
            ) : !ctx.isOrganizer ? (
              <div className="glass text-muted-dark">
                The creator adds items. Open the group's bill to select yours.
              </div>
            ) : (
              <NewEntry token={ctx.group.token} currency={ctx.group.currency} />
            )}
          </div>
        )}
      </GroupGate>
    </Suspense>
  );
}
