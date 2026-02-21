import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <PageContainer className="space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-4 w-72 max-w-md rounded-md" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} glass={false} variant="default">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="mt-2 h-8 w-16 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card glass={false} variant="elevated">
        <CardHeader>
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="mt-2 h-4 w-64 rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-2xl" />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
