import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ShoppingCart, Search, Printer } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { OrderForm } from "@/components/orders/OrderForm";
import { BulkOrderForm } from "@/components/orders/BulkOrderForm";
import { OrderDetail } from "@/components/orders/OrderDetail";
import { ORDER_STATUSES, GARMENT_TYPES, getStatusConfig } from "@/lib/constants";
import { format } from "date-fns";
import { printBulkTailorSlips } from "@/lib/bulkSlipPrint";

export default function Orders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [bulkFormOpen, setBulkFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: orders, isLoading } = useOrders(search, statusFilter);

  if (selectedId) {
    return <AppLayout><div className="animate-fade-in"><OrderDetail orderId={selectedId} onBack={() => setSelectedId(null)} /></div></AppLayout>;
  }

  const handleBulkPrint = () => {
    if (!orders || orders.length === 0) return;
    printBulkTailorSlips(orders);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">All Orders & Bills</h1>
            <p className="text-sm text-muted-foreground">Manage all store orders, track payments, and generate customer bills</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> New Order</Button>
            <Button variant="outline" onClick={() => setBulkFormOpen(true)} className="w-full sm:w-auto">Bulk Order</Button>
            {orders && orders.length > 0 && (
              <Button
                variant="outline"
                onClick={handleBulkPrint}
                className="w-full sm:w-auto border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print All Slips ({orders.length})
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search Bill # or customer..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* Hint text */}
          {orders && orders.length > 0 && (
            <p className="text-xs text-muted-foreground hidden sm:block">
              Filter by status, then print slips for that batch
            </p>
          )}
        </div>

        <Card className="border-0 shadow-sm overflow-hidden">
          {isLoading ? (
            <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
          ) : !orders || orders.length === 0 ? (
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="text-lg font-medium text-foreground">No orders yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create your first order to get started</p>
              <Button className="mt-4" onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Order</Button>
            </CardContent>
          ) : (
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Garment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o: any) => {
                      const sc = getStatusConfig(ORDER_STATUSES, o.status);
                      const gl = GARMENT_TYPES.find((g) => g.value === o.garment_type)?.label || o.garment_type;
                      return (
                        <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(o.id)}>
                          <TableCell className="font-mono text-xs">{o.invoice_number || o.order_number}</TableCell>
                          <TableCell className="font-medium">{o.customers?.full_name}</TableCell>
                          <TableCell>{gl}</TableCell>
                          <TableCell><Badge className={sc.color}>{sc.label}</Badge></TableCell>
                          <TableCell>₹{Number(o.total_amount).toFixed(0)}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{format(new Date(o.created_at), "dd MMM yyyy")}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          )}
        </Card>
        <OrderForm open={formOpen} onOpenChange={setFormOpen} />
        <BulkOrderForm open={bulkFormOpen} onOpenChange={setBulkFormOpen} />
      </div>
    </AppLayout>
  );
}
