import type { DocumentPage } from "../types";

export const DOCUMENT_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxPages: 50,
  maxCharacters: 30_000,
} as const;

function pageText(page: DocumentPage) {
  return [page.text.trim(), page.recognizedText?.trim()].filter(Boolean).join("\n\n");
}

export function joinDocumentPages(pages: DocumentPage[]) {
  return pages.map((page, index) => {
    const text = pageText(page);
    return text ? `[Page ${index + 1}]\n${text}` : "";
  }).filter(Boolean).join("\n\n");
}

export function countDocumentCharacters(pages: DocumentPage[]) {
  return pages.reduce((total, page) => total + pageText(page).length, 0);
}
