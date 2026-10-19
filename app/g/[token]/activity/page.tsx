import { Suspense } from "react";
import { formatMoney } from "@/core/money";
import { describeActivity } from "@/features/activity/describe";
import { RestoreEntryButton } from "@/features/expenses/DeleteEntryButton";
import { GroupGate } from "@/features/groups/GroupGate";
import { loadActivity, loadTrash, nameLookup } from "@/features/groups/queries";
import { ScreenSkeleton, ScreenTitle, SectionTitle } from "@/ui/Screen";

export default function ActivityPage({ params }: PageProps<"/g/[token]/activity">) {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <GroupGate params={params}>
        {async (ctx) => {
          const [activity, trash] = await Promise.all([
            loadActivity(ctx.group.id, 200),
            loadTrash(ctx.group.id),
          ]);
          const nameOf = nameLookup(ctx);
          const currency = ctx.group.currency;
          return (
            <div className="flex flex-col gap-4">
              <ScreenTitle eyebrow="Activity log" title="Every change, with a name" />
              <ul className="glass m-0 flex list-none flex-col gap-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-muted-dark">{describeActivity(a, nameOf, currency)}</span>
                    <time dateTime={a.created_at} className="flex-none text-subtle-dark">
                      {new Date(a.created_at).toLocaleString("en-PH", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </li>
                ))}
              </ul>
              {trash.length > 0 && (
                <>
                  <SectionTitle>Trash (30 days)</SectionTitle>
                  <ul className="card m-0 flex list-none flex-col p-0">
                    {trash.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-3 border-b border-line px-4 py-2 last:border-0"
                      >
                        <span className="flex-1 text-[15px]">{e.title}</span>
                        <span className="money text-sm">{formatMoney(e.amount, currency)}</span>
                        <RestoreEntryButton token={ctx.group.token} entryId={e.id} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          );
        }}
      </GroupGate>
    </Suspense>
  );
}
