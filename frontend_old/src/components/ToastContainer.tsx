import React, { useState, useEffect } from "react";
import { toastManager, Toast } from "../utils/ui";

const S = {
  container: {
    position: "fixed" as const,
    bottom: 20,
    right: 20,
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    padding: "12px 16px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#fff",
    animation: "slideIn 0.3s ease-out",
    minWidth: 280,
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  },
  success: { background: "#22c55e" },
  error: { background: "#ef4444" },
  warning: { background: "#f59e0b" },
  info: { background: "#4f8ef7" },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return toastManager.subscribe(setToasts);
  }, []);

  return (
    <div className="app-toast-container" style={S.container}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="app-toast"
          style={{
            ...S.toast,
            ...(S as any)[toast.type],
          }}
        >
          <span>
            {toast.type === "success" && "✓"}
            {toast.type === "error" && "✕"}
            {toast.type === "warning" && "!"}
            {toast.type === "info" && "ℹ"}
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
