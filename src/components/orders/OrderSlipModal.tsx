import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface OrderSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  items: any[];
  templates?: any[];
}

export function OrderSlipModal({ open, onOpenChange, order, items, templates }: OrderSlipModalProps) {
  const handlePrint = () => {
    const el = document.getElementById("combined-tailor-slip");
    if (!el) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <title>Measurement Slip</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Arial,sans-serif;font-size:7px;color:#000;background:#fff;}
        @page{size:A4;margin:3mm;}
        .tokens{display:flex;flex-wrap:wrap;gap:2mm;align-items:flex-start;}
        .token{border:1px solid #000;width:45mm;break-inside:avoid;padding:0;display:inline-block;}
        .t-head{background:#000;color:#fff;font-weight:bold;font-size:7px;text-transform:uppercase;padding:2px;display:flex;justify-content:space-between;align-items:center;}
        .t-head .bill{font-size:8px;}
        .t-row{display:flex;justify-content:flex-start;gap:6px;padding:1px 2px;border-bottom:1px solid #f0f0f0;}
        .t-row:nth-child(even){background:#f9f9f9;}
        .lbl{font-size:6px;color:#555;text-transform:uppercase;width:24mm;}
        .val{font-size:8px;font-weight:900;font-family:monospace;}
        .t-note{padding:2px;font-size:6.5px;color:#000;font-style:italic;}
        .t-spec{padding:2px;font-size:6.5px;color:#000;font-weight:900;border-top:1px dashed #000;text-transform:uppercase;}
        .no-print,button{display:none!important;}
      </style>
    </head><body>
      <div class="tokens">${el.innerHTML}</div>
      <script>document.querySelectorAll('.no-print,button').forEach(function(e){e.remove();});</script>
    </body></html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };

  if (!order || !items?.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-3 bg-white border-none gap-0 overflow-y-auto max-h-[90dvh] [&>button]:hidden">
        <div id="combined-tailor-slip" className="flex flex-wrap gap-2 bg-white items-start">
          {items.map((item: any, idx: number) => {
            const garmentLabel = templates?.find((t: any) => t.code === item.garment_type)?.name || item.garment_type;
            const meas = typeof item.measurements === 'string'
              ? JSON.parse(item.measurements || '{}')
              : (item.measurements || {});
            const measEntries = Object.entries(meas).filter(([, v]) => v !== undefined && v !== '');
            const designSpec = item.design_specifications
              ? (typeof item.design_specifications === 'string'
                ? (() => { try { return JSON.parse(item.design_specifications); } catch { return { notes: item.design_specifications }; } })()
                : item.design_specifications)
              : null;
            const styleNote = designSpec?.style || designSpec?.notes || designSpec?.design_notes
              || (typeof item.design_specifications === 'string' && !item.design_specifications.startsWith('{') ? item.design_specifications : null);

            return (
              <div key={idx} className="token border border-black w-[170px] text-[7px] font-sans">
                {/* Header: Garment + Bill No */}
                <div className="t-head bg-black text-white font-bold text-[7px] uppercase px-1 py-0.5 flex justify-between items-center">
                  <span>{garmentLabel}{item.qty > 1 ? ` ×${item.qty}` : ''}</span>
                  <span className="text-[9px]">#{order.invoice_number || order.order_number}</span>
                </div>

                {/* Measurements (tight gap, not justified) */}
                {measEntries.length > 0 ? measEntries.map(([k, v]: any, i: number) => (
                  <div key={k} className={`t-row flex justify-start gap-2 px-1 py-px ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`} style={{borderBottom:'1px solid #f0f0f0'}}>
                    <div className="text-gray-500 text-[6px] uppercase w-[90px]">{k.replace(/_/g, ' ')}</div>
                    <div className="font-bold font-mono text-[9px]">{String(v)}</div>
                  </div>
                )) : null}

                {/* Optional Design Notes / Style */}
                {styleNote && (
                  <div className="px-1 py-0.5 text-[6.5px] italic border-t border-dashed border-gray-300 text-gray-800">
                    <span className="font-bold">DESIGN:</span> {styleNote}
                  </div>
                )}

                {/* Special Instructions / Bill Notes */}
                {(item.notes || item.bill_notes) && (
                  <div className="t-spec border-t border-dashed border-gray-400 px-1 py-0.5 text-[6.5px] text-black font-bold uppercase tracking-tight leading-tight">
                    ⚠ {item.notes || item.bill_notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="no-print flex gap-2 justify-end mt-3 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
          <Button size="sm" className="bg-black text-white hover:bg-gray-800" onClick={handlePrint}>
            <Printer className="h-3 w-3 mr-1" /> Print Slips
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
