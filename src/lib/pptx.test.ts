import { strToU8, zipSync } from "fflate";
import { expect, it } from "vitest";
import { extractPptx } from "./pptx";

it("reads slide order, text runs, and the embedded image on its own slide", async () => {
  const rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const drawing = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const presentation = "http://schemas.openxmlformats.org/presentationml/2006/main";
  const packageRel = "http://schemas.openxmlformats.org/package/2006/relationships";
  const xml = (content: string) => new Uint8Array(strToU8(content));
  const parts = {
    "ppt/presentation.xml": xml(`<p:presentation xmlns:p="${presentation}" xmlns:r="${rel}">
      <p:sldIdLst><p:sldId r:id="r2"/><p:sldId r:id="r1"/></p:sldIdLst>
    </p:presentation>`),
    "ppt/_rels/presentation.xml.rels": xml(`<Relationships xmlns="${packageRel}">
      <Relationship Id="r1" Target="slides/slide1.xml"/>
      <Relationship Id="r2" Target="slides/slide2.xml"/>
    </Relationships>`),
    "ppt/slides/slide1.xml": xml(`<p:sld xmlns:p="${presentation}" xmlns:a="${drawing}">
      <a:p><a:r><a:t>Slide in second position</a:t></a:r></a:p>
    </p:sld>`),
    "ppt/slides/slide2.xml": xml(`<p:sld xmlns:p="${presentation}" xmlns:a="${drawing}" xmlns:r="${rel}">
      <a:p><a:r><a:t xml:space="preserve">First </a:t></a:r><a:r><a:t>slide</a:t></a:r>
      <a:br/><a:r><a:t>Second line</a:t></a:r></a:p>
      <a:blip r:embed="image"/>
    </p:sld>`),
    "ppt/slides/_rels/slide2.xml.rels": xml(`<Relationships xmlns="${packageRel}">
      <Relationship Id="image" Target="../media/image.png"/>
    </Relationships>`),
    "ppt/media/image.png": new Uint8Array([137, 80, 78, 71]),
  };
  const file = new File([new Uint8Array(zipSync(parts))], "lecture.pptx");
  const result = await extractPptx(file);

  expect(result.meta.pageCount).toBe(2);
  expect(result.pages).toMatchObject([
    { text: "First slide\nSecond line", images: ["data:image/png;base64,iVBORw=="] },
    { text: "Slide in second position", images: [] },
  ]);
});
