
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
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md sm:max-w-[400px] overflow-y-auto max-h-[90vh]">
                <div className="bg-white p-4 print:p-0 text-black printable-content">
                    {/* Print Only Header */}
                    <div className="text-center mb-6">
                        <img src="/bill-header.png" alt="SUPERB" className="mx-auto h-20 w-auto object-contain mb-2 print:h-24" />
                        <div className="text-[10px] font-medium text-slate-600 space-y-0.5 uppercase tracking-wide">
                            <p>33, Chandralok Complex, Sarojini Devi Road, Secunderabad</p>
                            <p>PH: 9246215215</p>
                        </div>
                        <div className="border-b-2 border-dashed my-3 border-gray-300"></div>
                        <h3 className="font-bold text-base bg-black text-white inline-block px-2 py-0.5 rounded-sm">MEASUREMENT SLIP</h3>
                        <p className="text-[10px] text-gray-500 mt-1">{new Date().toLocaleString()}</p>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-4 text-sm bg-gray-50 p-3 rounded-lg print:bg-transparent print:p-0">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-600 font-medium">Customer:</span>
                            <span className="font-bold text-base">{customer?.full_name}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-600">Mobile:</span>
                            <span className="font-mono">{customer?.phone}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">ID:</span>
                            <span className="font-mono text-xs text-gray-500">{customer?.customer_code}</span>
                        </div>
                    </div>

                    {/* Measurement Details */}
                    <div className="border-t-2 border-b-2 border-black py-3 mb-4 border-dashed">
                        <div className="flex justify-between mb-2 items-center">
                            <span className="font-bold text-sm">Item:</span>
                            <span className="font-bold uppercase text-lg">{template?.name || measurement.garment_type}</span>
                        </div>
                        <div className="flex justify-between mb-2 items-center text-xs">
                            <span className="text-gray-500">Profile:</span>
                            <span className="font-medium bg-gray-100 px-2 py-0.5 rounded print:bg-transparent print:p-0">{measurement.label}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
                            {(() => {
                                const meas = typeof measurement.measurements === 'string' ? JSON.parse(measurement.measurements || '{}') : (measurement.measurements || {});
                                const entries = template?.measurement_fields?.length
                                    ? template.measurement_fields.map((f: any) => [f.key, f.label, meas[f.key]])
                                    : Object.entries(meas).map(([k, v]) => [k, k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), v]);
                                if (entries.length === 0) return <p className="col-span-2 text-sm text-gray-500 italic">No measurements recorded for this profile.</p>;
                                return entries.map(([key, label, val]: any) => (
                                    <div key={key} className="flex justify-between text-sm border-b border-gray-200 pb-1 items-end">
                                        <span className="text-gray-600 text-xs uppercase tracking-wide">{label}</span>
                                        <span className="font-bold text-base font-mono">{val ?? "-"}</span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* Notes */}
                    {measurement.notes && (
                        <div className="mb-4">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Tailoring Notes</p>
                            <p className="text-sm border border-gray-800 p-2 rounded bg-white font-medium italic">{measurement.notes}</p>
                        </div>
                    )}

                    <div className="text-center text-[10px] text-gray-400 mt-6 print:hidden">
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
