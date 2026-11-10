import { strFromU8, unzipSync } from "fflate";
import type { DocumentPage, ExtractedDocument } from "../types";
import { countDocumentCharacters, DOCUMENT_LIMITS } from "./document";

const maxExpandedBytes = 24 * 1024 * 1024;
const maxImageBytes = 4 * 1024 * 1024;
const imageFormats: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function xmlPart(bytes: Uint8Array | undefined) {
  if (!bytes) throw new Error("A required PowerPoint part is missing.");
  const source = strFromU8(bytes);
  if (/<!DOCTYPE/i.test(source)) throw new Error("Unsupported PowerPoint XML.");
  const xml = new DOMParser().parseFromString(source, "application/xml");
  if (xml.getElementsByTagName("parsererror").length) throw new Error("Invalid PowerPoint XML.");
  return xml;
}

function elements(node: Document | Element, name: string) {
  return Array.from(node.getElementsByTagNameNS("*", name));
}

function relationshipId(node: Element, name: string) {
  return Array.from(node.attributes).find((attribute) =>
    attribute.localName === name && attribute.namespaceURI?.endsWith("/relationships"),
  )?.value;
}

function relationships(parts: Record<string, Uint8Array>, source: string) {
  const slash = source.lastIndexOf("/");
  const path = `${source.slice(0, slash + 1)}_rels/${source.slice(slash + 1)}.rels`;
  if (!parts[path]) return new Map<string, string>();

  const targets = new Map<string, string>();
  for (const relationship of elements(xmlPart(parts[path]), "Relationship")) {
    const id = relationship.getAttribute("Id");
    const target = relationship.getAttribute("Target");
    if (!id || !target || relationship.getAttribute("TargetMode") === "External") continue;

    const url = new URL(target, `https://pptx.invalid/${source}`);
    if (url.origin !== "https://pptx.invalid" || !url.pathname.startsWith("/ppt/")) continue;
    targets.set(id, decodeURIComponent(url.pathname.slice(1)));
  }
  return targets;
}

function dataUrl(bytes: Uint8Array, mime: string) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function parseSlide(
  parts: Record<string, Uint8Array>,
  path: string,
  imageCache: Map<string, string>,
): DocumentPage {
  const slide = xmlPart(parts[path]);
  const text = elements(slide, "p")
    .map((paragraph) => Array.from(paragraph.children).map((run) =>
      run.localName === "br" ? "\n" : elements(run, "t").map((text) => text.textContent).join(""),
    ).join("").trim())
    .filter(Boolean)
    .join("\n");

  const targets = relationships(parts, path);
  const images: string[] = [];
  const seen = new Set<string>();
  let skippedImages = 0;
  for (const blip of elements(slide, "blip")) {
    const id = relationshipId(blip, "embed");
    if (!id) continue;
    const target = targets.get(id);
    if (!target) {
      skippedImages += 1;
      continue;
    }
    if (seen.has(target)) continue;
    seen.add(target);

    const bytes = parts[target];
    const mime = imageFormats[target.split(".").at(-1)?.toLowerCase() ?? ""];
    if (bytes?.length && bytes.length <= maxImageBytes && mime) {
      const url = imageCache.get(target) ?? dataUrl(bytes, mime);
      imageCache.set(target, url);
      images.push(url);
    } else {
      skippedImages += 1;
    }
  }
  return { text, images, skippedImages };
}

export async function extractPptx(file: File): Promise<ExtractedDocument> {
  if (file.size > DOCUMENT_LIMITS.maxBytes) {
    throw new Error("This PPTX is larger than the 10 MB demo limit.");
  }

  let expandedBytes = 0;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const parts = unzipSync(bytes, {
    filter(entry) {
      if (!entry.name.startsWith("ppt/")) return false;
      expandedBytes += entry.originalSize;
      if (expandedBytes > maxExpandedBytes) throw new Error("This PowerPoint expands beyond the demo limit.");
      return true;
    },
  });

  const presentationPath = "ppt/presentation.xml";
  const presentation = xmlPart(parts[presentationPath]);
  const targets = relationships(parts, presentationPath);
  const slideList = elements(presentation, "sldIdLst")[0];
  const slideIds = Array.from(slideList?.children ?? []).filter((node) => node.localName === "sldId");
  if (!slideIds.length) throw new Error("This PowerPoint has no slides.");
  if (slideIds.length > DOCUMENT_LIMITS.maxPages) {
    throw new Error(`The demo accepts up to ${DOCUMENT_LIMITS.maxPages} slides.`);
  }

  const imageCache = new Map<string, string>();
  const pages = slideIds.map((node) => {
    const path = targets.get(relationshipId(node, "id") ?? "");
    if (!path) throw new Error("A PowerPoint slide could not be located.");
    return parseSlide(parts, path, imageCache);
  });

  return {
    meta: { name: file.name, pageCount: pages.length, characterCount: countDocumentCharacters(pages) },
    pages,
  };
}
