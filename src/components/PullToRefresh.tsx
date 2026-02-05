 import { RefreshCw } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface PullToRefreshProps {
   pullDistance: number;
   isRefreshing: boolean;
   threshold?: number;
 }
 
 export function PullToRefresh({ pullDistance, isRefreshing, threshold = 80 }: PullToRefreshProps) {
   const progress = Math.min(pullDistance / threshold, 1);
   const shouldShow = pullDistance > 10 || isRefreshing;
 
   if (!shouldShow) return null;
 
   return (
     <div
       className="flex justify-center items-center transition-all duration-200"
       style={{ height: pullDistance }}
     >
       <div
         className={cn(
           "w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center",
           isRefreshing && "animate-pulse"
         )}
       >
         <RefreshCw
           className={cn(
             "w-4 h-4 text-primary transition-transform",
             isRefreshing && "animate-spin"
           )}
           style={{ transform: `rotate(${progress * 360}deg)` }}
         />
       </div>
     </div>
   );
 }