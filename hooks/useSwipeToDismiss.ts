"use client";

import { useEffect, useRef } from "react";

const DISMISS_THRESHOLD = 150;
const DISMISS_VELOCITY = 0.5; // px/ms
const DEAD_ZONE = 10;

interface Options {
  onDismiss: (skipAnimation: boolean) => void;
  enabled: boolean;
  gestureLockRef: React.RefObject<"none" | "horizontal" | "vertical">;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

export function useSwipeToDismiss(
  cardRef: React.RefObject<HTMLElement | null>,
  options: Options
) {
  const { onDismiss, enabled, gestureLockRef, scrollContainerRef } = options;

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const startTimeRef = useRef(0);
  const trackingRef = useRef(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    function applyTransform(offsetY: number) {
      if (!card) return;
      const scale = Math.max(1 - offsetY * 0.0004, 0.88);
      card.style.transform = `translateY(${offsetY}px) scale(${scale})`;
      card.style.transition = "none";

      const backdrop = card.previousElementSibling as HTMLElement | null;
      if (backdrop) {
        const vh = window.innerHeight;
        backdrop.style.opacity = String(Math.max(1 - offsetY / vh, 0));
        backdrop.style.transition = "none";
      }
    }

    function resetTransform(animate: boolean) {
      if (!card) return;
      if (animate) {
        card.style.transition = "transform 0.3s cubic-bezier(0.34,1.1,0.64,1)";
      }
      card.style.transform = "";
      const backdrop = card.previousElementSibling as HTMLElement | null;
      if (backdrop) {
        if (animate) backdrop.style.transition = "opacity 0.3s ease";
        backdrop.style.opacity = "";
      }
    }

    function onTouchStart(e: TouchEvent) {
      if (!enabled || e.touches.length !== 1) return;
      const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
      if (scrollTop > 1) return;

      const touch = e.touches[0]!;
      startYRef.current = touch.clientY;
      startXRef.current = touch.clientX;
      startTimeRef.current = Date.now();
      trackingRef.current = true;
      isDraggingRef.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (!trackingRef.current) return;

      if (e.touches.length !== 1) {
        trackingRef.current = false;
        isDraggingRef.current = false;
        gestureLockRef.current = "none";
        resetTransform(true);
        return;
      }

      const touch = e.touches[0]!;
      const deltaY = touch.clientY - startYRef.current;
      const deltaX = touch.clientX - startXRef.current;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (gestureLockRef.current === "horizontal") {
        trackingRef.current = false;
        return;
      }

      if (!isDraggingRef.current) {
        // preventDefault early while gesture is vertical-leaning and at scrollTop=0
        // so iOS can't claim the gesture before we commit to it.
        const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
        if (scrollTop === 0 && deltaY > 0 && absY >= absX) {
          e.preventDefault();
        }

        if (absX < DEAD_ZONE && absY < DEAD_ZONE) return;

        if (absX > absY) {
          trackingRef.current = false;
          return;
        }

        if (deltaY <= 0) {
          trackingRef.current = false;
          return;
        }

        isDraggingRef.current = true;
        gestureLockRef.current = "vertical";
      }

      e.preventDefault();

      const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
      if (scrollTop > 1) {
        trackingRef.current = false;
        isDraggingRef.current = false;
        gestureLockRef.current = "none";
        resetTransform(true);
        return;
      }

      const offsetY = Math.max(deltaY, 0);
      applyTransform(offsetY);
    }

    function onTouchEnd(e: TouchEvent) {
      if (!trackingRef.current || !isDraggingRef.current) {
        trackingRef.current = false;
        gestureLockRef.current = "none";
        return;
      }

      trackingRef.current = false;
      isDraggingRef.current = false;
      gestureLockRef.current = "none";

      const touch = e.changedTouches[0]!;
      const deltaY = touch.clientY - startYRef.current;
      const elapsed = Date.now() - startTimeRef.current;
      const velocity = elapsed > 0 ? deltaY / elapsed : 0;

      if (deltaY > DISMISS_THRESHOLD || velocity > DISMISS_VELOCITY) {
        if (card) {
          card.style.transition = "transform 0.25s ease-in";
          card.style.transform = `translateY(${window.innerHeight}px)`;
          const backdrop = card.previousElementSibling as HTMLElement | null;
          if (backdrop) {
            backdrop.style.transition = "opacity 0.25s ease-in";
            backdrop.style.opacity = "0";
          }
        }
        setTimeout(() => onDismiss(true), 260);
      } else {
        resetTransform(true);
      }
    }

    function onTouchCancel() {
      if (!trackingRef.current) return;
      trackingRef.current = false;
      isDraggingRef.current = false;
      gestureLockRef.current = "none";
      resetTransform(true);
    }

    card.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchCancel);

    return () => {
      card.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [enabled, onDismiss, gestureLockRef, scrollContainerRef, cardRef]);
}
