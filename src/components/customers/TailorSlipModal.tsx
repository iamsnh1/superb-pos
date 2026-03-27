import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface TailorSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any;
  measurement: any;
  template: any;
}

export function TailorSlipModal({ open, onOpenChange, customer, measurement, template }: TailorSlipModalProps) {

  const handlePrint = () => {
    const slipEl = document.getElementById("printable-slip");
    if (!slipEl) return;

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
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8"/>
          <title>Tailor Slip</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 8px; color: #000; background: white; }
            @page { size: 80mm auto; margin: 4mm; }

            #slip-content { 
              width: 70mm; 
              padding: 3mm 3mm; 
              border: 1px dashed #000; 
            }

            .border-b-2 { border-bottom: 2px solid black; padding-bottom: 2px; margin-bottom: 2px; }
            .border-b { border-bottom: 1px solid #ddd; }
            .border { border: 1px solid black; }
            .border-dashed { border-style: dashed; }
            .border-gray-400 { border-color: #aaa; }
            .border-gray-100 { border-color: #eee; }
            .border-dotted { border-style: dotted; }
            .border-gray-300 { border-color: #ccc; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .mb-1 { margin-bottom: 1px; }
            .mb-0\\.5 { margin-bottom: 1px; }
            .mb-2 { margin-bottom: 2px; }
            .pb-1 { padding-bottom: 2px; }
            .pb-2 { padding-bottom: 2px; }
            .mt-1 { margin-top: 1px; }
            .mt-2 { margin-top: 2px; }
            .pt-0\\.5 { padding-top: 1px; }
            .pt-1 { padding-top: 1px; }
            .px-1 { padding-left: 2px; padding-right: 2px; }
            .py-0 { padding-top: 0; padding-bottom: 0; }
            .font-bold { font-weight: bold; }
            .font-mono { font-family: monospace; }
            .uppercase { text-transform: uppercase; }
            .italic { font-style: italic; }
            .tracking-widest { letter-spacing: 2px; }
            .leading-tight { line-height: 1.2; }
            .block { display: block; }
            .opacity-70 { opacity: 0.7; }
            .opacity-60 { opacity: 0.6; }
            .text-sm { font-size: 11px; }
            .text-lg { font-size: 12px; }
            .text-\\[12px\\] { font-size: 10px; }
            .text-\\[10px\\] { font-size: 8px; }
            .text-\\[9px\\] { font-size: 7px; }
            .text-\\[8px\\] { font-size: 6px; }
            .text-\\[7px\\] { font-size: 5.5px; }
            .text-gray-600 { color: #555; }
            .text-gray-700 { color: #444; }
            .text-red-600 { color: #cc0000; }
            .no-print, button { display: none !important; }
            .p-2 { padding: 1px; }
            .ml-1 { margin-left: 2px; }
          </style>
        </head>
        <body>
          <div id="slip-content">
            ${slipEl.innerHTML}
          </div>
          <script>
            document.querySelectorAll('.no-print, button').forEach(el => el.remove());
          </script>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };

  if (!measurement || !customer) return null;

  const designSpec = measurement.design_spec
    ? (typeof measurement.design_spec === 'string' ? JSON.parse(measurement.design_spec) : measurement.design_spec)
    : null;
  const garmentName = template?.name || measurement.garment_type;
  const finalBillNo = measurement.bill_no || customer.customer_code || "---";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[240px] p-2 bg-white border-none gap-0 overflow-hidden [&>button]:hidden">
        {/* Printable Container */}
        <div id="printable-slip" className="text-black font-sans w-full bg-white">

          {/* Header */}
          <div className="border-b-2 border-black pb-1 mb-1">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[8px] font-bold uppercase">BILL NO:</span>
              <span className="font-bold text-sm font-mono tracking-widest">{finalBillNo}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[8px] uppercase">ITEM:</span>
              <span className="font-bold text-[10px] uppercase">{garmentName}</span>
            </div>
          </div>

          {/* Design / Style */}
          {(designSpec?.style || designSpec?.notes || designSpec?.design_notes) && (
            <div className="mb-1 pb-1 border-b border-dashed border-gray-400">
              <span className="font-bold text-[7px] uppercase block opacity-70">DESIGN/STYLE:</span>
              <div className="text-[8px] font-bold uppercase italic leading-tight">
                {designSpec?.style || ""}
                {(designSpec?.notes || designSpec?.design_notes) && (
                  <span className="ml-1 text-gray-700">({designSpec.notes || designSpec.design_notes})</span>
                )}
              </div>
            </div>
          )}

          {/* Customer Description */}
          {measurement.bill_notes && (
            <div className="mb-1 pb-1 border-b border-dashed border-gray-400">
              <span className="font-bold text-[7px] uppercase block opacity-70">DESCRIPTION:</span>
              <div className="text-[8px] font-bold uppercase leading-tight text-red-600">
                {measurement.bill_notes}
              </div>
            </div>
          )}

          {/* Measurements */}
          <div className="border border-black">
            {(() => {
              const meas = typeof measurement.measurements === 'string'
                ? JSON.parse(measurement.measurements || '{}')
                : (measurement.measurements || {});
              const entries = template?.measurement_fields?.length
                ? template.measurement_fields.map((f: any) => [f.key, f.label, meas[f.key]])
                : Object.entries(meas).map(([k, v]) => [k, k.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), v]);
              if (entries.length === 0) return <div className="p-1 text-[7px] italic">No measurements.</div>;
              return entries.map(([key, label, val]: any, idx: number) => (
                <div key={key} className={`flex justify-between px-1 py-0 ${idx !== entries.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <span className="text-gray-600 text-[7px] uppercase">{label}:</span>
                  <span className="font-bold font-mono text-[8px]">{val ?? "—"}</span>
                </div>
              ));
            })()}
          </div>

          {/* Tailor Note */}
          {measurement.notes && measurement.notes !== "Updated from POS" && measurement.notes !== "Saved from POS" && (
            <div className="mt-1 text-[7px] leading-tight border-t border-dotted border-gray-300 pt-0.5">
              <span className="font-bold opacity-60">NOTE:</span> {measurement.notes}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-1 justify-end mt-2 pt-2 border-t no-print">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>Close</Button>
          <Button size="sm" className="h-7 text-xs bg-black text-white hover:bg-gray-800" onClick={handlePrint}>
            <Printer className="h-3 w-3 mr-1" /> Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
