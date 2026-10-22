import { describe, expect, it } from "vitest";
import { PDF_LIMITS, PdfValidationError, normalizePdfText, validatePdfFile } from "./pdf";

describe("PDF input validation", () => {
  it("accepts PDF MIME types and extensions", () => {
    expect(() =>
      validatePdfFile({ name: "notes.pdf", size: 100, type: "application/pdf" }),
    ).not.toThrow();
    expect(() =>
      validatePdfFile({ name: "NOTES.PDF", size: 100, type: "" }),
    ).not.toThrow();
  });

  it("rejects non-PDF and oversized files", () => {
    expect(() =>
      validatePdfFile({ name: "notes.txt", size: 100, type: "text/plain" }),
    ).toThrow(PdfValidationError);
    expect(() =>
      validatePdfFile({
        name: "huge.pdf",
        size: PDF_LIMITS.maxBytes + 1,
        type: "application/pdf",
      }),
    ).toThrow("larger than the 10 MB");
  });

  it("normalizes extractable text without destroying paragraphs", () => {
    expect(normalizePdfText("  A   concept \n\n\n Next\t idea  ")).toBe(
      "A concept\n\nNext idea",
    );
  });
});
