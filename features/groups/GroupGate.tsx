import type { ReactNode } from "react";
import { type GroupContext, requireGroupContext } from "@/server/access";
import { NamePicker } from "./NamePicker";

/**
 * Loads the Group behind a link and makes sure this device has picked a name.
 * Every Group screen renders through this.
 */
export async function GroupGate({
  params,
  children,
}: {
  params: Promise<{ token: string }>;
  children: (ctx: GroupContext) => ReactNode | Promise<ReactNode>;
}) {
  const { token } = await params;
  const ctx = await requireGroupContext(token);
  if (!ctx.me || ctx.me.status !== "active") {
    return (
      <NamePicker
        token={token}
        groupName={ctx.group.name}
        pendingName={ctx.me?.status === "pending" ? ctx.me.name : null}
        people={ctx.participants
          .filter((p) => p.status === "active")
          .map((p) => ({ id: p.id, name: p.name, taken: !!p.device_id }))}
      />
    );
  }
  return children(ctx);
}
