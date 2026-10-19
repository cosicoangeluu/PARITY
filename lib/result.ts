import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { SplitError } from "@/core/split";
import { AccessError } from "@/server/access";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string };

export const initialResult: ActionResult = { ok: true };

/**
 * Runs a server action body and turns expected problems into a friendly message.
 * Next.js redirects and notFound() pass through untouched.
 */
// biome-ignore lint/suspicious/noConfusingVoidType: action bodies may simply return nothing
export async function run<T = undefined>(
  body: () => Promise<ActionResult<T> | undefined | void>,
): Promise<ActionResult<T>> {
  try {
    return (await body()) ?? { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AccessError || error instanceof SplitError)
      return { ok: false, error: error.message };
    if (error instanceof ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? "Please check the form." };
    }
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
