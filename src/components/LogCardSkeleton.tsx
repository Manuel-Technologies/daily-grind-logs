import { Skeleton } from "@/components/ui/skeleton";

export function LogCardSkeleton() {
  return (
    <article className="border-b border-border p-4">
      <div className="flex gap-3">
        {/* Avatar skeleton */}
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />

        <div className="flex-1 min-w-0 space-y-3">
          {/* Header: name, username, time */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>

          {/* Content lines */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-6 mt-3">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <LogCardSkeleton key={i} />
      ))}
    </>
  );
}
