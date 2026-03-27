import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Users as UsersIcon } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { CustomerDetail } from "@/components/customers/CustomerDetail";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";

export default function Customers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("id"));
  const { data: customers, isLoading } = useCustomers(search);

  // Sync selectedId with URL
  const handleSelectCustomer = (id: string | null) => {
    setSelectedId(id);
    if (id) {
        searchParams.set("id", id);
    } else {
        searchParams.delete("id");
    }
    setSearchParams(searchParams);
  };

  if (selectedId) {
    return (
      <AppLayout>
        <div className="animate-fade-in">
          <CustomerDetail customerId={selectedId} onBack={() => handleSelectCustomer(null)} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Customers</h1>
            <p className="text-sm text-muted-foreground">Manage your customer database and measurements</p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto shrink-0"><Plus className="mr-2 h-4 w-4" /> Add Customer</Button>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search customers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <Card className="border-0 shadow-sm overflow-hidden">
          {isLoading ? (
            <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
          ) : !customers || customers.length === 0 ? (
            <CardContent className="flex flex-col items-center justify-center py-16">
              <UsersIcon className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="text-lg font-medium text-foreground">No customers yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first customer</p>
              <Button className="mt-4" onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Customer</Button>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c: any) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelectCustomer(c.id)}>
                    <TableCell className="font-mono text-xs">{c.customer_code}</TableCell>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell>{c.city || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{format(new Date(c.created_at), "dd MMM yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </Card>
        <CustomerForm open={formOpen} onOpenChange={setFormOpen} />
      </div>
    </AppLayout>
  );
}
