import { formatCurrency, formatDate } from "../../format";
import type { Expense } from "../../types";
import { describeQuery } from "../query";
import type { ExportContext, ExportFormatSpec } from "../types";

const RIGHT = { halign: "right" } as const;
const right = (content: string) => ({ content, styles: RIGHT });

// Report palette (RGB). Matches the app's accent and ink tokens.
const ACCENT: [number, number, number] = [42, 120, 214];
const INK: [number, number, number] = [11, 11, 11];
const MUTED: [number, number, number] = [112, 111, 106];
const LINE: [number, number, number] = [228, 227, 223];

/**
 * jsPDF's built-in Helvetica only covers WinAnsi, so map common typographic
 * characters to ASCII and replace anything else outside Latin-1.
 */
export function toPdfText(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\u0000-ÿ]/g, "?");
}

async function buildPdf(rows: Expense[], ctx: ExportContext): Promise<Blob> {
  // Loaded on demand so the ~350 KB PDF engine never ships with the main bundle.
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const { dateRange, categories } = describeQuery(ctx.query);

  doc.setProperties({ title: "Expense Report", creator: "Spendwise" });

  // Header band
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pageWidth, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text("Expense Report", margin, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    `Generated ${ctx.generatedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
    pageWidth - margin,
    56,
    { align: "right" },
  );
  doc.text(toPdfText(`${dateRange}  |  ${categories}`), margin, 74, { maxWidth: pageWidth - margin * 2 });

  // Summary tiles
  const tiles: Array<[string, string]> = [
    ["Total spent", formatCurrency(ctx.summary.totalCents)],
    ["Expenses", String(ctx.summary.count)],
    [
      "Period covered",
      ctx.summary.firstDate && ctx.summary.lastDate
        ? `${formatDate(ctx.summary.firstDate)} - ${formatDate(ctx.summary.lastDate)}`
        : "-",
    ],
  ];
  const gap = 12;
  const tileW = (pageWidth - margin * 2 - gap * 2) / 3;
  const tileY = 92;
  tiles.forEach(([label, value], i) => {
    const x = margin + i * (tileW + gap);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, tileY, tileW, 52, 6, 6, "S");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + 12, tileY + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(i === 2 ? 10 : 15);
    doc.setTextColor(...INK);
    doc.text(value, x + 12, tileY + 38, { maxWidth: tileW - 24 });
    doc.setFont("helvetica", "normal");
  });

  // Category breakdown
  autoTable(doc, {
    startY: tileY + 72,
    margin: { left: margin, right: margin },
    head: [["Category", right("Expenses"), right("Share"), right("Total")]],
    body: ctx.summary.byCategory.map((c) => [
      c.category,
      String(c.count),
      `${ctx.summary.totalCents ? Math.round((c.totalCents / ctx.summary.totalCents) * 100) : 0}%`,
      formatCurrency(c.totalCents),
    ]),
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 5, textColor: INK },
    headStyles: { textColor: MUTED, fontStyle: "bold", lineWidth: { bottom: 0.75 }, lineColor: LINE },
    columnStyles: { 1: RIGHT, 2: RIGHT, 3: RIGHT },
  });

  // Line items
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24,
    margin: { left: margin, right: margin, bottom: 48 },
    head: [["Date", "Category", "Description", right("Amount")]],
    body: rows.map((e) => [formatDate(e.date), e.category, toPdfText(e.description), formatCurrency(e.amountCents)]),
    foot: [["", "", "Total", right(formatCurrency(ctx.summary.totalCents))]],
    showFoot: "lastPage",
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 6, textColor: INK, overflow: "linebreak" },
    headStyles: { fillColor: ACCENT, textColor: [255, 255, 255], fontStyle: "bold" },
    footStyles: { fillColor: [244, 244, 242], textColor: INK, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 249] },
    columnStyles: {
      0: { cellWidth: 82 },
      1: { cellWidth: 96 },
      3: { ...RIGHT, cellWidth: 80 },
    },
  });

  // Page footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const y = doc.internal.pageSize.getHeight() - 24;
    doc.text("Spendwise expense report", margin, y);
    doc.text(`Page ${i} of ${pages}`, pageWidth - margin, y, { align: "right" });
  }

  return doc.output("blob");
}

export const pdfFormat: ExportFormatSpec = {
  id: "pdf",
  label: "PDF",
  extension: "pdf",
  mimeType: "application/pdf",
  description: "Formatted report with summary — ready to print or share",
  textPreview: false,
  build: buildPdf,
};
