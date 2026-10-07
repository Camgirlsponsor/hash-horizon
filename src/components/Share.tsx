import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CopyButton } from "./common";

export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0d1117", light: "#ffffff" },
    }).then((s) => {
      if (!cancelled) setSvg(s);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);
  return (
    <div
      className="qr"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`QR code for ${value}`}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}

export interface ShareLink {
  label: string;
  url: string;
}

export function ShareButton({
  title,
  qrValue,
  qrCaption,
  links,
}: {
  title: string;
  qrValue: string;
  qrCaption: string;
  links: ShareLink[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const canNativeShare = typeof navigator.share === "function";

  const show = () => {
    setOpen(true);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();

  return (
    <>
      <button type="button" className="secondary" onClick={show}>
        Share / QR
      </button>
      <dialog
        ref={dialog}
        className="share-dialog"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <div className="share-body">
          <div className="card-head">
            <h2>{title}</h2>
            <button type="button" className="secondary" onClick={close} aria-label="Close">
              ✕
            </button>
          </div>
          {open && <QrCode value={qrValue} size={220} />}
          <div className="muted small qr-caption">{qrCaption}</div>
          <ul className="share-links">
            {links.map((link) => (
              <li key={link.label}>
                <div className="share-link-label">{link.label}</div>
                <div className="hash-row">
                  <span className="mono break small">{link.url}</span>
                  <CopyButton text={link.url} />
                </div>
              </li>
            ))}
          </ul>
          {canNativeShare && (
            <button
              type="button"
              onClick={() => navigator.share({ title, url: links[0]?.url }).catch(() => {})}
            >
              Share…
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}
