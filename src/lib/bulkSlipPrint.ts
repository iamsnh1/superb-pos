/**
 * Bulk Tailor Slip Printer
 * Generates a single printable A4 page with all tailor slips laid out in a 3-column grid.
 * Each slip is compact (60mm style), self-contained, and separated by cut marks.
 */

export function printBulkTailorSlips(orders: any[]) {
  if (!orders || orders.length === 0) return;

  const slipsHtml = orders.map((o: any) => {
    const billNo = o.invoice_number || o.order_number || '---';
    const customer = o.customer_name || o.customers?.full_name || '---';
    const phone = o.customer_phone || o.customers?.phone || '';
    const garment = o.garment_type || '---';

    // Parse measurements
    let meas: Record<string, any> = {};
    try {
      meas = typeof o.measurements === 'string'
        ? JSON.parse(o.measurements || '{}')
        : (o.measurements || {});
    } catch { meas = {}; }

    // parse design specs
    let ds: any = {};
    try {
      ds = typeof o.design_specifications === 'string'
        ? JSON.parse(o.design_specifications || '{}')
        : (o.design_specifications || {});
    } catch { ds = {}; }

    const style = ds.style || '';
    const designNotes = ds.notes || ds.design_notes || '';
    const billNotes = o.notes || '';

    const measurementRows = Object.entries(meas)
      .filter(([, v]) => v !== undefined && v !== null && v !== 0 && v !== '')
      .map(([k, v]) => {
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        return `<div class="mrow"><span class="mlabel">${label}:</span><span class="mval">${v}"</span></div>`;
      }).join('');

    return `
      <div class="slip">
        <div class="slip-header">
          <div class="slip-row">
            <span class="slip-key">BILL NO:</span>
            <span class="slip-billno">${billNo}</span>
          </div>
          <div class="slip-row">
            <span class="slip-key">ITEM:</span>
            <span class="slip-garment">${garment.toUpperCase()}</span>
          </div>
        </div>

        <div class="slip-customer">
          <div class="cname">${customer}</div>
          ${phone ? `<div class="cphone">${phone}</div>` : ''}
        </div>

        ${style || designNotes ? `
        <div class="slip-section">
          <div class="sec-label">STYLE / DESIGN:</div>
          <div class="sec-val">${style}${designNotes ? ` (${designNotes})` : ''}</div>
        </div>` : ''}

        ${billNotes && billNotes !== 'Updated from POS' && billNotes !== 'Saved from POS' ? `
        <div class="slip-section desc">
          <div class="sec-label">DESCRIPTION:</div>
          <div class="sec-val red">${billNotes}</div>
        </div>` : ''}

        <div class="meas-table">
          ${measurementRows || '<div class="no-meas">No measurements</div>'}
        </div>

        <div class="slip-footer">${new Date().toLocaleDateString('en-IN')}</div>
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Tailor Slips — Bulk Print</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 8px;
      background: white;
      color: #000;
    }
    @page { size: A4; margin: 6mm; }

    .page-title {
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 4mm;
      padding-bottom: 2mm;
      border-bottom: 1px solid #000;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3mm;
    }

    .slip {
      border: 1px dashed #333;
      padding: 2.5mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Header */
    .slip-header {
      border-bottom: 2px solid #000;
      padding-bottom: 1.5mm;
      margin-bottom: 1.5mm;
    }
    .slip-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5mm;
    }
    .slip-key { font-size: 6px; font-weight: bold; text-transform: uppercase; opacity: 0.6; }
    .slip-billno { font-family: monospace; font-weight: bold; font-size: 11px; letter-spacing: 1px; }
    .slip-garment { font-weight: bold; font-size: 9px; text-transform: uppercase; }

    /* Customer */
    .slip-customer {
      margin-bottom: 1.5mm;
      padding-bottom: 1.5mm;
      border-bottom: 1px dotted #aaa;
    }
    .cname { font-weight: bold; font-size: 8.5px; }
    .cphone { font-size: 7px; color: #555; }

    /* Sections */
    .slip-section {
      margin-bottom: 1.5mm;
      padding-bottom: 1.5mm;
      border-bottom: 1px dashed #aaa;
    }
    .sec-label { font-size: 5.5px; font-weight: bold; text-transform: uppercase; opacity: 0.6; }
    .sec-val { font-weight: bold; font-size: 7.5px; text-transform: uppercase; font-style: italic; }
    .sec-val.red { color: #cc0000; }

    /* Measurements */
    .meas-table {
      border: 1px solid #000;
      padding: 0;
    }
    .mrow {
      display: flex;
      justify-content: space-between;
      padding: 0.5mm 1.5mm;
      border-bottom: 0.5px solid #eee;
    }
    .mrow:last-child { border-bottom: none; }
    .mlabel { font-size: 6.5px; color: #555; text-transform: uppercase; }
    .mval { font-family: monospace; font-weight: bold; font-size: 7.5px; }
    .no-meas { padding: 2mm; font-size: 6.5px; color: #999; font-style: italic; text-align: center; }

    .slip-footer {
      text-align: right;
      font-size: 5.5px;
      color: #aaa;
      margin-top: 1.5mm;
    }
  </style>
</head>
<body>
  <div class="page-title">🖨️ TAILOR SLIPS — ${orders.length} Orders — Printed: ${new Date().toLocaleString('en-IN')}</div>
  <div class="grid">
    ${slipsHtml}
  </div>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Please allow popups to print slips.'); return; }
  win.document.write(html);
  win.document.close();
}
