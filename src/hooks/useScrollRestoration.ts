import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const scrollPositions = new Map<string, number>();

export function useScrollRestoration(key?: string) {
  const location = useLocation();
  const scrollKey = key || location.pathname;
  const isRestored = useRef(false);

  // Save scroll position before navigating away
  useEffect(() => {
    const saveScrollPosition = () => {
      scrollPositions.set(scrollKey, window.scrollY);
    };

    // Save on scroll (throttled)
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(saveScrollPosition, 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
      // Save final position on unmount
      saveScrollPosition();
    };
  }, [scrollKey]);

  // Restore scroll position on mount
  useEffect(() => {
    if (!isRestored.current) {
      const savedPosition = scrollPositions.get(scrollKey);
      if (savedPosition !== undefined) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          window.scrollTo(0, savedPosition);
        });
      }
      isRestored.current = true;
    }
  }, [scrollKey]);

  return {
    savePosition: () => scrollPositions.set(scrollKey, window.scrollY),
    getPosition: () => scrollPositions.get(scrollKey) || 0,
  };
}
