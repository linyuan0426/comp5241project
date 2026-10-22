import type { ExtractedDocument } from "../types";

async function getPdfLibrary() {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

export const PDF_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxPages: 50,
  maxCharacters: 30_000,
  minCharacters: 80,
} as const;

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
  const loadingTask = pdfjs.getDocument({ data: bytes });
  let pdf: Awaited<typeof loadingTask.promise>;

  try {
    pdf = await loadingTask.promise;
    if (pdf.numPages > PDF_LIMITS.maxPages) {
      throw new PdfValidationError(
        `This PDF has ${pdf.numPages} pages. The demo accepts up to ${PDF_LIMITS.maxPages}.`,
      );
    }

    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : ""))
        .join("");
      pageTexts.push(text);
      page.cleanup();
    }

    const text = normalizePdfText(pageTexts.join("\n\n"));
    if (text.length < PDF_LIMITS.minCharacters) {
      throw new PdfValidationError(
        "No readable text was found. Scanned PDFs are not supported in this demo.",
      );
    }

    if (text.length > PDF_LIMITS.maxCharacters) {
      throw new PdfValidationError(
        "The extracted text exceeds the 30,000-character demo limit.",
      );
    }

    return {
      meta: {
        name: file.name,
        pageCount: pdf.numPages,
        characterCount: text.length,
      },
      text,
    };
  } finally {
    await loadingTask.destroy();
  }
}
