"use client";

/**
 * Accountless "My groups": the Groups this device has opened, kept in localStorage.
 * Users can export this list as a small backup file and import it on a new phone.
 */
export interface SavedGroup {
  token: string;
  name: string;
  lastOpened: string;
  kind?: "group" | "bill";
}

const KEY = "parity_groups";

export function loadSavedGroups(): SavedGroup[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedGroup[]) : [];
    return Array.isArray(list) ? list.filter((g) => typeof g.token === "string") : [];
  } catch {
    return [];
  }
}

function save(list: SavedGroup[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    // Private mode or storage full: the list is a convenience only.
  }
}

export function rememberGroup(entry: Omit<SavedGroup, "lastOpened">) {
  const list = loadSavedGroups().filter((g) => g.token !== entry.token);
  list.unshift({ ...entry, lastOpened: new Date().toISOString() });
  save(list);
}

export function forgetGroup(token: string) {
  save(loadSavedGroups().filter((g) => g.token !== token));
}

export function exportBackup(): Blob {
  return new Blob(
    [JSON.stringify({ app: "parity", version: 1, groups: loadSavedGroups() }, null, 2)],
    {
      type: "application/json",
    },
  );
}

export async function importBackup(file: File): Promise<number> {
  const data = JSON.parse(await file.text()) as { app?: string; groups?: SavedGroup[] };
  if (data.app !== "parity" || !Array.isArray(data.groups))
    throw new Error("This isn't a Parity backup file.");
  const merged = new Map(loadSavedGroups().map((g) => [g.token, g]));
  for (const g of data.groups)
    if (g && typeof g.token === "string" && /^[\w-]{16,64}$/.test(g.token)) merged.set(g.token, g);
  save([...merged.values()].sort((a, b) => b.lastOpened.localeCompare(a.lastOpened)));
  return data.groups.length;
}
