/** Trigger download of Excel export from /api/export/all */
export async function exportAllToExcel(): Promise<void> {
  const token = localStorage.getItem("auth_token");
  const url = "/api/export/all";
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(res.statusText || "Export failed");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `tailorflow-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}
