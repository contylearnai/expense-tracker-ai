/**
 * Escapes one CSV cell. Values starting with = + - @ (or tab/CR) are prefixed with a
 * quote so spreadsheet apps don't execute them as formulas (CSV injection).
 */
export function escapeCsvCell(value: string): string {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  if (/[",\n\r]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}
