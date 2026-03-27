import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateOrder, useTailors } from "@/hooks/useOrders";
import { useMeasurements } from "@/hooks/useCustomers";
import { useInventoryItems } from "@/hooks/useInventory";
import { GARMENT_TYPES } from "@/lib/constants";

interface OrderEditDialogProps {
    order: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OrderEditDialog({ order, open, onOpenChange }: OrderEditDialogProps) {
    const updateOrder = useUpdateOrder();
    const { data: tailors } = useTailors();
    const { data: inventoryItems } = useInventoryItems();
    const { data: measurements } = useMeasurements(order?.customer_id || null);

    const [form, setForm] = useState({
        garment_type: "",
        measurement_profile_id: "",
        fabric_source: "inventory",
        fabric_item_id: "",
        assigned_tailor_id: "",
        delivery_date: "",
        delivery_type: "pickup",
        priority: "normal",
        total_amount: 0,
        discount_amount: 0,
        notes: "",
    });

    const [designSpecs, setDesignSpecs] = useState<Record<string, string>>({
        collar: "", cuff: "", pocket: "", fitting: "",
    });

    // Load order data when dialog opens
    useEffect(() => {
        if (order && open) {
            const specs = order.design_specifications || {};
            setForm({
                garment_type: order.garment_type || "shirt",
                measurement_profile_id: order.measurement_profile_id || "",
                fabric_source: order.fabric_source || "inventory",
                fabric_item_id: order.fabric_item_id || "",
                assigned_tailor_id: order.assigned_tailor_id || "",
                delivery_date: order.delivery_date || "",
                delivery_type: order.delivery_type || "pickup",
                priority: order.priority || "normal",
                total_amount: Number(order.total_amount) || 0,
                discount_amount: Number(order.discount_amount) || 0,
                notes: order.notes || "",
            });
            setDesignSpecs({
                collar: specs.collar || "",
                cuff: specs.cuff || "",
                pocket: specs.pocket || "",
                fitting: specs.fitting || "",
            });
        }
    }, [order, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!order) return;
        const specs = Object.fromEntries(Object.entries(designSpecs).filter(([_, v]) => v));
        const netAmount = form.total_amount - form.discount_amount;
        await updateOrder.mutateAsync({
            id: order.id,
            garment_type: form.garment_type,
            measurement_profile_id: form.measurement_profile_id || null,
            fabric_source: form.fabric_source,
            fabric_item_id: form.fabric_source === "inventory" && form.fabric_item_id ? form.fabric_item_id : null,
            assigned_tailor_id: form.assigned_tailor_id || null,
            delivery_date: form.delivery_date || null,
            delivery_type: form.delivery_type,
            priority: form.priority,
            total_amount: form.total_amount,
            discount_amount: form.discount_amount,
            net_amount: netAmount,
            balance_amount: netAmount - Number(order.advance_amount || 0),
            design_specifications: specs,
            notes: form.notes || null,
        });
        onOpenChange(false);
    };

    const set = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

    const matchingMeasurements = (measurements || []).filter((m: any) => m.garment_type === form.garment_type);

    const fabricItems = (inventoryItems || []).filter((item: any) => {
        const attrs = item.attributes || {};
        return item.unit === "meters" || item.unit === "yards" || attrs.type === "fabric";
    });

    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Edit Order {order.order_number}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Garment Type</Label>
                            <Select value={form.garment_type} onValueChange={(v) => set("garment_type", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {GARMENT_TYPES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Measurements</Label>
                            <Select value={form.measurement_profile_id} onValueChange={(v) => set("measurement_profile_id", v)}>
                                <SelectTrigger><SelectValue placeholder="Select profile" /></SelectTrigger>
                                <SelectContent>
                                    {matchingMeasurements.map((m: any) => (
                                        <SelectItem key={m.id} value={m.id}>{m.label || "Default"}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Fabric Source</Label>
                            <Select value={form.fabric_source} onValueChange={(v) => { set("fabric_source", v); if (v !== "inventory") set("fabric_item_id", ""); }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="inventory">From Inventory</SelectItem>
                                    <SelectItem value="customer_provided">Customer Provided</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {form.fabric_source === "inventory" && (
                            <div>
                                <Label>Select Fabric</Label>
                                <Select value={form.fabric_item_id} onValueChange={(v) => set("fabric_item_id", v)}>
                                    <SelectTrigger><SelectValue placeholder="Choose fabric" /></SelectTrigger>
                                    <SelectContent>
                                        {fabricItems.map((item: any) => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.item_code} — {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div>
                            <Label>Assign Tailor</Label>
                            <Select value={form.assigned_tailor_id} onValueChange={(v) => set("assigned_tailor_id", v)}>
                                <SelectTrigger><SelectValue placeholder="Select tailor" /></SelectTrigger>
                                <SelectContent>
                                    {(tailors || []).map((t: any) => (
                                        <SelectItem key={t.user_id} value={t.user_id}>
                                            {(t.profiles as any)?.full_name || "Tailor"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Priority</Label>
                            <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Delivery Date</Label>
                            <Input type="date" value={form.delivery_date} onChange={(e) => set("delivery_date", e.target.value)} />
                        </div>
                        <div>
                            <Label>Delivery Type</Label>
                            <Select value={form.delivery_type} onValueChange={(v) => set("delivery_type", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pickup">Pickup</SelectItem>
                                    <SelectItem value="home_delivery">Home Delivery</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Total Amount (₹)</Label>
                            <Input type="number" min="0" step="0.01" value={form.total_amount} onChange={(e) => set("total_amount", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                            <Label>Discount (₹)</Label>
                            <Input type="number" min="0" step="0.01" value={form.discount_amount} onChange={(e) => set("discount_amount", parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>

                    <div className="border rounded-lg p-4 space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground">Design Specifications</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(designSpecs).map(([key, value]) => (
                                <div key={key}>
                                    <Label className="text-xs capitalize">{key} Style</Label>
                                    <Input value={value} onChange={(e) => setDesignSpecs((p) => ({ ...p, [key]: e.target.value }))} placeholder={`e.g. Regular ${key}`} maxLength={100} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label>Notes</Label>
                        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} maxLength={1000} />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={updateOrder.isPending}>
                            {updateOrder.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
