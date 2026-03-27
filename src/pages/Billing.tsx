import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrders } from "@/hooks/useOrders";
import { useInvoices, useBillData } from "@/hooks/usePayments";
import { formatCurrency } from "@/lib/utils";
import { Link } from "react-router-dom";
import { DollarSign, FileDown } from "lucide-react";
import { BillModal } from "@/components/billing/BillModal";

export default function BillingPage() {
  const { data: orders } = useOrders();
  const { data: invoices, isLoading: loadingInvoices } = useInvoices();
  const [billOrderId, setBillOrderId] = useState<string | null>(null);
  const { data: billData, isLoading: loadingBill } = useBillData(billOrderId);

  // Filter unpaid - handle both object and array response for safety
  const ordersList = Array.isArray(orders) ? orders : (orders as any)?.orders || [];
  const unpaidOrders = ordersList.filter((o: any) => o.balance_amount > 0);
  const totalOutstanding = unpaidOrders.reduce((sum: number, o: any) => sum + o.balance_amount, 0);

  // Calculate revenue
  const totalRevenue = ordersList.reduce((sum: number, o: any) => sum + (o.net_amount - (o.balance_amount || 0)), 0);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Billing & Payments</h1>
            <p className="text-sm text-muted-foreground">Manage invoices and track outstanding payments</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">Collected across all active orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground">{unpaidOrders.length} orders with pending payments</p>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Record All Bills with PDF</CardTitle>
            <p className="text-sm text-muted-foreground">View and save any bill as PDF</p>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingInvoices ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : !invoices?.length ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No bills yet</TableCell></TableRow>
                ) : (
                  (invoices || []).map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                      <TableCell className="font-medium">{inv.order_number}</TableCell>
                      <TableCell>{inv.customer_name}</TableCell>
                      <TableCell>{formatCurrency(inv.total_amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setBillOrderId(String(inv.order_id))}>
                          <FileDown className="mr-2 h-4 w-4 shrink-0" /> Save PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Outstanding Payments</CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidOrders.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      <Link to={`/orders/${o.id}`} className="hover:underline text-primary">
                        {o.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell>{formatCurrency(o.net_amount)}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {formatCurrency(o.net_amount - o.balance_amount)}
                    </TableCell>
                    <TableCell className="text-destructive font-bold">
                      {formatCurrency(o.balance_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/orders/${o.id}`}>Full Details</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        <BillModal
          open={!!billOrderId}
          onOpenChange={(open) => !open && setBillOrderId(null)}
          billData={loadingBill ? null : billData}
        />
      </div>
    </AppLayout>
  );
}

function AlertTriangle({ className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
  )
}
