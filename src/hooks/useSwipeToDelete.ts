// src/hooks/useSwipeToDelete.ts
// Handles swipe-to-delete gesture with proper cleanup to prevent memory leaks

import { useRef, useState, useCallback } from "react";

interface UseSwipeToDeleteOptions {
  onDelete: (key: string) => void;
  threshold?: number;
  maxOffset?: number;
}

interface SwipeHandlers {
  ref: (key: string) => (el: HTMLElement | null) => void;
  onPointerDown: (e: React.PointerEvent, key: string) => void;
  getOffset: (key: string) => number;
  reset: (key: string) => void;
  resetAll: () => void;
}

export function useSwipeToDelete({
  onDelete,
  threshold = 48,
  maxOffset = 88,
}: UseSwipeToDeleteOptions): SwipeHandlers {
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const offsetsRef = useRef<Record<string, number>>({});
  offsetsRef.current = offsets;

  const cleanupMap = useRef<Map<string, () => void>>(new Map());
  const justSwiped = useRef<Set<string>>(new Set());

  const snap = useCallback((key: string, currentOffset: number) => {
    const snapped = currentOffset < -threshold ? -maxOffset : 0;
    setOffsets((prev) => ({ ...prev, [key]: snapped }));
    if (snapped !== 0) {
      justSwiped.current.add(key);
      setTimeout(() => justSwiped.current.delete(key), 350);
    }
  }, [threshold, maxOffset]);

  const ref = useCallback((key: string) => (el: HTMLElement | null) => {
    const existingCleanup = cleanupMap.current.get(key);
    if (existingCleanup) {
      existingCleanup();
      cleanupMap.current.delete(key);
    }

    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startOffset = 0;
    let axis: "x" | "y" | null = null;
    let moved = false;
    let active = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      active = true;
      axis = null;
      moved = false;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startOffset = offsetsRef.current[key] ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (axis === null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (axis === "y") { active = false; return; }
      }
      if (axis !== "x") return;

      e.preventDefault();
      moved = true;

      const next = Math.max(-maxOffset, Math.min(0, startOffset + dx));
      setOffsets((prev) => ({ ...prev, [key]: next }));
    };

    const onTouchEnd = () => {
      if (!active) return;
      active = false;
      const cur = offsetsRef.current[key] ?? 0;
      snap(key, cur);
      if (moved) {
        justSwiped.current.add(key);
        setTimeout(() => justSwiped.current.delete(key), 350);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true });
    el.addEventListener("touchcancel",onTouchEnd,   { passive: true });

    const cleanup = () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
      el.removeEventListener("touchcancel",onTouchEnd);
    };
    cleanupMap.current.set(key, cleanup);
  }, [maxOffset, snap]);

  const onPointerDown = useCallback((e: React.PointerEvent, key: string) => {
    if (e.pointerType === "touch") return;
    if (e.button !== 0) return;

    const startX = e.clientX;
    const startOffset = offsetsRef.current[key] ?? 0;
    let moved = false;

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      const next = Math.max(-maxOffset, Math.min(0, startOffset + dx));
      setOffsets((prev) => ({ ...prev, [key]: next }));
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup",   onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      setOffsets((prev) => {
        const cur = prev[key] ?? 0;
        const snapped = cur < -threshold ? -maxOffset : 0;
        if (moved && snapped !== 0) {
          justSwiped.current.add(key);
          setTimeout(() => justSwiped.current.delete(key), 350);
        }
        return { ...prev, [key]: snapped };
      });
    };

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch { /* noop */ }
    window.addEventListener("pointermove",  onPointerMove);
    window.addEventListener("pointerup",    onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }, [threshold, maxOffset]);

  const getOffset = useCallback(
    (key: string) => offsets[key] ?? 0,
    [offsets]
  );

  const reset = useCallback((key: string) => {
    setOffsets((prev) => {
      const next: Record<string, number> = {};
      Object.keys(prev).forEach((k) => {
        if (k !== key && !k.startsWith(`${key}|`)) next[k] = prev[k];
      });
      return next;
    });
    cleanupMap.current.forEach((cleanup, k) => {
      if (k === key || k.startsWith(`${key}|`)) {
        cleanup();
        cleanupMap.current.delete(k);
      }
    });
  }, []);

  const resetAll = useCallback(() => {
    setOffsets({});
    cleanupMap.current.forEach((cleanup) => cleanup());
    cleanupMap.current.clear();
  }, []);

  // onDelete is exposed via closure (kept in options for future use)
  void onDelete;

  return { ref, onPointerDown, getOffset, reset, resetAll };
}
