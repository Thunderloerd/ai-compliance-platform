import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RulesLoading() {
  return (
    <PageContainer className="space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-4 w-64 max-w-md rounded-md" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} glass={false} variant="elevated">
            <CardContent className="p-6">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-48 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-4 w-full rounded-md" />
              <Skeleton className="mt-2 h-3 w-3/4 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
