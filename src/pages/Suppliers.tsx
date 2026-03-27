import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Warehouse, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Suppliers() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Suppliers</h1>
            <p className="text-sm text-muted-foreground">Manage your supplier database</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search suppliers..." className="pl-9" />
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Warehouse className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-lg font-medium text-foreground">No suppliers yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Add your fabric and material suppliers</p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
