import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, Phone, TrendingDown, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useOrders } from "@/hooks/useOrders";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";

export default function Ledger() {
  const [search, setSearch] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);
  const { data: orders, isLoading } = useOrders(search, "all");
  const { data: settings } = useSettings();

  const businessName = settings?.business_name || "Superb Tailors";

  const pendingDues = orders?.filter((o: any) => o.balance_amount > 0) || [];
  
  // Group by customer
  const groupedDues: Record<number, {
    name: string;
    phone: string;
    customer_id: number;
    total_due: number;
    orders: any[];
    oldest: string;
  }> = pendingDues.reduce((acc: any, order: any) => {
    const cid = order.customer_id;
    if (!acc[cid]) {
      acc[cid] = {
        name: order.customer_name,
        phone: order.customer_phone,
        customer_id: cid,
        total_due: 0,
        orders: [],
        oldest: order.created_at,
      };
    }
    acc[cid].total_due += order.balance_amount;
    acc[cid].orders.push(order);
    if (order.created_at < acc[cid].oldest) acc[cid].oldest = order.created_at;
    return acc;
  }, {});

  const groups = Object.values(groupedDues).sort((a, b) => b.total_due - a.total_due);
  const totalOutstanding = pendingDues.reduce((sum: number, o: any) => sum + o.balance_amount, 0);
  const customersWithDue = groups.length;

  const daysSince = (date: string) => {
    const d = new Date(date);
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  };

  const handleWhatsApp = (phone: string, name: string, amount: number, orders: any[]) => {
    if (!phone) {
      alert("No phone number found for this customer.");
      return;
    }
    const orderList = orders.map(o => `   • ${o.order_number} — ₹${o.balance_amount.toLocaleString()}`).join('\n');
    const msg = `Hi ${name},\n\nThis is a gentle reminder from *${businessName}*.\n\nYou have the following pending balance(s):\n${orderList}\n\n*Total Due: ₹${amount.toLocaleString()}*\n\nKindly clear the balance at your earliest convenience. Thank you! 🙏`;
    const cleaned = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getUrgencyBadge = (amt: number, daysSinceOldest: number) => {
    if (daysSinceOldest > 60 || amt > 10000) return { label: "High", className: "bg-red-100 text-red-700 border-red-200" };
    if (daysSinceOldest > 30 || amt > 5000) return { label: "Medium", className: "bg-amber-100 text-amber-700 border-amber-200" };
    return { label: "Low", className: "bg-green-100 text-green-700 border-green-200" };
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="text-2xl">📒</span> Customer Khata
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track pending dues and unpaid balances. Remind with one click.</p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-rose-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-100">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Total Outstanding</p>
                <p className="text-2xl font-extrabold text-red-700">{formatCurrency(totalOutstanding)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Customers with Dues</p>
                <p className="text-2xl font-extrabold text-amber-700">{customersWithDue}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Unpaid Orders</p>
                <p className="text-2xl font-extrabold text-blue-700">{pendingDues.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer or phone..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>Clear</Button>
          )}
        </div>

        {/* Main ledger table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Pending Dues — Customer-wise</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-bold">Customer</TableHead>
                <TableHead className="font-bold">Phone</TableHead>
                <TableHead className="font-bold text-center">Orders</TableHead>
                <TableHead className="font-bold text-center">Urgency</TableHead>
                <TableHead className="font-bold text-right">Total Due</TableHead>
                <TableHead className="text-right font-bold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                      Loading ledger...
                    </div>
                  </TableCell>
                </TableRow>
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-10 w-10 text-green-400" />
                      <p className="font-semibold text-green-600">All dues cleared! Everyone has paid. 🎉</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((g) => {
                  const days = daysSince(g.oldest);
                  const urgency = getUrgencyBadge(g.total_due, days);
                  const isExpanded = expandedCustomer === g.customer_id;
                  return (
                    <>
                      <TableRow
                        key={g.customer_id}
                        className="hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => setExpandedCustomer(isExpanded ? null : g.customer_id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                              {g.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground leading-tight">{g.name}</p>
                              <p className="text-xs text-muted-foreground">{days}d since oldest order</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {g.phone || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs font-bold">
                            {g.orders.length} order{g.orders.length > 1 ? "s" : ""}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${urgency.className}`}>
                            {urgency.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-red-600 text-base">
                          {formatCurrency(g.total_due)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                              onClick={(e) => { e.stopPropagation(); handleWhatsApp(g.phone, g.name, g.total_due, g.orders); }}
                              disabled={!g.phone}
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1" />
                              Remind
                            </Button>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded order breakdown */}
                      {isExpanded && (
                        <TableRow key={`${g.customer_id}-exp`} className="bg-muted/20">
                          <TableCell colSpan={6} className="py-0">
                            <div className="p-3 space-y-2">
                              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Order Breakdown</p>
                              {g.orders.map((o: any) => (
                                <div key={o.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="font-mono text-xs">{o.order_number}</Badge>
                                    <span className="font-medium">{o.garment_type}</span>
                                    <Badge className="text-[10px] px-1.5 bg-muted text-muted-foreground border">{o.status?.replace('_',' ')}</Badge>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground text-xs">Total: {formatCurrency(o.total_amount)}</span>
                                    <span className="text-muted-foreground text-xs">Paid: {formatCurrency(o.advance_amount)}</span>
                                    <span className="font-bold text-red-600">Due: {formatCurrency(o.balance_amount)}</span>
                                    <Link to={`/orders/${o.id}`} onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
}
