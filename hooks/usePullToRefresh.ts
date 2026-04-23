"use client";

import { useEffect, useRef, useState } from "react";

const RESISTANCE = 0.4;
const COMMIT_THRESHOLD = 64;

interface Options {
  onRefresh: () => void;
  isRefreshing: boolean;
  enabled: boolean;
}

interface Result {
  pullDistance: number;
  isPulling: boolean;
}

export function usePullToRefresh({ onRefresh, isRefreshing, enabled }: Options): Result {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const startYRef = useRef(0);
  const trackingRef = useRef(false);
  const committedRef = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (!enabled || isRefreshing) return;
      const scrollY = window.scrollY ?? document.documentElement.scrollTop;
      if (scrollY > 1) return;
      const touch = e.touches[0];
      if (!touch) return;
      startYRef.current = touch.clientY;
      trackingRef.current = true;
      committedRef.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (!trackingRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;

      // Stop tracking if user scrolled down
      const scrollY = window.scrollY ?? document.documentElement.scrollTop;
      if (scrollY > 1) {
        trackingRef.current = false;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      const deltaY = touch.clientY - startYRef.current;
      if (deltaY <= 0) {
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      e.preventDefault();
      const dist = Math.min(deltaY * RESISTANCE, COMMIT_THRESHOLD * 2);
      setPullDistance(dist);
      setIsPulling(true);
    }

    function onTouchEnd() {
      if (!trackingRef.current) return;
      trackingRef.current = false;

      if (pullDistance >= COMMIT_THRESHOLD && !committedRef.current) {
        committedRef.current = true;
        onRefresh();
      }

      setPullDistance(0);
      setIsPulling(false);
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, isRefreshing, onRefresh, pullDistance]);

  return { pullDistance, isPulling };
}
