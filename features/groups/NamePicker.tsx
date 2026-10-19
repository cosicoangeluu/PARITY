"use client";

import { useActionState, useState, useTransition } from "react";
import { FormStatus } from "@/ui/FormStatus";
import { Avatar } from "@/ui/People";
import { pickName, requestToJoin } from "./actions";

interface PickerPerson {
  id: string;
  name: string;
  taken: boolean;
}

/**
 * "Who are you?" The first device to pick a name is tied to it (name lock).
 * Shown instead of a screen until this device has a name.
 */
export function NamePicker({
  token,
  groupName,
  people,
  pendingName,
}: {
  token: string;
  groupName: string;
  people: PickerPerson[];
  pendingName?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const [joinResult, joinAction, joining] = useActionState(requestToJoin.bind(null, token), null);
  const [showJoin, setShowJoin] = useState(false);

  if (pendingName) {
    return (
      <div className="glass m-card-in flex flex-col gap-2">
        <h2 className="display m-0 text-[22px] font-bold">Waiting for approval</h2>
        <p className="m-0 text-muted-dark">
          You asked to join {groupName} as <strong className="text-paper">{pendingName}</strong>.
          The organizer will approve your name soon.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="m-fade-up">
        <p className="m-0 text-[13px] font-semibold text-subtle-dark">{groupName}</p>
        <h1 className="display m-0 text-[32px] font-semibold text-paper">Who are you?</h1>
        <p className="m-0 mt-1 text-muted-dark">
          Pick your name once. It stays tied to this phone.
        </p>
      </div>
      <ul className="card m-card-in m-0 flex list-none flex-col gap-1 p-2">
        {people.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={p.taken || isPending}
              onClick={() =>
                start(async () => {
                  const result = await pickName(token, p.id);
                  if (!result.ok) setError(result.error);
                })
              }
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left hover:bg-black/5"
            >
              <Avatar id={p.id} name={p.name} size={32} />
              <span className="flex-1 text-base font-semibold">{p.name}</span>
              {p.taken && (
                <span className="text-[13px] text-muted-light">Used on another device</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="form-error-dark m-0">
          {error}
        </p>
      )}
      {showJoin ? (
        <form action={joinAction} className="card flex flex-col gap-3">
          <label className="field">
            Your name
            <input name="name" required maxLength={40} className="input" />
          </label>
          <FormStatus result={joinResult} />
          <button type="submit" className="btn-ink self-start" disabled={joining}>
            {joining ? "Sending…" : "Add me"}
          </button>
        </form>
      ) : (
        <button type="button" className="btn-outline self-start" onClick={() => setShowJoin(true)}>
          I'm not listed
        </button>
      )}
    </div>
  );
}
