"use client";

import { useEffect } from "react";
import { rememberGroup } from "./device-groups";

/** Adds the open Group or bill to "Your groups on this device". */
export function RememberGroup({
  token,
  name,
  kind,
}: {
  token: string;
  name: string;
  kind: "group" | "bill";
}) {
  useEffect(() => rememberGroup({ token, name, kind }), [token, name, kind]);
  return null;
}
