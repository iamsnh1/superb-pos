import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function PurchaseOrders() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Purchase Orders</h1>
            <p className="text-sm text-muted-foreground">Create and manage purchase orders for suppliers</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New PO
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search purchase orders..." className="pl-9" />
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-lg font-medium text-foreground">No purchase orders yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create purchase orders to restock your inventory</p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              New PO
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
