import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function ComingSoon({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card className="grid place-items-center gap-3 p-12 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <Construction className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold">Coming soon</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {desc ?? "This module is part of the next milestone. Foundation, dashboard, products and categories are live now."}
        </p>
      </Card>
    </div>
  );
}
