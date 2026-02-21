import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function UploadLoading() {
  return (
    <PageContainer className="space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-9 w-40 rounded-md" />
        <Skeleton className="h-4 w-72 max-w-md rounded-md" />
      </div>
      <Card glass={false} variant="elevated">
        <CardContent className="p-12">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
