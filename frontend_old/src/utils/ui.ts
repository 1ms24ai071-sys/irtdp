// UI Utilities - Toast notifications, modals, etc.

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

const toasts: Toast[] = [];
const listeners = new Set<(t: Toast[]) => void>();

export const toastManager = {
  subscribe: (callback: (toasts: Toast[]) => void) => {
    listeners.add(callback);
    return () => { listeners.delete(callback); };
  },

  notify: (message: string, type: "success" | "error" | "info" | "warning" = "info", duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, message, type, duration };
    toasts.push(toast);
    listeners.forEach(cb => cb([...toasts]));

    if (duration > 0) {
      setTimeout(() => {
        toasts.splice(toasts.findIndex(t => t.id === id), 1);
        listeners.forEach(cb => cb([...toasts]));
      }, duration);
    }
  },

  success: (message: string) => toastManager.notify(message, "success"),
  error: (message: string) => toastManager.notify(message, "error", 5000),
  warning: (message: string) => toastManager.notify(message, "warning"),
  info: (message: string) => toastManager.notify(message, "info"),
};

// Loading and modal utilities
export const showLoading = (message = "Loading...") => {
  return { message };
};

export const playSound = (type: "alert" | "success" | "error") => {
  // Create an audio context and play a simple beep
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case "alert":
        oscillator.frequency.value = 1000;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        break;
      case "success":
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case "error":
        oscillator.frequency.value = 300;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        break;
    }
  } catch (e) {
    console.error("Could not play sound:", e);
  }
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const distanceToUser = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
