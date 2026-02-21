import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <PageContainer className="space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-4 w-80 max-w-md rounded-md" />
      </div>
      <Skeleton className="h-10 w-full max-w-2xl rounded-md" />
      <Card glass={false} variant="elevated">
        <CardHeader>
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="mt-2 h-4 w-64 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="mt-2 h-10 w-full rounded-md" />
          </div>
          <div>
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="mt-2 h-2 w-full rounded-md" />
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
