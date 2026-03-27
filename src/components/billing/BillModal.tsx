import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, Send, Scissors } from "lucide-react";
import { formatCurrency, formatPhoneForWhatsApp } from "@/lib/utils";
import { toast } from "sonner";

interface BillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billData: {
    invoiceNumber: string;
    customer_name: string;
    customer_phone?: string;
    items: { garment_type: string; price: number; qty?: number; design_specifications?: string; trial_date?: string; delivery_date?: string }[];
    grand_total: number;
    advance_amount: number;
    discount_amount?: number;
    tax_amount?: number;
    tax_rate?: number;
  } | null;
}

export function BillModal({ open, onOpenChange, billData }: BillModalProps) {

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
<title>Bill - ${billData.invoiceNumber}</title>
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
    if (!billData) return;
    const savePdf = typeof window !== "undefined" && (window as any).electron?.saveAsPdf;
    if (savePdf) {
      const filename = `bill-${billData.invoiceNumber || "receipt"}.pdf`;
      const result = await savePdf(filename);
      if (result?.ok) toast.success("Bill saved as PDF");
      else if (result?.error) toast.error(result.error);
    } else {
      printBill();
    }
  };

  const handleSendBillPdfWhatsApp = async () => {
    if (!billData) return;
    const phone = formatPhoneForWhatsApp(billData.customer_phone || "");
    if (!phone || phone.length < 10) {
      toast.error("Customer phone number not found. Add a valid phone number.");
      return;
    }
    const pdfMessage = "Hi, please find your bill attached. Thank you for choosing us!";
    // Open WhatsApp URL immediately (synchronous) to avoid popup blocker
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(pdfMessage)}`;
    window.open(waUrl, "_blank");

    const savePdfForWa = typeof window !== "undefined" && (window as any).electron?.savePdfForWhatsApp;
    if (savePdfForWa) {
      const filename = `bill-${billData.invoiceNumber || "receipt"}`;
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

  if (!billData) return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent><p className="py-8 text-center text-muted-foreground">Loading bill...</p></DialogContent>
    </Dialog>
  );

  const subtotal = billData.items?.reduce((s, i) => s + (i.price || 0), 0) ?? 0;
  const discountAmt = billData.discount_amount || 0;
  const taxAmt = billData.tax_amount || 0;
  const taxRate = billData.tax_rate || 0;
  const grandTotal = billData.grand_total || 0;
  const advancePaid = billData.advance_amount || 0;
  const balanceDue = grandTotal - advancePaid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
        <div className="space-y-4">
          <DialogTitle className="sr-only">{`Bill - ${billData.invoiceNumber}`}</DialogTitle>

          {/* ======== PREMIUM BILL DESIGN ======== */}
          <div className="bg-white printable-content text-slate-900 font-sans border border-slate-200 rounded-xl overflow-hidden shadow-sm print:shadow-none print:border-none print:rounded-none">

            {/* Dark header */}
            <div className="px-6 py-4 border-b-2 border-slate-800 flex items-start justify-between bg-white">
              <div className="flex items-center gap-3">
                <Scissors className="h-7 w-7 text-slate-700 shrink-0" />
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
              <div className="text-right shrink-0">
                <p className="text-slate-400 text-[10px] uppercase tracking-wider">Phone</p>
                <p className="text-red-600 font-bold text-sm">9246215215</p>
              </div>
            </div>

            {/* Bill meta row */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Bill No</p>
                <p className="font-bold text-red-600 text-base">{billData.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Date</p>
                <p className="font-semibold text-sm">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Trial Date</p>
                <p className="font-semibold text-sm">{billData.items?.[0]?.trial_date ? new Date(billData.items[0].trial_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Due Date</p>
                <p className="font-bold text-sm text-slate-800">{billData.items?.[0]?.delivery_date ? new Date(billData.items[0].delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
              </div>
            </div>

            {/* Customer */}
            <div className="px-6 py-3 border-b border-slate-200 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Client Name</p>
                <p className="font-bold text-base uppercase">{billData.customer_name || "Guest"}</p>
              </div>
              {billData.customer_phone && (
                <div>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Phone</p>
                  <p className="font-medium font-mono">{billData.customer_phone}</p>
                </div>
              )}
            </div>

            {/* Items */}
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
                  {billData.items?.map((item: any, i: number) => (
                    <tr key={i} className="border-b border-dashed border-slate-100">
                      <td className="py-2.5 align-top text-slate-400 text-xs">{i + 1}</td>
                      <td className="py-2.5 pr-2 align-top font-bold uppercase text-slate-900 tracking-wide">{item.garment_type}</td>
                      <td className="py-2.5 pr-2 align-top text-slate-700">{item.style || '—'}</td>
                      <td className="py-2.5 align-top text-center font-medium text-slate-800">{item.qty || 1}</td>
                      <td className="py-2.5 align-top text-right text-slate-500 text-xs">{formatCurrency(item.price)}</td>
                      <td className="py-2.5 align-top text-right font-semibold text-slate-800">{formatCurrency(item.price * (item.qty || 1))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-4 ml-auto w-64 space-y-1.5 text-sm">
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
                {taxAmt > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax {taxRate > 0 ? `(${taxRate}%)` : ''}</span>
                    <span>+{formatCurrency(taxAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t-2 border-slate-900 pt-2 mt-2">
                  <span>Grand Total</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-xs">
                  <span>Advance Paid</span>
                  <span>{formatCurrency(advancePaid)}</span>
                </div>
                <div className="flex justify-between font-bold text-red-600 bg-red-50 rounded px-2 py-1">
                  <span>Balance Due</span>
                  <span>{formatCurrency(balanceDue)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 leading-relaxed">
              <p className="font-bold text-slate-700 text-xs mb-1">Terms & Conditions</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Please bring this bill on the due date.</li>
                <li>Delivery after 7:00 PM. If unable to collect, please inform us in advance.</li>
                <li>Delivery must be taken within 30 days from due date, otherwise we are not responsible for the garments.</li>
                <li>We are not responsible for any damages during trial or alterations.</li>
              </ul>
              <div className="mt-3 flex justify-between items-center pt-3 border-t border-slate-200">
                <p className="text-slate-400">Thank you for your business!</p>
                <p className="text-slate-400 font-medium">Authorised Signature: _______________</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 no-print">
            <Button variant="outline" onClick={handleSavePdf}>
              <FileDown className="mr-2 h-4 w-4 shrink-0" /> Save PDF
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSendBillPdfWhatsApp}>
              <Send className="mr-2 h-4 w-4 shrink-0" /> Bill PDF → WhatsApp
            </Button>
            <Button variant="outline" onClick={printBill}>
              <Printer className="mr-2 h-4 w-4 shrink-0" /> Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
