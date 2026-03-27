import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle2, ShoppingBag, Send, Eye, EyeOff, FileDown } from "lucide-react";
import { formatCurrency, formatPhoneForWhatsApp } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface ReceiptModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderData: any;
    onNewOrder: () => void;
}

export function ReceiptModal({ open, onOpenChange, orderData, onNewOrder }: ReceiptModalProps) {
    const { data: settings } = useSettings();
    const [showMeasurements, setShowMeasurements] = useState(true);
    if (!orderData) return null;

    const printBill = () => {
        const el = document.querySelector('.printable-content') as HTMLElement;
        if (!el) return;

        let iframe = document.getElementById('printArea') as HTMLIFrameElement;
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'printArea';
            iframe.style.position = 'absolute';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);
        }

        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(s => s.outerHTML)
            .join('\n');

        const iframeDoc = iframe.contentWindow?.document;
        if (!iframeDoc) { window.print(); return; }

        iframeDoc.open();
        iframeDoc.write(`
<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Bill - ${orderData.invoiceNumber}</title>
${styles}
<style>
  body { background: white !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; width: 100% !important; }
  .printable-content { border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 10px !important; }
  @media print {
    @page { size: A4 portrait; margin: 10mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    ::-webkit-scrollbar { display: none; }
  }
  img { max-height: 80px !important; width: auto !important; }
</style>
</head><body>
<div class="printable-content">${el.innerHTML}</div>
</body></html>`);
        iframeDoc.close();

        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        }, 500);
    };

    const handleSavePdf = async () => {
        const savePdf = typeof window !== "undefined" && (window as any).electron?.saveAsPdf;
        if (savePdf) {
            const filename = `bill-${orderData.invoiceNumber || "receipt"}.pdf`;
            const result = await savePdf(filename);
            if (result?.ok) { toast.success(`Bill saved as PDF`); }
            else if (result?.error) { toast.error(result.error); }
        } else {
            printBill();
        }
    };

    const handleWhatsApp = () => {
        const phone = formatPhoneForWhatsApp(orderData.customer_phone || '');
        if (!phone || phone.length < 10) {
            toast.error("Customer phone number not found or invalid.");
            return;
        }
        const businessName = settings?.business_name || "Superb Tailors";
        let message = `*Receipt from ${businessName}*\n`;
        message += `Invoice: ${orderData.invoiceNumber}\n`;
        message += `Customer: ${orderData.customer_name}\n`;
        message += `--------------------------\n`;
        orderData.items?.forEach((item: any) => {
            message += `*${item.garment_type}* (Qty: ${item.qty || 1}) - ${formatCurrency(item.price * (item.qty || 1))}\n`;
            if (showMeasurements && item.measurements && Object.keys(item.measurements).length > 0) {
                Object.entries(item.measurements).forEach(([key, val]) => {
                    message += `- ${key}: ${val}\n`;
                });
            }
            if (item.design_specifications) message += `_Note: ${item.design_specifications}_\n`;
            message += `\n`;
        });
        message += `--------------------------\n`;
        if (orderData.discount_amount > 0) message += `Discount: -${formatCurrency(orderData.discount_amount)}\n`;
        if (orderData.tax_amount > 0) message += `Tax: +${formatCurrency(orderData.tax_amount)}\n`;
        message += `*Grand Total: ${formatCurrency(orderData.grand_total)}*\n`;
        message += `Advance Paid: ${formatCurrency(orderData.advance_amount)}\n`;
        
        if (orderData.split_payment && orderData.split_payment.length > 0) {
            message += `_(${orderData.split_payment.map((p:any) => `${formatCurrency(p.amount)} via ${p.method.toUpperCase()}`).join(', ')})_\n`;
        } else if (orderData.payment_method) {
            message += `_(${orderData.payment_method.toUpperCase()})_\n`;
        }

        message += `Balance Due: ${formatCurrency(orderData.grand_total - orderData.advance_amount)}\n\n`;
        message += `Thank you for choosing ${businessName}!`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleSendBillPdfWhatsApp = async () => {
        const phone = formatPhoneForWhatsApp(orderData.customer_phone || '');
        if (!phone || phone.length < 10) {
            toast.error("Customer phone number not found.");
            return;
        }
        const businessName = settings?.business_name || "Superb Tailors";
        const pdfMessage = `Hi, please find your bill attached. Thank you - ${businessName}`;

        // Open WhatsApp immediately (synchronous) to bypass popup blocker
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(pdfMessage)}`, '_blank');

        const savePdfForWa = typeof window !== "undefined" && (window as any).electron?.savePdfForWhatsApp;
        if (savePdfForWa) {
            const filename = `bill-${orderData.invoiceNumber || "receipt"}`;
            const result = await savePdfForWa(filename);
            if (result?.ok) {
                toast.success("PDF saved to Downloads. Attach it in WhatsApp to send.");
            } else {
                toast.info("Could not auto-save PDF. Please use Print → Save as PDF and attach manually.");
            }
        } else {
            toast.info("Tip: Use Print → Save as PDF and attach it in WhatsApp.");
        }
    };

    const subtotal = orderData.items?.reduce((s: number, i: any) => s + (i.price || 0), 0) ?? 0;
    const discountAmt = orderData.discount_amount || 0;
    const taxAmt = orderData.tax_amount || 0;
    const taxRate = orderData.tax_rate || 0;
    const grandTotal = orderData.grand_total || 0;
    const advancePaid = orderData.advance_amount || 0;
    const balanceDue = grandTotal - advancePaid;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
                <div className="text-center py-3 no-print flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                    <DialogTitle className="text-xl font-bold">Checkout Successful!</DialogTitle>
                    <p className="text-muted-foreground text-sm">Order placed. Bill is ready.</p>
                    <Button variant="ghost" size="sm" onClick={() => setShowMeasurements(!showMeasurements)} className="text-primary hover:text-primary hover:bg-primary/5">
                        {showMeasurements ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                        {showMeasurements ? "Hide Measurements from Bill" : "Show Measurements on Bill"}
                    </Button>
                </div>

                {/* ======== PREMIUM BILL DESIGN ======== */}
                <div className="bg-white printable-content text-slate-900 font-sans border border-slate-200 rounded-xl overflow-hidden shadow-sm print:shadow-none print:border-none print:rounded-none">

                    {/* Header */}
                    <div className="px-6 py-4 border-b-2 border-slate-800 flex items-start justify-between bg-white">
                        <div className="flex items-center gap-3">
                            <div>
                                <img
                                    src="/bill-header.png"
                                    alt="SUPERB"
                                    className="h-12 object-contain object-left"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        const p = document.createElement('p');
                                        p.className = 'font-black text-2xl tracking-widest text-slate-900';
                                        p.textContent = 'SUPERB';
                                        (e.target as HTMLImageElement).parentNode?.insertBefore(p, (e.target as HTMLImageElement).nextSibling);
                                    }}
                                />
                                <p className="text-slate-600 text-[10px] uppercase tracking-widest mt-0.5">33, Chandralok Complex, Sarojini Devi Road, Secunderabad</p>
                            </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                            <div className="p-1 border border-slate-200 rounded-lg bg-white shadow-sm">
                                <QRCodeSVG value={orderData.order_number || ""} size={52} level="M" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-[9px] uppercase tracking-wider">Order No</p>
                                <p className="text-slate-900 font-mono font-bold text-xs">{orderData.order_number}</p>
                            </div>
                        </div>
                    </div>

                    {/* Bill meta */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                            <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Bill No</p>
                            <p className="font-bold text-red-600 text-base">{orderData.invoiceNumber}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Date</p>
                            <p className="font-semibold text-sm">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Trial Date</p>
                            <p className="font-semibold text-sm">{orderData.items?.[0]?.trial_date ? new Date(orderData.items[0].trial_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Due Date</p>
                            <p className="font-bold text-sm text-slate-800">{orderData.items?.[0]?.delivery_date ? new Date(orderData.items[0].delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
                        </div>
                    </div>

                    {/* Customer */}
                    <div className="px-6 py-3 border-b border-slate-200 flex flex-wrap gap-6 text-sm">
                        <div>
                            <p className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Client Name</p>
                            <p className="font-bold text-base uppercase">{orderData.customer_name || "Guest"}</p>
                        </div>
                        {orderData.customer_phone && (
                            <div>
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Phone</p>
                                <p className="font-medium font-mono">{orderData.customer_phone}</p>
                            </div>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="px-6 py-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-900 text-left text-[10px] uppercase tracking-wider text-slate-500">
                                    <th className="pb-2 w-8 font-semibold">#</th>
                                    <th className="pb-2 font-semibold">Garment</th>
                                    <th className="pb-2 font-semibold">Type / Style</th>
                                    <th className="pb-2 font-semibold text-center w-12">Qty</th>
                                    <th className="pb-2 font-semibold text-right w-20">Rate</th>
                                    <th className="pb-2 font-semibold text-right w-24">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderData.items?.map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-dashed border-slate-100">
                                        <td className="py-2.5 align-top text-slate-400 text-xs">{i + 1}</td>
                                        <td className="py-2.5 pr-2 align-top font-bold uppercase text-slate-900 tracking-wide">{item.garment_type}</td>
                                        <td className="py-2.5 pr-2 align-top text-slate-700">
                                            <div>{item.style || '—'}</div>
                                            {showMeasurements && item.measurements && Object.keys(item.measurements).length > 0 && (
                                                <div className="mt-1 text-[10px] text-slate-500 grid grid-cols-3 gap-x-4 gap-y-0.5">
                                                    {Object.entries(item.measurements).map(([k, v]) => (
                                                        <span key={k}><span className="capitalize">{k.replace(/_/g, ' ')}</span>: <strong>{String(v)}</strong></span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-2.5 align-top text-center font-medium text-slate-800">{item.qty || 1}</td>
                                        <td className="py-2.5 align-top text-right text-slate-500 text-xs">{formatCurrency(item.price)}</td>
                                        <td className="py-2.5 align-top text-right font-semibold text-slate-800">{formatCurrency(item.price * (item.qty || 1))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="px-6 py-4 flex justify-between gap-8 border-t border-slate-100">
                        <div className="flex-1 text-[10px] text-slate-500 leading-relaxed max-w-[50%]">
                            <p className="font-bold text-slate-700 text-xs mb-1 italic">Note:</p>
                            <p>Please bring this bill with you on the due date. Delivery will be made after 7.00 p.m. If delivery is not taken within 30 days from due date, the firm is not responsible for any damages to the clothes.</p>
                        </div>
                        <div className="w-56 space-y-1.5 text-sm border-l border-slate-900 pl-6">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            {discountAmt > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Discount</span>
                                    <span>−{formatCurrency(discountAmt)}</span>
                                </div>
                            )}
                            {orderData.cgst_amount > 0 && (
                                <div className="flex justify-between text-slate-500 text-xs italic">
                                    <span>CGST ({orderData.cgst_rate}%)</span>
                                    <span>+{formatCurrency(orderData.cgst_amount)}</span>
                                </div>
                            )}
                            {orderData.sgst_amount > 0 && (
                                <div className="flex justify-between text-slate-500 text-xs italic">
                                    <span>SGST ({orderData.sgst_rate}%)</span>
                                    <span>+{formatCurrency(orderData.sgst_amount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-base border-t border-slate-900 pt-2 mt-2">
                                <span>Total</span>
                                <span>{formatCurrency(grandTotal)}</span>
                            </div>
                            
                            <div className="flex flex-col gap-1 border-t border-slate-200 pt-2 mt-2">
                                <div className="flex justify-between text-slate-800 font-semibold">
                                    <span>Advance Paid</span>
                                    <span>{formatCurrency(advancePaid)}</span>
                                </div>
                                {orderData.split_payment && orderData.split_payment.length > 0 ? (
                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                        {orderData.split_payment.map((p: any, idx: number) => (
                                            <div key={idx} className="flex justify-between text-[10px] text-slate-500 italic">
                                                <span>— {p.method.toUpperCase()}</span>
                                                <span>{formatCurrency(p.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex justify-between text-[10px] text-slate-500 italic">
                                        <span>— {(orderData.payment_method || 'cash').toUpperCase()}</span>
                                        <span>{formatCurrency(advancePaid)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between font-black text-base text-red-600 border-t-2 border-slate-900 pt-2 mt-2 bg-slate-50 p-1.5 -mx-1.5 -mb-1.5">
                                <span>Balance</span>
                                <span>{formatCurrency(balanceDue)}</span>
                            </div>

                            <div className="flex justify-between text-slate-500 text-xs pt-6">
                                <span className="uppercase tracking-widest text-[9px]">Sign</span>
                                <span className="border-b border-slate-300 w-24"></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 mt-4 no-print">
                    <Button variant="outline" className="text-sm" onClick={onNewOrder}>
                        <ShoppingBag className="mr-2 h-4 w-4 shrink-0" /> New Order
                    </Button>
                    <Button variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 text-sm" onClick={handleWhatsApp}>
                        <Send className="mr-2 h-4 w-4 shrink-0" /> Send Text
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white text-sm" onClick={handleSendBillPdfWhatsApp}>
                        <Send className="mr-2 h-4 w-4 shrink-0" /> Bill → WhatsApp
                    </Button>
                    <Button variant="outline" className="text-sm" onClick={handleSavePdf}>
                        <FileDown className="mr-2 h-4 w-4 shrink-0" /> Save PDF
                    </Button>
                    <Button className="col-span-2 text-sm font-bold" onClick={printBill}>
                        <Printer className="mr-2 h-4 w-4 shrink-0" /> Print Bill
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}