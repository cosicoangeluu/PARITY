"use client";

import { useState, useTransition } from "react";
import { PrimaryButton } from "@/ui/Actions";
import { claimOrganizer } from "../groups/actions";

export function ClaimOrganizerButton({
  token,
  organizerKey,
}: {
  token: string;
  organizerKey: string;
}) {
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <PrimaryButton
        type="button"
        pending={isPending}
        onClick={() =>
          start(async () => {
            const r = await claimOrganizer(token, organizerKey);
            if (r && !r.ok) setError(r.error);
          })
        }
      >
        Make me the organizer here
      </PrimaryButton>
      {error && <p className="form-error-dark m-0">{error}</p>}
    </div>
  );
}
