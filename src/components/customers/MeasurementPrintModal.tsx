
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

interface MeasurementPrintModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: any;
    measurement: any;
    template: any; // Garment template to get localized field names
}

export function MeasurementPrintModal({ open, onOpenChange, customer, measurement, template }: MeasurementPrintModalProps) {
    const { data: settings } = useSettings();

    if (!measurement) return null;

    const handlePrint = () => {
        // Native window.print naturally triggers the print preview dialog. 
        // The index.css 'printable-content' class ensures only this section is printed.
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh] print:max-h-none print:h-auto print:overflow-visible overflow-x-hidden">
                <div className="bg-white p-6 print:p-0 text-black printable-content">
                    {/* Print Only Header */}
                    <div className="text-center mb-8">
                        <img src="/bill-header.png" alt="SUPERB" className="mx-auto h-24 w-auto object-contain mb-3 print:h-32" />
                        <div className="text-xs print:text-base font-medium text-slate-600 space-y-1 uppercase tracking-wide">
                            <p>33, Chandralok Complex, Sarojini Devi Road, Secunderabad</p>
                            <p>PH: 9246215215</p>
                        </div>
                        <div className="border-b-2 border-dashed my-4 border-gray-300"></div>
                        <h3 className="font-bold text-lg print:text-2xl bg-black text-white inline-block px-3 py-1 rounded-sm">MEASUREMENT SLIP</h3>
                        <p className="text-xs print:text-sm text-gray-500 mt-2">{new Date().toLocaleString()}</p>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-6 text-base print:text-xl bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600 font-medium">Customer:</span>
                            <span className="font-bold text-lg print:text-2xl">{customer?.full_name}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600">Mobile:</span>
                            <span className="font-mono">{customer?.phone}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">ID:</span>
                            <span className="font-mono text-sm print:text-lg text-gray-500">{customer?.customer_code}</span>
                        </div>
                    </div>

                    {/* Measurement Details */}
                    <div className="border-t-2 border-b-2 border-black py-4 mb-6 border-dashed">
                        <div className="flex justify-between mb-3 items-center">
                            <span className="font-bold text-base print:text-xl">Item:</span>
                            <span className="font-bold uppercase text-xl print:text-3xl">{template?.name || measurement.garment_type}</span>
                        </div>
                        <div className="flex justify-between mb-4 items-center text-sm print:text-lg">
                            <span className="text-gray-500">Profile:</span>
                            <span className="font-medium bg-gray-100 px-3 py-1 rounded print:bg-transparent print:p-0">{measurement.label}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-6">
                            {(() => {
                                const meas = typeof measurement.measurements === 'string' ? JSON.parse(measurement.measurements || '{}') : (measurement.measurements || {});
                                const entries = template?.measurement_fields?.length
                                    ? template.measurement_fields.map((f: any) => [f.key, f.label, meas[f.key]])
                                    : Object.entries(meas).map(([k, v]) => [k, k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), v]);
                                if (entries.length === 0) return <p className="col-span-2 text-sm text-gray-500 italic">No measurements recorded for this profile.</p>;
                                return entries.map(([key, label, val]: any) => (
                                    <div key={key} className="flex justify-between text-base print:text-xl border-b border-gray-200 pb-1.5 items-end">
                                        <span className="text-gray-600 text-sm print:text-lg uppercase tracking-wide">{label}</span>
                                        <span className="font-bold text-lg print:text-2xl font-mono">{val ?? "-"}</span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* Notes */}
                    {measurement.notes && (
                        <div className="mb-6">
                            <p className="text-xs print:text-base font-bold text-gray-500 uppercase mb-2">Tailoring Notes</p>
                            <p className="text-base print:text-xl border-2 border-gray-800 p-3 rounded bg-white font-medium italic">{measurement.notes}</p>
                        </div>
                    )}

                    <div className="text-center text-xs print:text-sm text-gray-400 mt-8 print:hidden">
                        --- End of Slip ---
                    </div>
                </div>

                <div className="flex justify-end gap-2 print:hidden bg-gray-50 p-4 -mx-6 -mb-6 border-t mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="w-4 h-4" /> Print Slip
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
