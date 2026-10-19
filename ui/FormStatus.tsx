/** Shows a server action's message or error next to a form. */
export function FormStatus({
  result,
  dark = false,
}: {
  result: { ok: boolean; error?: string; message?: string } | null | undefined;
  dark?: boolean;
}) {
  if (!result) return null;
  if (!result.ok && result.error) {
    return (
      <p role="alert" className={`m-0 ${dark ? "form-error-dark" : "form-error"}`}>
        {result.error}
      </p>
    );
  }
  if (result.ok && result.message) {
    return (
      <p
        role="status"
        className={`m-0 text-sm font-medium ${dark ? "text-mint" : "text-mint-dark"}`}
      >
        {result.message}
      </p>
    );
  }
  return null;
}
