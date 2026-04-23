"use client";

import { useEffect, useRef } from "react";

const DEAD_ZONE = 10;
const COMMIT_THRESHOLD = 80; // px
const COMMIT_VELOCITY = 0.3; // px/ms
const RUBBER_BAND = 0.3;
const SLIDE_DURATION = 200; // ms

interface Options {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  canSwipeLeft: boolean;
  canSwipeRight: boolean;
  enabled: boolean;
  gestureLockRef: React.RefObject<"none" | "horizontal" | "vertical">;
}

export function useSwipeNavigation(
  contentRef: React.RefObject<HTMLElement | null>,
  options: Options
) {
  const { onSwipeLeft, onSwipeRight, canSwipeLeft, canSwipeRight, enabled, gestureLockRef } = options;

  // Keep callbacks in refs so the effect doesn't re-run when they change
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  const canSwipeLeftRef = useRef(canSwipeLeft);
  const canSwipeRightRef = useRef(canSwipeRight);
  onSwipeLeftRef.current = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;
  canSwipeLeftRef.current = canSwipeLeft;
  canSwipeRightRef.current = canSwipeRight;

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const trackingRef = useRef(false);
  const isSwipingRef = useRef(false);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    function setTranslate(x: number, animate: boolean) {
      if (!el) return;
      el.style.transition = animate ? `transform ${SLIDE_DURATION}ms ease-out` : "none";
      el.style.transform = x === 0 ? "" : `translateX(${x}px)`;
    }

    function commit(direction: "left" | "right") {
      if (!el) return;
      isAnimatingRef.current = true;
      const vw = window.innerWidth;
      const exitX = direction === "left" ? -vw : vw;

      // Slide current content out
      el.style.transition = `transform ${SLIDE_DURATION}ms ease-out`;
      el.style.transform = `translateX(${exitX}px)`;

      setTimeout(() => {
        if (!el) return;
        // Navigate (this updates React state — new plushie content renders)
        if (direction === "left") {
          onSwipeLeftRef.current();
        } else {
          onSwipeRightRef.current();
        }

        // Place new content on the opposite side, then slide to center
        const entryX = direction === "left" ? vw : -vw;
        el.style.transition = "none";
        el.style.transform = `translateX(${entryX}px)`;

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!el) return;
            el.style.transition = `transform ${SLIDE_DURATION}ms ease-out`;
            el.style.transform = "";
            setTimeout(() => {
              isAnimatingRef.current = false;
            }, SLIDE_DURATION);
          });
        });
      }, SLIDE_DURATION);
    }

    function cancel() {
      setTranslate(0, true);
    }

    function onPointerDown(e: PointerEvent) {
      if (!enabled || e.button !== 0 || isAnimatingRef.current) return;
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      startTimeRef.current = Date.now();
      trackingRef.current = true;
      isSwipingRef.current = false;
    }

    function onPointerMove(e: PointerEvent) {
      if (!trackingRef.current) return;

      const deltaX = e.clientX - startXRef.current;
      const deltaY = e.clientY - startYRef.current;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Respect gesture lock from dismiss hook
      if (gestureLockRef.current === "vertical") {
        trackingRef.current = false;
        isSwipingRef.current = false;
        cancel();
        return;
      }

      if (!isSwipingRef.current) {
        if (absX < DEAD_ZONE && absY < DEAD_ZONE) return;

        if (absY > absX) {
          // Vertical wins — let dismiss hook or scroll handle it
          trackingRef.current = false;
          return;
        }

        // Horizontal wins
        isSwipingRef.current = true;
        gestureLockRef.current = "horizontal";
      }

      e.preventDefault();

      // Apply rubber-banding at edges
      let offsetX = deltaX;
      if (deltaX < 0 && !canSwipeLeftRef.current) {
        offsetX = deltaX * RUBBER_BAND;
      } else if (deltaX > 0 && !canSwipeRightRef.current) {
        offsetX = deltaX * RUBBER_BAND;
      }

      setTranslate(offsetX, false);
    }

    function onPointerUp(e: PointerEvent) {
      if (!trackingRef.current) return;

      const wasSwiping = isSwipingRef.current;
      trackingRef.current = false;
      isSwipingRef.current = false;
      gestureLockRef.current = "none";

      if (!wasSwiping) return;

      const deltaX = e.clientX - startXRef.current;
      const elapsed = Date.now() - startTimeRef.current;
      const velocity = elapsed > 0 ? Math.abs(deltaX) / elapsed : 0;
      const absX = Math.abs(deltaX);

      const shouldCommit = absX > COMMIT_THRESHOLD || velocity > COMMIT_VELOCITY;

      if (shouldCommit && deltaX < 0 && canSwipeLeftRef.current) {
        commit("left");
      } else if (shouldCommit && deltaX > 0 && canSwipeRightRef.current) {
        commit("right");
      } else {
        cancel();
      }
    }

    function onPointerCancel() {
      if (!trackingRef.current) return;
      trackingRef.current = false;
      isSwipingRef.current = false;
      gestureLockRef.current = "none";
      cancel();
    }

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [enabled, contentRef, gestureLockRef]);
}
