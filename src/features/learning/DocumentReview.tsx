import { useState } from "react";
import type { DocumentPage } from "../../types";

type Props = {
  pages: DocumentPage[];
  busy: boolean;
  recognizingPage: number | null;
  onEdit: (pageIndex: number, patch: Partial<DocumentPage>) => void;
  onRecognize: (pageIndex: number) => void;
};

export default function DocumentReview({ pages, busy, recognizingPage, onEdit, onRecognize }: Props) {
  const [activePage, setActivePage] = useState(0);
  const index = Math.min(activePage, pages.length - 1);
  const page = pages[index];
  const pending = pages.filter((item) => item.images.length > 0 && item.recognizedText === undefined).length;
  const hasImages = page.images.length > 0;
  const hasImageNotes = hasImages || Boolean(page.skippedImages);
  return (
    <section className="document-review" aria-labelledby="document-review-title">
      <div className="document-review-header">
        <div>
          <h3 id="document-review-title">Review extracted content</h3>
          <p>Check the text by page and make any corrections before generating your study kit.</p>
        </div>
        <label>
          <span>Review page</span>
          <select value={index} onChange={(event) => setActivePage(Number(event.target.value))}>
            {pages.map((_, pageIndex) => (
              <option key={pageIndex} value={pageIndex}>Page {pageIndex + 1} of {pages.length}</option>
            ))}
          </select>
        </label>
      </div>
      {pending > 0 ? (
        <p className="document-review-note">
          {pending} {pending === 1 ? "page has" : "pages have"} images awaiting recognition or manual transcription.
        </p>
      ) : null}
      <label className="review-field">
        <span>Page {index + 1} native text</span>
        <textarea
          disabled={busy}
          onChange={(event) => onEdit(index, { text: event.target.value })}
          placeholder="No selectable text on this page."
          rows={5}
          value={page.text}
        />
      </label>
      {hasImageNotes ? (
        <>
          {hasImages ? (
            <details className="document-image-review">
              <summary>View page images ({page.images.length})</summary>
              <div>
                {page.images.map((url, imageIndex) => (
                  <img key={imageIndex} src={url} alt={`Page ${index + 1} image ${imageIndex + 1}`} loading="lazy" />
                ))}
              </div>
            </details>
          ) : null}
          {page.skippedImages ? (
            <p className="document-review-note">
              {page.skippedImages} {page.skippedImages === 1 ? "image is" : "images are"} too large or in an unsupported format.
              Enter any missing text below or upload a PDF export.
            </p>
          ) : null}
          <div className="document-recognition">
            {hasImages ? (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  if (!page.recognizedText?.trim() || window.confirm("Replace the current image text if recognition succeeds?")) {
                    onRecognize(index);
                  }
                }}
                type="button"
              >
                {recognizingPage === index ? "Recognizing images…" : page.recognizedText?.trim() ? "Recognize images again" : "Recognize images on this page"}
              </button>
            ) : null}
            {hasImages ? <p>Recognition sends these images and an excerpt of the page text to the AI service.</p> : null}
          </div>
          <label className="review-field">
            <span>Page {index + 1} image text</span>
            <textarea
              disabled={busy}
              onChange={(event) => onEdit(index, { recognizedText: event.target.value })}
              placeholder="Recognize the images or enter their text here."
              rows={4}
              value={page.recognizedText ?? ""}
            />
          </label>
        </>
      ) : null}
    </section>
  );
}
