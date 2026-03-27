import React, { useState } from "react";
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
                <div className="bg-white printable-content text-black font-sans w-full p-2 print:p-0">
                    {/* Header */}
                    <div className="flex flex-col items-start mb-4 text-left">
                        <img
                            src="/bill-header.png"
                            alt="SUPERB"
                            className="h-[50px] object-contain mb-1"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const p = document.createElement('p');
                                p.className = 'font-black text-4xl tracking-widest text-black uppercase mb-1';
                                p.textContent = 'SUPERB';
                                (e.target as HTMLImageElement).parentNode?.insertBefore(p, (e.target as HTMLImageElement).nextSibling);
                            }}
                        />
                        <div className="text-[12px] tracking-wide font-medium">33,chandralok complex, Sarojini devi road, secunderabad</div>
                        <div className="text-[12px] tracking-wider font-medium uppercase mt-0.5">PH: 9246215215</div>
                    </div>

                    {/* Pure 2-Column Layout */}
                    <div className="flex w-full mt-4 items-stretch">
                        
                        {/* Left Column (Meta + Note) */}
                        <div className="w-1/2 flex flex-col gap-1.5 text-[13px] uppercase font-medium pr-2 justify-between">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex gap-2">
                                    <div className="w-36 whitespace-nowrap">BILL NO : <span className="ml-1">{orderData.invoiceNumber}</span></div>
                                    <div className="whitespace-nowrap">DATE : <span className="ml-1">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, '-').toLowerCase()}</span></div>
                                </div>
                                
                                <div className="whitespace-nowrap">
                                    DUE DATE : <span className="ml-1">{orderData.items?.[0]?.delivery_date ? new Date(orderData.items[0].delivery_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, '-').toLowerCase() : ''}</span>
                                </div>

                                <div className="whitespace-nowrap">
                                    CLIENT NAME : <span className="font-bold ml-1 uppercase">{orderData.customer_name || "GUEST"}</span>
                                </div>

                                <div className="whitespace-nowrap mb-6">
                                    PHONE NO : <span className="ml-1 tracking-wider">{orderData.customer_phone || ""}</span>
                                </div>
                            </div>

                            <div className="pr-2 text-[12px] leading-relaxed normal-case tracking-wide">
                                <span className="font-bold underline text-[13px] italic">Note</span> <span className="italic">: Please bring this bill on the due date.</span><br/>
                                <span className="italic">delivery will be made after 7.00 p.m. If delivery is not</span><br/>
                                <span className="italic">taken within 30 days from due date, the firm is not</span><br/>
                                <span className="italic">responsible for any damages to the clothes.</span>
                            </div>
                        </div>

                        {/* Right Column (Items + Total + Sign) */}
                        <div className="w-1/2 flex flex-col text-[13px] uppercase pl-4 pr-10 font-medium justify-start">
                            <div className="flex flex-col">
                                <div className="grid grid-cols-[1fr_40px_20px_50px] gap-x-3 gap-y-1.5 w-full text-right mb-4">
                                    {orderData.items?.map((item: any, i: number) => (
                                        <React.Fragment key={i}>
                                            <div className="text-left whitespace-nowrap overflow-hidden text-ellipsis">
                                                {item.garment_type}
                                            </div>
                                            <div className="text-left whitespace-nowrap">{item.price}</div>
                                            <div className="w-[20px] text-center whitespace-nowrap">{item.qty || 1}</div>
                                            <div className="w-[50px] text-right whitespace-nowrap">{item.price * (item.qty || 1)}</div>
                                        </React.Fragment>
                                    ))}
                                    
                                    {/* Total Box Locked Exactly to QTY and AMOUNT cols */}
                                    <div className="col-start-3 col-span-2 border-t border-b border-black text-right py-1.5 mt-2 leading-none">
                                        {grandTotal}
                                    </div>
                                </div>
                            </div>

                            <div className={`flex items-end uppercase pb-1 mt-6 ${(orderData.cgst_amount > 0 || orderData.sgst_amount > 0) ? "justify-between" : "justify-end"}`}>
                                {(orderData.cgst_amount > 0 || orderData.sgst_amount > 0) && (
                                    <div className="flex flex-col gap-1.5 whitespace-nowrap text-[12px]">
                                        {orderData.cgst_amount > 0 && <div>CGST {orderData.cgst_rate ? `${orderData.cgst_rate}%` : '%'}</div>}
                                        {orderData.sgst_amount > 0 && <div>SGST {orderData.sgst_rate ? `${orderData.sgst_rate}%` : '%'}</div>}
                                    </div>
                                )}
                                <div className="flex gap-4 items-end ml-4 whitespace-nowrap text-[13px]">
                                    <span className="mb-0.5">SIGN</span>
                                    <div className="w-32 border-b border-black h-4"></div>
                                </div>
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