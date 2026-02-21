import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <PageContainer className="space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-4 w-96 max-w-md rounded-md" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} glass={false} variant="default">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="mt-2 h-8 w-16 rounded-md" />
              <Skeleton className="mt-2 h-3 w-20 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card glass={false} variant="elevated">
            <CardHeader>
              <Skeleton className="h-5 w-48 rounded-md" />
              <Skeleton className="mt-2 h-4 w-64 rounded-md" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full rounded-2xl" />
            </CardContent>
          </Card>
        </div>
        <Card glass={false} variant="elevated">
          <CardHeader>
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="mt-2 h-4 w-48 rounded-md" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="mt-2 h-2 w-full rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card glass={false} variant="elevated">
        <CardHeader>
          <Skeleton className="h-5 w-40 rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="mt-2 h-3 w-1/2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
