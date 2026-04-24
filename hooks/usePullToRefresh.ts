"use client";

import { useEffect, useRef, useCallback } from "react";

const RESISTANCE = 0.4;
const COMMIT_THRESHOLD = 64;

interface Options {
  onRefresh: () => void;
  isRefreshing: boolean;
  enabled: boolean;
}

interface Result {
  indicatorRef: (el: HTMLDivElement | null) => void;
  iconWrapperRef: (el: HTMLDivElement | null) => void;
}

export function usePullToRefresh({ onRefresh, isRefreshing, enabled }: Options): Result {
  const indicatorElRef = useRef<HTMLDivElement | null>(null);
  const iconWrapperElRef = useRef<HTMLDivElement | null>(null);

  const startYRef = useRef(0);
  const trackingRef = useRef(false);
  const committedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pullDistRef = useRef(0);

  const indicatorRef = useCallback((el: HTMLDivElement | null) => {
    indicatorElRef.current = el;
  }, []);

  const iconWrapperRef = useCallback((el: HTMLDivElement | null) => {
    iconWrapperElRef.current = el;
  }, []);

  useEffect(() => {
    function applyPull(dist: number) {
      const indicator = indicatorElRef.current;
      const iconWrapper = iconWrapperElRef.current;
      if (!indicator || !iconWrapper) return;
      indicator.style.transition = "none";
      indicator.style.height = dist + "px";
      iconWrapper.style.transform = `rotate(${dist * 4}deg)`;
      iconWrapper.style.opacity = String(Math.min(dist / 48, 1));
    }

    function resetPull(animate: boolean) {
      const indicator = indicatorElRef.current;
      const iconWrapper = iconWrapperElRef.current;
      if (!indicator || !iconWrapper) return;
      indicator.style.transition = animate ? "height 0.3s ease" : "none";
      indicator.style.height = "0px";
      iconWrapper.style.transform = "";
      iconWrapper.style.opacity = "0";
    }

    function onTouchStart(e: TouchEvent) {
      if (!enabled || isRefreshing) return;
      const scrollY = window.scrollY ?? document.documentElement.scrollTop;
      if (scrollY > 1) return;
      const touch = e.touches[0];
      if (!touch) return;
      startYRef.current = touch.clientY;
      trackingRef.current = true;
      committedRef.current = false;
      pullDistRef.current = 0;
    }

    function onTouchMove(e: TouchEvent) {
      if (!trackingRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;

      const scrollY = window.scrollY ?? document.documentElement.scrollTop;
      if (scrollY > 1) {
        trackingRef.current = false;
        pullDistRef.current = 0;
        resetPull(true);
        return;
      }

      const deltaY = touch.clientY - startYRef.current;
      if (deltaY <= 0) {
        pullDistRef.current = 0;
        resetPull(false);
        return;
      }

      e.preventDefault();
      const dist = Math.min(deltaY * RESISTANCE, COMMIT_THRESHOLD * 2);
      pullDistRef.current = dist;

      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        applyPull(pullDistRef.current);
        rafRef.current = null;
      });
    }

    function onTouchEnd() {
      if (!trackingRef.current) return;
      trackingRef.current = false;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (pullDistRef.current >= COMMIT_THRESHOLD && !committedRef.current) {
        committedRef.current = true;
        onRefresh();
      }

      pullDistRef.current = 0;
      resetPull(true);
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
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, isRefreshing, onRefresh]);

  return { indicatorRef, iconWrapperRef };
}
