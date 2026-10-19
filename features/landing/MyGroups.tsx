"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { exportBackup, importBackup, loadSavedGroups, type SavedGroup } from "@/lib/device-groups";
import { Icon } from "@/ui/Icon";

/** Groups this device has opened. No account: the list lives on the phone. */
export function MyGroups() {
  const [groups, setGroups] = useState<SavedGroup[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setGroups(loadSavedGroups()), []);

  function download() {
    const url = URL.createObjectURL(exportBackup());
    const a = document.createElement("a");
    a.href = url;
    a.download = "parity-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    try {
      const count = await importBackup(file);
      setGroups(loadSavedGroups());
      setMessage(`Restored ${count} link${count === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn't read that file.");
    }
  }

  return (
    <section
      id="how"
      aria-labelledby="my-groups"
      className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-16"
    >
      <div className="glass flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="my-groups" className="display m-0 text-[22px] font-bold">
            Your groups on this device
          </h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline min-h-11 text-sm" onClick={download}>
              <Icon name="download" size={16} /> Back up my links
            </button>
            <button
              type="button"
              className="btn-outline min-h-11 text-sm"
              onClick={() => fileInput.current?.click()}
            >
              Restore
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              className="hidden"
              aria-label="Restore a Parity backup file"
              onChange={(e) => restore(e.target.files?.[0])}
            />
          </div>
        </div>
        {message && (
          <p className="m-0 text-sm text-muted-dark" role="status">
            {message}
          </p>
        )}
        {groups === null ? null : groups.length === 0 ? (
          <p className="m-0 text-[15px] text-muted-dark">
            Groups you open on this phone show up here. No account needed.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.token}>
                <Link
                  href={g.kind === "bill" ? `/b/${g.token}` : `/g/${g.token}`}
                  className="m-lift flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3 text-paper no-underline hover:bg-white/10"
                >
                  <span className="font-semibold">{g.name}</span>
                  <span className="text-[13px] text-subtle-dark">
                    {new Date(g.lastOpened).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
