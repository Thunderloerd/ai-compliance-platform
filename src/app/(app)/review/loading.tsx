import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewLoading() {
  return (
    <PageContainer className="space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-4 w-80 max-w-md rounded-md" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card glass={false} variant="elevated">
            <CardHeader>
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="mt-2 h-4 w-24 rounded-md" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="mt-3 h-4 w-3/4 rounded-md" />
              <Skeleton className="mt-3 h-20 w-full rounded-md" />
            </CardContent>
          </Card>
        </div>
        <Card glass={false} variant="elevated">
          <CardHeader>
            <Skeleton className="h-5 w-40 rounded-md" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="mt-2 h-3 w-1/2 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
