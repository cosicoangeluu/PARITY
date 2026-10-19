import { Suspense } from "react";
import { formatMoney } from "@/core/money";
import { GroupGate } from "@/features/groups/GroupGate";
import { loadLedger } from "@/features/groups/queries";
import {
  AddPersonForm,
  GroupControls,
  PayDetailsForm,
  PersonActions,
  ShareForm,
} from "@/features/people/PeopleForms";
import { readOrganizerKey } from "@/server/access";
import { siteUrl } from "@/server/url";
import { CopyButton } from "@/ui/CopyButton";
import { Avatar, StatusPill } from "@/ui/People";
import { ScreenSkeleton, ScreenTitle, SectionTitle } from "@/ui/Screen";

function mask(number: string | null): string | null {
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : number;
}

export default function PeoplePage({ params }: PageProps<"/g/[token]/people">) {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <GroupGate params={params}>
        {async (ctx) => {
          const ledger = await loadLedger(ctx);
          const currency = ctx.group.currency;
          const me = ctx.me;
          const organizerKey = ctx.isOrganizer ? await readOrganizerKey(ctx.group.id) : null;
          const base = await siteUrl();
          const backupLink = organizerKey
            ? `${base}/g/${ctx.group.token}/admin?k=${encodeURIComponent(organizerKey)}`
            : null;

          return (
            <div className="flex flex-col gap-4">
              <ScreenTitle
                eyebrow="People"
                title={`${ctx.participants.length} in ${ctx.group.name}`}
              >
                A green tick means the person has opened the Group on their phone.
              </ScreenTitle>

              <ul className="card m-0 flex list-none flex-col p-0">
                {ctx.participants.map((p) => {
                  const balance = ledger.balances[p.id] ?? 0;
                  return (
                    <li
                      key={p.id}
                      className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar id={p.id} name={p.name} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                            {p.name}
                            {p.id === me?.id && (
                              <span className="font-normal text-muted-light">(you)</span>
                            )}
                            {p.status === "pending" ? (
                              <StatusPill status="pending">Asked to join</StatusPill>
                            ) : p.first_seen_at ? (
                              <StatusPill status="done">Seen</StatusPill>
                            ) : (
                              <StatusPill status="not-opened" />
                            )}
                          </div>
                          <div className="text-[13px] text-muted-light">
                            {[p.gcash && `GCash ${mask(p.gcash)}`, p.maya && `Maya ${mask(p.maya)}`]
                              .filter(Boolean)
                              .join(" · ") || "No GCash/Maya yet"}
                            {Number(p.default_share) !== 1
                              ? ` · counts as ${Number(p.default_share)}`
                              : ""}
                          </div>
                        </div>
                        <span
                          className={`money text-sm font-semibold ${balance > 0 ? "text-mint-dark" : balance < 0 ? "text-coral-dark" : "text-muted-light"}`}
                        >
                          {balance > 0 ? "+" : ""}
                          {formatMoney(balance, currency)}
                        </span>
                      </div>
                      {ctx.isOrganizer && p.id !== me?.id && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pl-12">
                          <ShareForm
                            token={ctx.group.token}
                            participantId={p.id}
                            share={Number(p.default_share)}
                          />
                          <PersonActions
                            token={ctx.group.token}
                            participantId={p.id}
                            pending={p.status === "pending"}
                            locked={!!p.device_id}
                          />
                        </div>
                      )}
                      {ctx.isOrganizer && p.id === me?.id && (
                        <div className="pl-12">
                          <ShareForm
                            token={ctx.group.token}
                            participantId={p.id}
                            share={Number(p.default_share)}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <SectionTitle>Your GCash and Maya</SectionTitle>
              <PayDetailsForm
                token={ctx.group.token}
                gcash={me?.gcash ?? null}
                maya={me?.maya ?? null}
              />

              {ctx.isOrganizer && (
                <>
                  <SectionTitle>Organizer</SectionTitle>
                  <div className="card flex flex-col gap-5">
                    <AddPersonForm token={ctx.group.token} />
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-semibold">Default shares</span>
                      <p className="m-0 text-[13px] text-muted-light">
                        Set a number per person above, e.g. 2.5 for a family of two adults and a
                        child. New expenses use it automatically.
                      </p>
                    </div>
                    {backupLink && (
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold">Backup organizer link</span>
                        <p className="m-0 text-[13px] text-muted-light">
                          Keep this somewhere private. Opening it on a new phone gives you organizer
                          access again. Don't share it.
                        </p>
                        <CopyButton text={backupLink} label="Copy backup organizer link" />
                      </div>
                    )}
                    <GroupControls token={ctx.group.token} locked={ctx.group.locked} />
                  </div>
                </>
              )}
            </div>
          );
        }}
      </GroupGate>
    </Suspense>
  );
}
