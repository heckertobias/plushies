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

      // Sync backdrop opacity
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

    function onPointerDown(e: PointerEvent) {
      if (!enabled || e.button !== 0) return;
      const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
      if (scrollTop > 1) return;

      startYRef.current = e.clientY;
      startXRef.current = e.clientX;
      startTimeRef.current = Date.now();
      trackingRef.current = true;
      isDraggingRef.current = false;
    }

    function onPointerMove(e: PointerEvent) {
      if (!trackingRef.current) return;

      const deltaY = e.clientY - startYRef.current;
      const deltaX = e.clientX - startXRef.current;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Respect gesture lock
      if (gestureLockRef.current === "horizontal") {
        trackingRef.current = false;
        return;
      }

      // Direction decision within dead zone
      if (!isDraggingRef.current) {
        if (absX < DEAD_ZONE && absY < DEAD_ZONE) return;

        if (absX > absY) {
          // Horizontal wins — let other hook take it
          trackingRef.current = false;
          return;
        }

        if (deltaY <= 0) {
          // Upward — not a dismiss gesture
          trackingRef.current = false;
          return;
        }

        // Vertical down wins
        isDraggingRef.current = true;
        gestureLockRef.current = "vertical";
      }

      e.preventDefault();

      // Check scroll position again — user might have scrolled
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

    function onPointerUp(e: PointerEvent) {
      if (!trackingRef.current || !isDraggingRef.current) {
        trackingRef.current = false;
        gestureLockRef.current = "none";
        return;
      }

      trackingRef.current = false;
      isDraggingRef.current = false;
      gestureLockRef.current = "none";

      const deltaY = e.clientY - startYRef.current;
      const elapsed = Date.now() - startTimeRef.current;
      const velocity = elapsed > 0 ? deltaY / elapsed : 0;

      if (deltaY > DISMISS_THRESHOLD || velocity > DISMISS_VELOCITY) {
        // Animate card out, then dismiss
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

    function onPointerCancel() {
      if (!trackingRef.current) return;
      trackingRef.current = false;
      isDraggingRef.current = false;
      gestureLockRef.current = "none";
      resetTransform(true);
    }

    card.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);

    return () => {
      card.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [enabled, onDismiss, gestureLockRef, scrollContainerRef, cardRef]);
}
