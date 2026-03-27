import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Search, MapPin, Phone, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Branches() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Branches</h1>
            <p className="text-sm text-muted-foreground">Manage your store locations</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Branch
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-lg font-medium text-foreground">No branches yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Set up your first store branch</p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Branch
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
