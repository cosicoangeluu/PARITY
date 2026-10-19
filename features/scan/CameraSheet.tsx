"use client";

import { useEffect, useRef, useState } from "react";
import { captureFrame } from "@/lib/image";
import { Icon } from "@/ui/Icon";

/**
 * Full-screen camera that opens with the window motion. For long receipts it shows the
 * bottom edge of the previous photo as a faint guide, so each new part overlaps a little.
 */
export function CameraSheet({
  previousUrl,
  partNumber,
  onCapture,
  onClose,
}: {
  previousUrl?: string;
  partNumber: number;
  onCapture: (photo: Blob) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | undefined;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }
      } catch {
        setError("Camera not available. Choose a photo instead.");
      }
    })();
    return () => {
      for (const track of stream?.getTracks() ?? []) track.stop();
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo of part ${partNumber}`}
      className="m-window fixed inset-0 z-50 flex flex-col bg-black"
    >
      <div className="relative flex-1 overflow-hidden">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        {previousUrl && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[18%] overflow-hidden opacity-40">
            {/* biome-ignore lint/performance/noImgElement: local blob preview */}
            <img
              src={previousUrl}
              alt=""
              className="absolute bottom-0 w-full"
              style={{ transform: "translateY(82%)" }}
            />
            <div className="absolute inset-x-0 bottom-0 border-b-2 border-dashed border-mint" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="chip-glass">
            Part {partNumber}
            {previousUrl ? " · line up with the faint edge" : ""}
          </span>
          <button
            type="button"
            aria-label="Close camera"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full bg-black/50 text-paper"
          >
            <Icon name="x" />
          </button>
        </div>
        {error && (
          <p className="form-error-dark absolute inset-x-4 top-20 m-0 rounded-2xl bg-black/60 p-3">
            {error}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 bg-ink px-6 pt-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          className="btn-outline min-h-11 text-sm"
          onClick={() => fileInput.current?.click()}
        >
          Gallery
        </button>
        <button
          type="button"
          aria-label="Take photo"
          disabled={!!error}
          onClick={async () => {
            if (video.current?.videoWidth) onCapture(await captureFrame(video.current));
          }}
          className="flex size-[72px] items-center justify-center rounded-full border-4 border-paper bg-mint"
        />
        <span className="w-[92px]" />
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Choose a photo"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onCapture(file);
          }}
        />
      </div>
    </div>
  );
}
