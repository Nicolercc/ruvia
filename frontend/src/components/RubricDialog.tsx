import React from "react";
import { X } from "lucide-react";
import type { RoleRubric } from "../types";

type RubricDialogProps = {
  open: boolean;
  rubric: RoleRubric;
  mode: string;
  warnings: string[];
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
};

function RubricList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rubric-list">
      <h3>{title}</h3>
      <ul>
        {items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>None listed</li>}
      </ul>
    </div>
  );
}

export function RubricDialog({ open, rubric, mode, warnings, onClose, triggerRef }: RubricDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
      else triggerRef.current?.focus();
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="rubric-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rubric-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rubric-dialog-header">
          <div>
            <span className="docket-label">Shared role rubric</span>
            <h2 id="rubric-dialog-title">Role rubric</h2>
            <p className="mode-line">
              {mode === "demo_fallback" ? "Demo fallback" : "Live AI"} run for {rubric.job_title}
            </p>
          </div>
          <button ref={closeRef} type="button" className="secondary dialog-close" onClick={onClose} aria-label="Close role rubric">
            <X size={18} aria-hidden="true" />
            Close
          </button>
        </div>
        <div className="rubric-dialog-body">
          <p className="rubric-version">{rubric.rubric_version}</p>
          <RubricList title="Required" items={rubric.required.map((item) => item.criterion)} />
          <RubricList title="Preferred" items={rubric.preferred.map((item) => item.criterion)} />
          <RubricList title="Unclear" items={rubric.unclear} />
          <RubricList title="Excluded" items={rubric.excluded_factors} />
          {warnings.map((warning) => (
            <p className="warning" key={warning}>
              {warning}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
