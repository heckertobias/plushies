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

      el.style.transition = `transform ${SLIDE_DURATION}ms ease-out`;
      el.style.transform = `translateX(${exitX}px)`;

      setTimeout(() => {
        if (!el) return;
        if (direction === "left") {
          onSwipeLeftRef.current();
        } else {
          onSwipeRightRef.current();
        }

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

    function onTouchStart(e: TouchEvent) {
      if (!enabled || e.touches.length !== 1 || isAnimatingRef.current) return;
      const touch = e.touches[0]!;
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      startTimeRef.current = Date.now();
      trackingRef.current = true;
      isSwipingRef.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (!trackingRef.current) return;

      if (e.touches.length !== 1) {
        trackingRef.current = false;
        isSwipingRef.current = false;
        gestureLockRef.current = "none";
        cancel();
        return;
      }

      const touch = e.touches[0]!;
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (gestureLockRef.current === "vertical") {
        trackingRef.current = false;
        isSwipingRef.current = false;
        cancel();
        return;
      }

      if (!isSwipingRef.current) {
        // preventDefault early for horizontal-leaning gestures so that a slight
        // vertical drift doesn't let iOS claim the gesture as scroll.
        if (absX > absY && absX >= DEAD_ZONE) {
          e.preventDefault();
        }

        if (absX < DEAD_ZONE && absY < DEAD_ZONE) return;

        if (absY > absX) {
          trackingRef.current = false;
          return;
        }

        isSwipingRef.current = true;
        gestureLockRef.current = "horizontal";
      }

      e.preventDefault();

      let offsetX = deltaX;
      if (deltaX < 0 && !canSwipeLeftRef.current) {
        offsetX = deltaX * RUBBER_BAND;
      } else if (deltaX > 0 && !canSwipeRightRef.current) {
        offsetX = deltaX * RUBBER_BAND;
      }

      setTranslate(offsetX, false);
    }

    function onTouchEnd(e: TouchEvent) {
      if (!trackingRef.current) return;

      const wasSwiping = isSwipingRef.current;
      trackingRef.current = false;
      isSwipingRef.current = false;
      gestureLockRef.current = "none";

      if (!wasSwiping) return;

      const touch = e.changedTouches[0]!;
      const deltaX = touch.clientX - startXRef.current;
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

    function onTouchCancel() {
      if (!trackingRef.current) return;
      trackingRef.current = false;
      isSwipingRef.current = false;
      gestureLockRef.current = "none";
      cancel();
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchCancel);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [enabled, contentRef, gestureLockRef]);
}
