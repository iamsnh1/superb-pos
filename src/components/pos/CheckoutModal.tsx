import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Send, CreditCard, Banknote, QrCode, Clock, User, Truck, CheckCircle2, Smartphone } from "lucide-react";

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (paymentDetails: any) => void;
    totalAmount: number;
    customerName: string;
}

const PAYMENT_METHODS = [
    { id: "cash",   label: "Cash",     icon: Banknote,    color: "bg-green-50 border-green-300 text-green-800" },
    { id: "upi",    label: "UPI",      icon: Smartphone,  color: "bg-blue-50 border-blue-300 text-blue-800" },
    { id: "card",   label: "Card",     icon: CreditCard,  color: "bg-purple-50 border-purple-300 text-purple-800" },
    { id: "online", label: "Online Transfer", icon: QrCode, color: "bg-orange-50 border-orange-300 text-orange-800" },
];

export function CheckoutModal({ isOpen, onClose, onConfirm, totalAmount, customerName }: CheckoutModalProps) {
    const [payments, setPayments] = useState([{ method: "cash", amount: "", ref: "" }]);
    const [discount, setDiscount] = useState("0");
    const [cgstPercent, setCgstPercent] = useState("0");
    const [sgstPercent, setSgstPercent] = useState("0");
    const [sendWhatsApp, setSendWhatsApp] = useState(false);

    const [deliveryDate, setDeliveryDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0];
    });
    const [trialDate, setTrialDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() + 4); return d.toISOString().split('T')[0];
    });
    const [deliveryType, setDeliveryType] = useState('pickup');

    // Reset whole modal when it opens
    useEffect(() => {
        if (isOpen) {
            setPayments([{ method: "cash", amount: "", ref: "" }]);
            setDiscount("0");
            setCgstPercent("0");
            setSgstPercent("0");
        }
    }, [isOpen]);

    const cgstRate = Math.max(0, Number(cgstPercent) || 0);
    const sgstRate = Math.max(0, Number(sgstPercent) || 0);
    const cgstAmount = totalAmount * (cgstRate / 100);
    const sgstAmount = totalAmount * (sgstRate / 100);
    const taxAmount = cgstAmount + sgstAmount;
    const grandTotal = totalAmount + taxAmount - Math.max(0, Number(discount) || 0);

    const advance = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const balance = grandTotal - advance;
    
    // Auto-calculate change for full-cash payments
    const cashTotal = payments.filter(p => p.method === "cash").reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const changeToReturn = 0; // Keeping 0 for now as advanced multi-tender doesn't perfectly calculate change against one specific row easily

    const canConfirm = advance >= 0 && payments.every(p => p.method);

    const handleConfirm = () => {
        if (!canConfirm) return;
        onConfirm({
            method: payments.length > 1 ? "multiple" : payments[0].method,
            reference: payments.length > 1 ? "Split Payment" : payments[0].ref,
            amount: advance,
            split_payment: payments.map(p => ({
                amount: Number(p.amount) || 0,
                method: p.method,
                reference: p.ref
            })),
            total_amount: grandTotal,
            balance,
            discount: Number(discount) || 0,
            tax_amount: taxAmount,
            cgst_rate: cgstRate,
            cgst_amount: cgstAmount,
            sgst_rate: sgstRate,
            sgst_amount: sgstAmount,
            send_whatsapp: sendWhatsApp,
            cashReceived: cashTotal,
            changeToReturn,
            delivery_date: deliveryDate,
            trial_date: trialDate,
            delivery_type: deliveryType,
        });
    };

    const addPayment = () => setPayments([...payments, { method: "cash", amount: "", ref: "" }]);
    const updatePayment = (index: number, key: string, value: string) => {
        const newP = [...payments];
        newP[index] = { ...newP[index], [key]: value };
        setPayments(newP);
    };
    const removePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl overflow-hidden p-0 gap-0 max-h-[90vh]">
                <div className="grid grid-cols-12 max-h-[85vh]">

                    {/* LEFT: Summary */}
                    <div className="col-span-5 bg-muted/30 p-6 border-r flex flex-col overflow-y-auto max-h-[85vh]">
                        <DialogHeader className="mb-5">
                            <DialogTitle>Order Summary</DialogTitle>
                            <DialogDescription>Customer: <span className="font-semibold text-foreground">{customerName}</span></DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 flex-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>₹{totalAmount.toFixed(2)}</span>
                            </div>

                            {/* GST */}
                            <div className="bg-background border rounded-lg p-3 space-y-2">
                                <p className="text-xs font-bold text-muted-foreground uppercase">GST (optional)</p>
                                <div className="flex justify-between items-center gap-2">
                                    <span className="text-muted-foreground w-14">CGST</span>
                                    <div className="flex items-center gap-1 ml-auto">
                                        <Input className="h-7 w-16 text-right px-2" value={cgstPercent} type="number" min="0" max="100" onChange={e => setCgstPercent(e.target.value)} />
                                        <span className="text-muted-foreground text-xs">% = ₹{cgstAmount.toFixed(0)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center gap-2">
                                    <span className="text-muted-foreground w-14">SGST</span>
                                    <div className="flex items-center gap-1 ml-auto">
                                        <Input className="h-7 w-16 text-right px-2" value={sgstPercent} type="number" min="0" max="100" onChange={e => setSgstPercent(e.target.value)} />
                                        <span className="text-muted-foreground text-xs">% = ₹{sgstAmount.toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Discount */}
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Discount</span>
                                <div className="flex items-center gap-1 w-28">
                                    <span className="text-muted-foreground">-₹</span>
                                    <Input className="h-7 px-1 text-right" value={discount} type="number" min="0" onChange={e => setDiscount(e.target.value)} />
                                </div>
                            </div>

                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Grand Total</span>
                                <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="mt-5 space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Trial / Fitting Date
                                </Label>
                                <Input type="date" value={trialDate} onChange={e => setTrialDate(e.target.value)} className="h-8 bg-background" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Final Delivery Date</Label>
                                <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="h-8 bg-background font-semibold" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Delivery Mode</Label>
                                <RadioGroup value={deliveryType} onValueChange={setDeliveryType} className="flex gap-4">
                                    <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="pickup" id="pickup" />
                                        <Label htmlFor="pickup" className="text-xs cursor-pointer flex items-center gap-1"><User className="w-3 h-3" /> Pickup</Label>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="home_delivery" id="home" />
                                        <Label htmlFor="home" className="text-xs cursor-pointer flex items-center gap-1"><Truck className="w-3 h-3" /> Home</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        {/* ===== MULTI TENDER PAYMENT ===== */}
                        <div className="bg-primary/5 p-4 rounded-lg space-y-2 mt-4 border border-primary/10">
                            <label className="text-xs font-bold uppercase text-primary tracking-wider">Collecting Now (Advance)</label>
                            <div className="text-xl font-bold">₹{advance.toFixed(2)}</div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Balance due later:</span>
                                <span className={`font-semibold ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>₹{balance.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Payment Config */}
                    <div className="col-span-7 p-6 flex flex-col bg-background overflow-y-auto max-h-[85vh]">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <CreditCard className="h-4 w-4" /> Collect Split Payments
                        </h3>

                        <div className="space-y-4 mb-6">
                            {payments.map((p, idx) => (
                                <div key={idx} className="bg-muted/10 border rounded-lg p-3 space-y-3 relative group">
                                    {payments.length > 1 && (
                                        <Button size="icon" variant="ghost" className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePayment(idx)}>
                                            ×
                                        </Button>
                                    )}
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-muted-foreground">Amount Received</Label>
                                            <Input autoFocus={idx === 0} type="number" min="0" placeholder="0.00" value={p.amount} onChange={e => updatePayment(idx, 'amount', e.target.value)} className="h-10 text-lg font-bold" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-muted-foreground">Method</Label>
                                            <select 
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={p.method}
                                                onChange={e => updatePayment(idx, 'method', e.target.value)}
                                            >
                                                {PAYMENT_METHODS.map(pm => (
                                                    <option key={pm.id} value={pm.id}>{pm.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {p.method !== 'cash' && (
                                        <div className="space-y-1.5 pt-1">
                                            <Label className="text-xs font-bold text-muted-foreground">Reference No. (UTR/Card Last 4)</Label>
                                            <Input placeholder="Reference" value={p.ref} onChange={e => updatePayment(idx, 'ref', e.target.value)} className="h-9 font-mono text-sm" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            <Button variant="outline" className="w-full text-xs font-semibold uppercase tracking-wider h-10 border-dashed" onClick={addPayment}>
                                + Add Another Payment Method
                            </Button>
                        </div>

                        {/* Summary of what's being recorded */}
                        <div className="border rounded-lg p-3 bg-muted/20 text-xs text-muted-foreground mb-4">
                            <p className="font-semibold text-foreground mb-1">Recording:</p>
                            <p>Taking <strong>₹{advance.toFixed(2)}</strong> via {payments.length} payment method(s) today.</p>
                        </div>

                        {/* WhatsApp */}
                        <div
                            className="flex items-center space-x-3 border p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => setSendWhatsApp(!sendWhatsApp)}
                        >
                            <Checkbox id="whatsapp" checked={sendWhatsApp} onCheckedChange={c => setSendWhatsApp(!!c)} />
                            <div className="flex-1">
                                <label htmlFor="whatsapp" className="text-sm font-medium cursor-pointer">Send Receipt via WhatsApp</label>
                                <p className="text-xs text-muted-foreground">Customer gets a receipt and tracking link.</p>
                            </div>
                            <Send className="h-4 w-4 text-green-600" />
                        </div>

                        <DialogFooter className="mt-5 gap-2">
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button
                                className="flex-1 text-base font-bold"
                                onClick={handleConfirm}
                                disabled={!canConfirm}
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                Confirm & Print Receipt
                            </Button>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
