 import { useState, useRef, useCallback, useEffect } from "react";
 
 interface UsePullToRefreshOptions {
   onRefresh: () => Promise<void>;
   threshold?: number;
 }
 
 export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
   const [isPulling, setIsPulling] = useState(false);
   const [pullDistance, setPullDistance] = useState(0);
   const [isRefreshing, setIsRefreshing] = useState(false);
   const startY = useRef(0);
   const containerRef = useRef<HTMLDivElement>(null);
 
   const handleTouchStart = useCallback((e: TouchEvent) => {
     if (window.scrollY === 0) {
       startY.current = e.touches[0].clientY;
       setIsPulling(true);
     }
   }, []);
 
   const handleTouchMove = useCallback((e: TouchEvent) => {
     if (!isPulling || window.scrollY > 0) {
       setPullDistance(0);
       return;
     }
 
     const currentY = e.touches[0].clientY;
     const diff = currentY - startY.current;
     
     if (diff > 0) {
       // Apply resistance to the pull
       const resistance = 0.4;
       setPullDistance(Math.min(diff * resistance, threshold * 1.5));
     }
   }, [isPulling, threshold]);
 
   const handleTouchEnd = useCallback(async () => {
     if (pullDistance >= threshold && !isRefreshing) {
       setIsRefreshing(true);
       setPullDistance(threshold);
       try {
         await onRefresh();
       } finally {
         setIsRefreshing(false);
       }
     }
     setIsPulling(false);
     setPullDistance(0);
   }, [pullDistance, threshold, isRefreshing, onRefresh]);
 
   useEffect(() => {
     const container = containerRef.current;
     if (!container) return;
 
     container.addEventListener("touchstart", handleTouchStart, { passive: true });
     container.addEventListener("touchmove", handleTouchMove, { passive: true });
     container.addEventListener("touchend", handleTouchEnd);
 
     return () => {
       container.removeEventListener("touchstart", handleTouchStart);
       container.removeEventListener("touchmove", handleTouchMove);
       container.removeEventListener("touchend", handleTouchEnd);
     };
   }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
 
   return {
     containerRef,
     pullDistance,
     isRefreshing,
     isPulling,
   };
 }