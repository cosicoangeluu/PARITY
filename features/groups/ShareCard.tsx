import QRCode from "qrcode";
import { CopyButton, ShareButton } from "@/ui/CopyButton";

/** The Group link plus a QR code people at the same table can scan. */
export async function ShareCard({
  url,
  title,
  text,
}: {
  url: string;
  title: string;
  text: string;
}) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    color: { dark: "#10202E", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
  return (
    <div className="card m-card-in flex flex-wrap items-center gap-5">
      <div
        className="size-32 flex-none overflow-hidden rounded-2xl"
        role="img"
        aria-label={`QR code for ${title}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <div className="text-[15px] font-semibold">{title}</div>
          <div className="truncate text-[13px] text-muted-light">{url}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ShareButton url={url} text={text} />
          <CopyButton text={url} label="Copy link" />
        </div>
      </div>
    </div>
  );
}
