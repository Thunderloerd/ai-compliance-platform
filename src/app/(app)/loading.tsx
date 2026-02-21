import { Skeleton } from "@/components/ui/skeleton";

/** Shown while (app) route segment loads — matches app shell so first paint feels fast. */
export default function AppLoading() {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-16 shrink-0 border-r border-border/50 flex flex-col items-center py-4 gap-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-9 rounded-lg" />
        ))}
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border/50 flex items-center px-6 shadow-sm">
          <Skeleton className="h-8 w-48 rounded-md" />
        </header>
        <main className="flex-1 p-6">
          <div className="space-y-4 max-w-7xl mx-auto">
            <Skeleton className="h-8 w-64 rounded-md" />
            <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
            <Skeleton className="h-4 w-full max-w-xl rounded-md" />
            <div className="grid gap-4 mt-8">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
