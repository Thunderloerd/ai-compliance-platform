import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <PageContainer className="space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-4 w-64 max-w-md rounded-md" />
      </div>
      <Card glass={false} variant="elevated">
        <CardContent className="p-6">
          <div className="flex gap-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48 rounded-md" />
              <Skeleton className="h-4 w-64 rounded-md" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card glass={false} variant="elevated">
          <CardHeader>
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="mt-2 h-4 w-48 rounded-md" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-4 w-8 rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card glass={false} variant="elevated">
          <CardHeader>
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="mt-2 h-4 w-40 rounded-md" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
      <Card glass={false} variant="elevated">
        <CardHeader>
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="mt-2 h-4 w-56 rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between pb-3">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
