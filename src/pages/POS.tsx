import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2, UserPlus, ShoppingCart, CreditCard, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CheckoutModal } from "@/components/pos/CheckoutModal";
import { NewCustomerModal } from "@/components/pos/NewCustomerModal";
import { ItemDetailsModal } from "@/components/pos/ItemDetailsModal";
import { CustomItemModal } from "@/components/pos/CustomItemModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { useGarmentTemplates } from "@/hooks/useTemplates";

type Customer = {
    id: number;
    full_name: string;
    customer_code: string;
    phone: string;
    email: string;
    customer_group?: string;
};

type OrderItem = {
    id: string; // temp id
    garment_type: string;
    style?: string;
    fabric_source: 'inventory' | 'customer';
    fabric_id?: number;
    fabric_name?: string;
    price: number;
    qty: number;
    // New fields
    measurements?: Record<string, number>;
    measurement_label?: string;
    measurement_profile_id?: number | null;
    design_notes?: string;
    notes?: string;
};

export default function POS() {
    const queryClient = useQueryClient();
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);

    // Item configuration
    const [configItem, setConfigItem] = useState<any>(null); // Temp item being configured
    const [isItemDetailsOpen, setIsItemDetailsOpen] = useState(false);
    const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null); // ID of cart item being edited
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);

    // Search Customers
    const { data: customers } = useQuery({
        queryKey: ['customers', searchQuery],
        queryFn: async () => {
            if (!searchQuery) return [];
            const res = await api.get<{ customers: Customer[] }>(`/customers?search=${searchQuery}`);
            return res.customers; // api.get returns parsed JSON directly
        },
        enabled: searchQuery.length > 2
    });

    const { data: garmentTemplates } = useGarmentTemplates();

    const initiateAddItem = (templateItem: any) => {
        if (!selectedCustomer) {
            toast.error("Please select a customer first");
            return;
        }
        setConfigItem(templateItem);
        setIsItemDetailsOpen(true);
    };

    const handleConfirmItem = (configuredItem: any) => {
        // configuredItem comes from modal with price, qty, measurements, etc.
        const newItem: OrderItem = {
            id: Math.random().toString(),
            garment_type: configuredItem.garment_type,
            style: configuredItem.style || '',
            fabric_source: 'inventory', // Default for now
            price: configuredItem.price,
            qty: configuredItem.qty,
            measurements: configuredItem.measurements,
            measurement_label: configuredItem.measurement_label,
            measurement_profile_id: configuredItem.measurement_profile_id,
            design_notes: configuredItem.design_notes,
            notes: configuredItem.notes
        };

        if (editingItemId) {
            // Update existing cart item
            setCart(cart.map(i => i.id === editingItemId ? { ...newItem, id: editingItemId } : i));
            toast.success(`${newItem.garment_type} updated`);
        } else {
            setCart([...cart, newItem]);
            toast.success(`${newItem.garment_type} added to cart`);
        }
        setConfigItem(null);
        setEditingItemId(null);
        setIsItemDetailsOpen(false);
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(i => i.id !== id));
    };

    const handleEditItem = (item: OrderItem) => {
        setConfigItem({
            garment_type: item.garment_type,
            price: item.price,
            qty: item.qty,
            style: item.style,
            measurements: item.measurements,
            measurement_label: item.measurement_label,
            measurement_profile_id: item.measurement_profile_id,
            design_notes: item.design_notes,
            notes: item.notes,
        });
        setEditingItemId(item.id);
        setIsItemDetailsOpen(true);
    };

    const calculateTotal = () => {
        return cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    };

    const handleCheckout = async (paymentDetails: any) => {
        if (!selectedCustomer) return;

        try {
            const payload = {
                customer_id: selectedCustomer.id,
                items: cart.map(item => ({
                    garment_type: item.garment_type,
                    style: item.style || '',
                    qty: item.qty,
                    fabric_source: item.fabric_source,
                    fabric_item_id: item.fabric_id,
                    price: item.price,
                    notes: item.notes,
                    design_specifications: item.design_notes,
                    measurements: item.measurements,
                    measurement_profile_id: item.measurement_profile_id,
                    delivery_date: paymentDetails.delivery_date,
                    trial_date: paymentDetails.trial_date,
                    delivery_type: paymentDetails.delivery_type
                })),
                payment: {
                    method: paymentDetails.method,
                    amount: paymentDetails.amount,
                    reference: paymentDetails.reference || null,
                },
                advance_amount: paymentDetails.amount,
                grand_total: paymentDetails.total_amount,
                discount_total: paymentDetails.discount,
                tax_total: paymentDetails.tax_amount || 0,
                cgst_rate: paymentDetails.cgst_rate || 0,
                cgst_amount: paymentDetails.cgst_amount || 0,
                sgst_rate: paymentDetails.sgst_rate || 0,
                sgst_amount: paymentDetails.sgst_amount || 0,
                trial_date: paymentDetails.trial_date,
                delivery_type: paymentDetails.delivery_type,
                notes: paymentDetails.send_whatsapp ? "WhatsApp Receipt Requested" : ""
            };

            console.log('Sending payload:', JSON.stringify(payload, null, 2));
            const res = await api.post('/pos/transaction', payload);
            console.log('Response:', res);

            if (res.success) {
                toast.success(`Order Placed! Invoice: ${res.invoiceNumber}`);
                queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
                queryClient.invalidateQueries({ queryKey: ["manufacturing-orders"] });
                queryClient.invalidateQueries({ queryKey: ["measurements"] });
                setReceiptData({
                    customer_name: selectedCustomer.full_name,
                    customer_phone: selectedCustomer.phone,
                    invoiceNumber: res.invoiceNumber,
                    id: res.invoiceId,
                    items: payload.items.map((item: any) => ({
                        garment_type: item.garment_type,
                        style: item.style || '',
                        qty: item.qty,
                        price: item.price,
                        design_specifications: item.design_specifications,
                        measurements: item.measurements,
                        trial_date: item.trial_date,
                        delivery_date: item.delivery_date,
                    })),
                    grand_total: paymentDetails.total_amount,
                    advance_amount: paymentDetails.amount,
                    discount_amount: paymentDetails.discount || 0,
                    tax_amount: paymentDetails.tax_amount || 0,
                    cgst_rate: paymentDetails.cgst_rate || 0,
                    cgst_amount: paymentDetails.cgst_amount || 0,
                    sgst_rate: paymentDetails.sgst_rate || 0,
                    sgst_amount: paymentDetails.sgst_amount || 0,
                    payment_method: paymentDetails.method,
                    payment_reference: paymentDetails.reference || null,
                });
                setCart([]);
                setSelectedCustomer(null);
                setIsPaymentModalOpen(false);
                setIsReceiptModalOpen(true);
            } else {
                toast.error("Transaction failed: " + (res.error || "Unknown error"));
            }
        } catch (err: any) {
            console.error('Checkout error:', err);
            toast.error("Failed to process transaction: " + (err.message || "Unknown error"));
        }
    };

    return (
        <AppLayout>
            <div className="min-h-[calc(100vh-4rem)] flex flex-col gap-4 pb-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card/50 p-4 rounded-xl border backdrop-blur-sm shrink-0">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight">Point of Sale</h1>
                        <p className="text-muted-foreground text-sm">New Transaction • {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-left sm:text-right">
                            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Branch</div>
                            <div className="font-semibold text-sm">Main Branch</div>
                        </div>
                        <div className="h-8 w-px bg-border hidden sm:block" />
                        <div className="text-left sm:text-right">
                            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Operator</div>
                            <div className="font-semibold text-sm">User</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden">
                    {/* LEFT: Workflow */}
                    <div className="lg:col-span-8 flex flex-col gap-4 overflow-y-auto min-h-0 order-2 lg:order-1">

                        {/* 1. Customer Selection */}
                        {!selectedCustomer ? (
                            <Card className="border-2 border-dashed border-primary/20 bg-primary/5 shadow-none">
                                <CardContent className="flex flex-col items-center justify-center p-12 text-center gap-6">
                                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                                        <Search className="h-10 w-10 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-semibold mb-2">Select Customer</h3>
                                        <p className="text-muted-foreground max-w-md mx-auto">
                                            Search for an existing customer by name, phone, or ID to start a new order.
                                        </p>
                                    </div>

                                    <div className="w-full max-w-md mx-auto space-y-4">
                                        {/* Search Input with floating dropdown */}
                                        <div className="relative">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search Bill # or customer (Rajesh / 9876...)"
                                                    className="pl-10 h-12 text-lg shadow-sm"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>

                                            {/* Search Results Dropdown — anchored to input, floats above layout */}
                                            {customers && customers.length > 0 && searchQuery && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-xl z-50 overflow-hidden">
                                                    {customers.map((c: any) => (
                                                        <div
                                                            key={c.id}
                                                            className="p-3 hover:bg-accent cursor-pointer flex justify-between items-center border-b last:border-0 transition-colors"
                                                            onClick={() => { setSelectedCustomer(c); setSearchQuery(""); }}
                                                        >
                                                            <div>
                                                                <div className="font-semibold">{c.full_name}</div>
                                                                <div className="text-xs text-muted-foreground">{c.phone} • {c.customer_code}</div>
                                                            </div>
                                                            <Badge variant="outline">{c.customer_group || 'Regular'}</Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative flex items-center justify-center">
                                            <span className="bg-background px-2 text-xs text-muted-foreground z-10">OR</span>
                                            <Separator className="absolute w-full" />
                                        </div>

                                        <Button
                                            variant="outline"
                                            className="w-full h-12 border-primary/20 hover:bg-primary/5 hover:border-primary"
                                            onClick={() => setIsNewCustomerModalOpen(true)}
                                        >
                                            <UserPlus className="mr-2 h-5 w-5" /> Register New Customer
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shadow-sm">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                                        {selectedCustomer.full_name[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-lg truncate">{selectedCustomer.full_name}</h3>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                                            <span>{selectedCustomer.customer_code}</span>
                                            <span className="hidden sm:inline">•</span>
                                            <span>{selectedCustomer.phone}</span>
                                            <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-200">Gold Member</Badge>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)} className="text-muted-foreground hover:text-destructive self-start sm:self-auto shrink-0">
                                    Change Customer
                                </Button>
                            </div>
                        )}

                        {/* 2. Order Builder */}
                        {selectedCustomer && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <span className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs">2</span>
                                        Add Items
                                    </h3>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                                        {(garmentTemplates || []).filter((t: any) => t.is_active !== 0).map((template) => {
                                            const getIcon = (name: string) => {
                                                const n = name.toLowerCase();
                                                if (n.includes('shirt')) return '👔';
                                                if (n.includes('pant') || n.includes('trouser')) return '👖';
                                                if (n.includes('suit')) return '🕴️';
                                                if (n.includes('kurta')) return '👘';
                                                if (n.includes('sherwani')) return '🤴';
                                                if (n.includes('waistcoat') || n.includes('jacket')) return '🧥';
                                                if (n.includes('blouse')) return '👚';
                                                return '✂️';
                                            };
                                            return (
                                                <Button
                                                    key={template.id}
                                                    variant="outline"
                                                    className="h-20 sm:h-24 flex flex-col gap-1 sm:gap-2 hover:bg-primary/5 hover:border-primary border-2 border-transparent hover:scale-[1.02] transition-all bg-card shadow-sm"
                                                    onClick={() => initiateAddItem({
                                                        garment_type: template.name,
                                                        price: template.base_price || 0
                                                    })}
                                                >
                                                    <span className="text-3xl">{getIcon(template.name)}</span>
                                                    <span className="font-semibold">{template.name}</span>
                                                </Button>
                                            );
                                        })}
                                        <Button
                                            variant="outline"
                                            className="h-24 flex flex-col gap-2 border-dashed border-2"
                                            onClick={() => setIsCustomItemOpen(true)}
                                        >
                                            <Plus className="h-8 w-8 text-muted-foreground" />
                                            <span className="text-muted-foreground">Custom</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* Recent or Pending Items can go here */}
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Cart & Payment */}
                    <div className="lg:col-span-4 flex flex-col min-h-[320px] lg:min-h-0 lg:h-full bg-card/60 backdrop-blur-xl border rounded-xl overflow-hidden shadow-2xl order-1 lg:order-2">
                        <div className="p-4 bg-primary/90 text-primary-foreground shadow-lg">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5" /> Current Order
                                </h3>
                                <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                                    {cart.length} Items
                                </Badge>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gradient-to-b from-transparent to-muted/20">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 p-8 text-center">
                                    <ShoppingCart className="h-16 w-16 mb-4 opacity-20" />
                                    <p className="text-lg font-medium">Cart is empty</p>
                                    <p className="text-sm">Select items from the left to add them here.</p>
                                </div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={item.id} className="group flex flex-col bg-background border rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden relative">
                                        <div className="p-3 flex gap-3">
                                            <div className="h-12 w-12 bg-secondary/50 rounded-md flex items-center justify-center text-xl shrink-0">
                                                {item.garment_type === 'Shirt' ? '👔' : '👖'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold truncate">{item.garment_type}</span>
                                                    <span className="font-bold">₹{item.price}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1 rounded-sm">Stitching</Badge>
                                                    {item.measurement_label && (
                                                        <span className="font-semibold text-primary">{item.measurement_label}</span>
                                                    )}
                                                </div>
                                                {item.design_notes && (
                                                    <div className="text-[10px] text-muted-foreground truncate max-w-[200px] mt-1 italic">
                                                        "{item.design_notes}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="px-3 pb-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity bg-muted/20 py-1">
                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-primary" onClick={() => handleEditItem(item)}>Edit Details</Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                                onClick={() => removeFromCart(item.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-5 bg-card border-t shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-10 space-y-4">
                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground font-medium">Subtotal</span>
                                    <span>₹{calculateTotal().toFixed(2)}</span>
                                </div>
                                {/* Tax and Discount will be handled in checkout modal visual mostly, but we can show placeholders or real time if we move state up */}
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Tax (GST)</span>
                                    <span>Calculated at Checkout</span>
                                </div>
                            </div>

                            <Separator className="bg-border/60" />

                            <div className="flex justify-between items-end">
                                <span className="font-bold text-lg text-muted-foreground">Total</span>
                                <span className="font-bold text-3xl tracking-tight text-primary">₹{calculateTotal().toFixed(2)}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button variant="outline" className="h-12 border-primary/20 text-primary hover:bg-primary/5">
                                    <Save className="mr-2 h-4 w-4" />
                                    Draft
                                </Button>
                                <Button
                                    size="lg"
                                    className="h-12 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                                    disabled={cart.length === 0 || !selectedCustomer}
                                    onClick={() => setIsPaymentModalOpen(true)}
                                >
                                    <CreditCard className="mr-2 h-5 w-5" />
                                    Checkout
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {selectedCustomer && (
                    <CheckoutModal
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        onConfirm={handleCheckout}
                        totalAmount={calculateTotal()}
                        customerName={selectedCustomer.full_name}
                    />
                )}

                <NewCustomerModal
                    open={isNewCustomerModalOpen}
                    onOpenChange={setIsNewCustomerModalOpen}
                    onSuccess={(customer) => {
                        setSelectedCustomer(customer);
                        toast.success(`Customer ${customer.full_name} registered!`);
                    }}
                />

                <ReceiptModal
                    open={isReceiptModalOpen}
                    onOpenChange={setIsReceiptModalOpen}
                    orderData={receiptData}
                    onNewOrder={() => {
                        setIsReceiptModalOpen(false);
                        // Optionally reset receiptData if needed, or keep it for re-opening
                        setReceiptData(null);
                    }}
                />

                <ItemDetailsModal
                    open={isItemDetailsOpen}
                    onOpenChange={(o) => { setIsItemDetailsOpen(o); if (!o) setEditingItemId(null); }}
                    customer={selectedCustomer}
                    initialItem={configItem}
                    onConfirm={handleConfirmItem}
                    isEditing={!!editingItemId}
                />

                <CustomItemModal
                    open={isCustomItemOpen}
                    onOpenChange={setIsCustomItemOpen}
                    onConfirm={(customItem) => {
                        // When custom item is created, open the item details modal with it
                        initiateAddItem({
                            garment_type: customItem.garment_type,
                            price: customItem.price,
                            notes: customItem.notes
                        });
                    }}
                />
            </div>
        </AppLayout>
    );
}
