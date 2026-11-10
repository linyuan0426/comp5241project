import type { DocumentPage, ExtractedDocument } from "../types";
import { countDocumentCharacters, DOCUMENT_LIMITS } from "./document";

async function getPdfLibrary() {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

export const PDF_LIMITS = DOCUMENT_LIMITS;

export class PdfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfValidationError";
  }
}

export function validatePdfFile(file: Pick<File, "name" | "size" | "type">) {
  const looksLikePdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!looksLikePdf) {
    throw new PdfValidationError("Please choose a PDF file.");
  }

  if (file.size > PDF_LIMITS.maxBytes) {
    throw new PdfValidationError("This PDF is larger than the 10 MB demo limit.");
  }
}

export function normalizePdfText(rawText: string) {
  return rawText
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPdf(file: File): Promise<ExtractedDocument> {
  validatePdfFile(file);

  const pdfjs = await getPdfLibrary();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: bytes, isEvalSupported: false });
  let pdf: Awaited<typeof loadingTask.promise>;

  try {
    pdf = await loadingTask.promise;
    if (pdf.numPages > PDF_LIMITS.maxPages) {
      throw new PdfValidationError(
        `This PDF has ${pdf.numPages} pages. The demo accepts up to ${PDF_LIMITS.maxPages}.`,
      );
    }

    const pages: DocumentPage[] = [];
    const imageOps = new Set<number>([
      pdfjs.OPS.paintImageXObject,
      pdfjs.OPS.paintImageXObjectRepeat,
      pdfjs.OPS.paintInlineImageXObject,
      pdfjs.OPS.paintInlineImageXObjectGroup,
      pdfjs.OPS.paintImageMaskXObject,
      pdfjs.OPS.paintImageMaskXObjectGroup,
      pdfjs.OPS.paintImageMaskXObjectRepeat,
    ]);
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = normalizePdfText(content.items
        .map((item) => ("str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : ""))
        .join(""));
      const operators = await page.getOperatorList();
      const entry: DocumentPage = { text, images: [] };
      if (!text || operators.fnArray.some((op) => imageOps.has(op))) {
        const size = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 1600 / Math.max(size.width, size.height) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));
        const canvasContext = canvas.getContext("2d");
        if (!canvasContext) throw new PdfValidationError("The browser could not preview a PDF page.");
        try {
          await page.render({ canvasContext, viewport, background: "white" }).promise;
          entry.images.push(canvas.toDataURL("image/jpeg", 0.9));
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
      }
      pages.push(entry);
      page.cleanup();
    }

    return {
      meta: {
        name: file.name,
        pageCount: pdf.numPages,
        characterCount: countDocumentCharacters(pages),
      },
      pages,
    };
  } finally {
    await loadingTask.destroy();
  }
}
