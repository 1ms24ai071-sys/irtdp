import React from "react";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  color?: string;
}

const S = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  spinner: {
    border: "3px solid rgba(79, 142, 247, 0.2)",
    borderTop: "3px solid #4f8ef7",
    animation: "spin 0.8s linear infinite",
  },
};

export function LoadingSpinner({ size = "medium", color = "#4f8ef7" }: LoadingSpinnerProps) {
  const sizeMap = {
    small: 20,
    medium: 32,
    large: 48,
  };

  const dimension = sizeMap[size];

  return (
    <div style={S.container}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          ...S.spinner,
          width: dimension,
          height: dimension,
          borderRadius: "50%",
          borderTopColor: color,
        }}
      />
    </div>
  );
}

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = "Loading..." }: PageLoadingProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: 16,
        background: "#0a0b0f",
      }}
    >
      <LoadingSpinner size="large" />
      <p style={{ color: "#7b8299", fontSize: 14 }}>{message}</p>
    </div>
  );
}
