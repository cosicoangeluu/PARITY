import { Suspense } from "react";
import { ClaimOrganizerButton } from "@/features/people/ClaimOrganizerButton";
import { ScreenSkeleton, ScreenTitle } from "@/ui/Screen";

/** Backup organizer link: restores organizer access on a new phone after a tap. */
export default function AdminPage({ params, searchParams }: PageProps<"/g/[token]/admin">) {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <Restore params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Restore({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const key = (await searchParams).k;
  return (
    <div className="flex flex-col gap-4">
      <ScreenTitle eyebrow="Organizer" title="Restore organizer access">
        This gives this device organizer access to the Group.
      </ScreenTitle>
      {typeof key === "string" && key.length > 10 ? (
        <ClaimOrganizerButton token={token} organizerKey={key} />
      ) : (
        <div className="glass text-muted-dark">This organizer link is incomplete.</div>
      )}
    </div>
  );
}
