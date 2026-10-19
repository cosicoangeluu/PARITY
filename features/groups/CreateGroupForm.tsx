"use client";

import Script from "next/script";
import { useActionState, useState } from "react";
import { PrimaryButton } from "@/ui/Actions";
import { FormStatus } from "@/ui/FormStatus";
import { Icon } from "@/ui/Icon";
import { createGroup } from "./actions";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function CreateGroupForm() {
  const [result, action, pending] = useActionState(createGroup, null);
  const [others, setOthers] = useState<string[]>(["", ""]);

  return (
    <form action={action} className="card m-card-in flex flex-col gap-5">
      <label className="field">
        Group name
        <input
          name="name"
          required
          maxLength={80}
          placeholder="Baguio barkada trip"
          className="input"
        />
      </label>
      <label className="field">
        Your name
        <input
          name="myName"
          required
          maxLength={40}
          placeholder="Ana"
          className="input"
          autoComplete="given-name"
        />
      </label>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold">Who else is in it?</legend>
        {others.map((value, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              name="others"
              value={value}
              maxLength={40}
              placeholder={["Ben", "Carlo", "Dani", "Ella"][i % 4]}
              aria-label={`Person ${i + 2}`}
              className="input"
              onChange={(e) =>
                setOthers((list) => list.map((v, j) => (j === i ? e.target.value : v)))
              }
            />
            {others.length > 1 && (
              <button
                type="button"
                aria-label={`Remove person ${i + 2}`}
                className="flex size-11 flex-none items-center justify-center rounded-full text-muted-light hover:bg-black/5"
                onClick={() => setOthers((list) => list.filter((_, j) => j !== i))}
              >
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn-outline-light self-start"
          onClick={() => setOthers((l) => [...l, ""])}
        >
          <Icon name="plus" size={16} /> Add a person
        </button>
        <p className="m-0 text-[13px] font-normal text-muted-light">
          You can add or remove people later. Others can also join with the link.
        </p>
      </fieldset>

      <label className="field">
        Currency
        <select name="currency" defaultValue="PHP" className="input">
          <option value="PHP">PHP · Philippine peso</option>
          <option value="USD">USD · US dollar</option>
          <option value="JPY">JPY · Japanese yen</option>
          <option value="KRW">KRW · Korean won</option>
          <option value="SGD">SGD · Singapore dollar</option>
        </select>
      </label>

      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="light" />
        </>
      )}

      <FormStatus result={result} />
      <div className="rounded-full bg-ink p-1.5 self-start">
        <PrimaryButton pending={pending}>Create Group</PrimaryButton>
      </div>
    </form>
  );
}
