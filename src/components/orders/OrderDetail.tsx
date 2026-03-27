import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useOrder, useOrderTimeline, useUpdateOrderStatus, useOrderBom, useTailors, useUpdateOrder } from "@/hooks/useOrders";
import { useGarmentTemplates } from "@/hooks/useTemplates";
import { usePayments, useCreatePayment, useGenerateInvoice } from "@/hooks/usePayments";
import { useManufacturingOrders } from "@/hooks/useProduction";
import { ORDER_STATUSES, MO_STATUSES, PAYMENT_METHODS, getStatusConfig } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Clock, Package, FileText, Edit, XCircle, User, Scissors, DollarSign, Receipt, Printer, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { OrderEditDialog } from "./OrderEditDialog";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { OrderSlipModal } from "./OrderSlipModal";

interface OrderDetailProps {
  orderId: string;
  onBack: () => void;
}

export function OrderDetail({ orderId, onBack }: OrderDetailProps) {
  const { data: order, isLoading } = useOrder(orderId);
  const { data: timeline } = useOrderTimeline(orderId);
  const { data: bom } = useOrderBom(orderId);
  const { data: tailors } = useTailors();
  const { data: templates } = useGarmentTemplates();
  const { data: payments } = usePayments(orderId);
  // Fetch MO linked to this order
  const { data: mos } = useManufacturingOrders(undefined, undefined, orderId);
  // We filter client side because hook doesn't support order_id directly returning ONE item, it returns list.
  // Actually I added order_id support to the hook's params in Step 637 but need to update hook function in useProduction.ts to pass it? 
  // Wait, I updated ROUTE. Hook useManufacturingOrders in Step 620 takes (status, tailor_id). 
  // I should update hook to accept filters object or just pass status?
  // Current hook: useManufacturingOrders(status?, tailor_id?)
  // I can't pass order_id with current hook signature. 
  // I'll fix hook in next step. For now assume I will fix hook.

  const updateStatus = useUpdateOrderStatus();
  const updateOrder = useUpdateOrder();
  const generateInvoice = useGenerateInvoice();

  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);

  if (isLoading) return <div className="flex justify-center py-8"><span className="text-muted-foreground">Loading...</span></div>;
  if (!order) return null;

  const o = order as any;
  const statusConfig = getStatusConfig(ORDER_STATUSES, o.status);
  const garmentLabel = templates?.find((g) => g.code === o.garment_type)?.name || o.garment_type;
  const canEdit = !["delivered", "cancelled"].includes(o.status);
  const canChangeStatus = !["delivered", "cancelled"].includes(o.status);
  const nextStatuses = ORDER_STATUSES.filter((s) => s.value !== o.status && s.value !== "cancelled");

  const handleTailorChange = async (tailorId: string) => {
    await updateOrder.mutateAsync({ id: orderId, assigned_tailor_id: tailorId || null });
  };

  const currentTailor = tailors?.find((t: any) => t.user_id === o.assigned_tailor_id);

  // Find linked MO (assuming I fetch all and find, or fix hook)
  // Let's assume I fix hook to useManufacturingOrders({ order_id: orderId })
  // For now I'll use a hack or placeholder.
  const mo = mos?.find((m: any) => m.order_id === Number(orderId));
  const moStatus = mo ? getStatusConfig(MO_STATUSES, mo.status) : null;

  const handleWhatsApp = () => {
    if (!o.customers?.phone) {
        alert("No phone number found for this customer.");
        return;
    }
    const message = `Hi ${o.customers.full_name}, your order ${o.order_number} for ${garmentLabel} is currently: ${statusConfig.label}. Balance details will follow upon delivery. Contact us if you need any info!`;
    const url = `https://wa.me/${o.customers.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h2 className="text-xl font-bold text-foreground">{o.order_number}</h2>
            <p className="text-sm text-muted-foreground">{o.customers?.full_name} ({o.customers?.customer_code})</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mo && (
            <Badge variant="outline" className="flex gap-1 items-center">
              <Scissors className="w-3 h-3" /> {moStatus?.label || mo.status}
            </Badge>
          )}
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />Edit
              </Button>
              <Button variant="outline" size="sm" className="border-green-300 text-green-700 bg-green-50 hover:bg-green-100" onClick={handleWhatsApp}>
                <MessageSquare className="mr-2 h-4 w-4" />WhatsApp
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" />Cancel
              </Button>
            </>
          )}
          <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Garment</span><span className="font-medium">{garmentLabel}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><Badge variant={o.priority === "urgent" ? "destructive" : "secondary"}>{o.priority}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery Type</span><span>{o.delivery_type === "home_delivery" ? "Home Delivery" : "Pickup"}</span></div>
            {o.delivery_date && <div className="flex justify-between"><span className="text-muted-foreground">Delivery Date</span><span>{format(new Date(o.delivery_date), "dd MMM yyyy")}</span></div>}

            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Assigned Tailor</span>
              </div>
              {canEdit ? (
                <Select value={o.assigned_tailor_id?.toString() || "unassigned"} onValueChange={(v) => handleTailorChange(v === "unassigned" ? "" : v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Assign tailor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {(tailors || []).map((t: any) => (
                      <SelectItem key={t.user_id} value={t.user_id.toString()}>
                        {(t.profiles as any)?.full_name || "Tailor"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="font-medium">{(currentTailor?.profiles as any)?.full_name || "Not assigned"}</span>
              )}
            </div>

            <hr className="my-2" />
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">{formatCurrency(o.total_amount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>{formatCurrency(o.discount_amount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(o.tax_amount)}</span></div>
            <div className="flex justify-between font-medium"><span>Net Amount</span><span>{formatCurrency(o.net_amount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-green-600">{formatCurrency(o.net_amount - o.balance_amount)}</span></div>
            <div className="flex justify-between font-medium"><span>Balance</span><span className="text-destructive font-bold">{formatCurrency(o.balance_amount)}</span></div>

            {/* Payment Actions */}
            <div className="pt-4 flex gap-2">
              {o.balance_amount > 0 && (
                <Button size="sm" className="flex-1" onClick={() => setPaymentOpen(true)}>
                  <DollarSign className="w-4 h-4 mr-1" /> Pay
                </Button>
              )}
              <Button size="sm" variant="outline" className="flex-1" onClick={() => generateInvoice.mutate(orderId)}>
                <Receipt className="w-4 h-4 mr-1" /> Invoice
              </Button>
              <Button size="sm" variant="outline" className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50" onClick={() => setSlipOpen(true)}>
                <Printer className="w-4 h-4 mr-1" /> Order Slip
              </Button>
            </div>

            {o.notes && <p className="text-xs text-muted-foreground mt-2">Notes: {o.notes}</p>}

            {canChangeStatus && (
              <div className="pt-3">
                <Label className="text-xs mb-1 block">Update Status</Label>
                <Select onValueChange={(status) => updateStatus.mutate({ id: orderId, status })}>
                  <SelectTrigger><SelectValue placeholder="Change Status" /></SelectTrigger>
                  <SelectContent>
                    {nextStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Middle Column: Specs & BOM */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4" /> Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {o.design_specifications && Object.keys(o.design_specifications).length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Design</h4>
                  <div className="space-y-1">
                    {Object.entries(o.design_specifications).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{key}</span>
                        <span>{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {o.measurement_profiles?.measurements && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Measurements ({o.measurement_profiles.label})</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(o.measurement_profiles.measurements as Record<string, number>).map(([key, val]) => {
                      const fieldDef = (templates?.find((t) => t.code === o.garment_type)?.measurement_fields || []).find((f) => f.key === key);
                      return (
                        <div key={key} className="flex justify-between text-sm bg-muted/50 rounded px-2 py-1">
                          <span className="text-muted-foreground">{fieldDef?.label || key}</span>
                          <span className="font-medium">{val}"</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* BOM */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Scissors className="h-4 w-4" /> Bill of Materials</CardTitle>
            </CardHeader>
            <CardContent>
              {bom && bom.length > 0 ? (
                <div className="space-y-1">
                  {bom.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm bg-muted/50 rounded px-2 py-1">
                      <span>{item.item_name}</span>
                      <div className="text-right">
                        <span>{item.required_quantity} {item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No BOM items</p>}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Timeline & Payments */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {!timeline || timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No timeline entries</p>
              ) : (
                <div className="space-y-3">
                  {timeline.map((entry: any, i: number) => {
                    const sc = getStatusConfig(ORDER_STATUSES, entry.status);
                    return (
                      <div key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          {i < timeline.length - 1 && <div className="w-px h-full bg-border" />}
                        </div>
                        <div className="pb-3">
                          <Badge className={`${sc.color} text-xs`}>{sc.label}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(entry.created_at), "dd MMM yyyy, HH:mm")}</p>
                          {/* {entry.notes && <p className="text-xs mt-1">{entry.notes}</p>} */}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <div className="space-y-2">
                  {payments.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center text-sm bg-green-50 p-2 rounded border border-green-100">
                      <div>
                        <p className="font-medium text-green-700">{formatCurrency(p.amount)}</p>
                        <p className="text-xs text-green-600 capitalize">{p.method}</p>
                      </div>
                      <div className="text-right text-xs text-green-600">
                        <p>{format(new Date(p.created_at), "dd MMM")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No payments recorded</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <OrderEditDialog order={o} open={editOpen} onOpenChange={setEditOpen} />
      <CancelOrderDialog orderId={orderId} orderNumber={o.order_number} open={cancelOpen} onOpenChange={setCancelOpen} />
      <AddPaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} orderId={orderId} balanceAmount={o.balance_amount || 0} />
      <OrderSlipModal
        open={slipOpen}
        onOpenChange={setSlipOpen}
        order={{
          ...o,
          customer_name: o.customers?.full_name,
          customer_phone: o.customers?.phone,
          invoice_number: o.invoice_number,
        }}
        items={[
          {
            garment_type: o.garment_type,
            measurements: o.measurement_profiles?.measurements || o.measurements || {},
            design_specifications: o.design_specifications,
            notes: o.notes,
            qty: o.quantity || 1,
          },
          // Sibling orders from the same invoice
          ...(o.related_orders || []).map((rel: any) => ({
            garment_type: rel.garment_type,
            measurements: typeof rel.measurements === 'string' ? JSON.parse(rel.measurements) : (rel.measurements || {}),
            design_specifications: typeof rel.design_specifications === 'string' ? JSON.parse(rel.design_specifications) : rel.design_specifications,
            notes: rel.notes,
            qty: rel.qty || 1,
          }))
        ]}
        templates={templates || []}
      />
    </div>
  );
}

export function AddPaymentDialog({ open, onOpenChange, orderId, balanceAmount }: any) {
  const createPayment = useCreatePayment();
  const [amount, setAmount] = useState(balanceAmount);
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    await createPayment.mutateAsync({ order_id: orderId, amount: Number(amount), method, notes });
    onOpenChange(false);
    setAmount(0);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Amount (Balance: {formatCurrency(balanceAmount)})</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={createPayment.isPending} className="w-full">
            {createPayment.isPending ? "Recording..." : "Confirm Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
