import { Suspense } from "react";
import { GroupTabs } from "@/features/groups/GroupTabs";
import { LiveRefresh } from "@/lib/LiveRefresh";
import { RememberGroup } from "@/lib/RememberGroup";
import { loadGroupContext } from "@/server/access";
import { AppStage } from "@/ui/AppStage";
import { Lockup } from "@/ui/brand/Wordmark";
import { Icon } from "@/ui/Icon";

export default function GroupLayout({ children, params }: LayoutProps<"/g/[token]">) {
  return (
    <AppStage>
      <header className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        <Lockup tone="light" />
        <Suspense fallback={null}>
          <GroupName params={params} />
        </Suspense>
      </header>
      <Suspense fallback={null}>
        <Tabs params={params} />
      </Suspense>
      <main className="mx-auto w-full max-w-[720px] px-4 pt-4 pb-44 sm:px-6 md:pb-20">
        {children}
      </main>
    </AppStage>
  );
}

async function GroupName({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await loadGroupContext(token);
  if (!ctx) return null;
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-dark">
      <LiveRefresh topic={`g:${token}`} />
      <RememberGroup token={token} name={ctx.group.name} kind="group" />
      {ctx.group.locked && (
        <span title="Locked by the organizer">
          <Icon name="lock" size={16} />
        </span>
      )}
      <span className="truncate font-semibold text-paper">{ctx.group.name}</span>
    </div>
  );
}

async function Tabs({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <GroupTabs token={token} />;
}
