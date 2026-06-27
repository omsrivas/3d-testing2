/** Export utilities for the floor plan SVG */

function svgToString(svg: SVGSVGElement): string {
  const serializer = new XMLSerializer();
  let str = serializer.serializeToString(svg);
  // Ensure XML declaration & namespace
  if (!str.startsWith("<?xml")) {
    str = `<?xml version="1.0" encoding="utf-8"?>\n` + str;
  }
  return str;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Download the SVG as an .svg file */
export function exportSVG(svg: SVGSVGElement, filename = "floor-plan.svg") {
  const str  = svgToString(svg);
  const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, filename);
}

/** Download the SVG rendered to a PNG at 2× resolution */
export function exportPNG(
  svg: SVGSVGElement,
  filename = "floor-plan.png",
  scale = 2,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const str  = svgToString(svg);
    const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
    const url  = URL.createObjectURL(blob);

    const img  = new Image();
    img.onload = () => {
      const w = svg.width.baseVal.value * scale;
      const h = svg.height.baseVal.value * scale;
      const canvas  = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#F8F5EF";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob2 => {
        if (!blob2) { reject(new Error("PNG export failed")); return; }
        downloadBlob(blob2, filename);
        resolve();
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("SVG load failed")); };
    img.src = url;
  });
}

/** Open a print dialog with only the SVG floor plan visible */
export function exportPDF(svg: SVGSVGElement, title = "Floor Plan") {
  const str = svgToString(svg);
  const w   = window.open("", "_blank");
  if (!w) { alert("Please allow pop-ups to export PDF."); return; }
  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #fff; }
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    svg { max-width: 100%; max-height: 100vh; }
    @media print {
      body { display: block; }
      svg { width: 100%; height: auto; }
      @page { size: A3 landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  ${str}
  <script>window.onload = () => { setTimeout(() => window.print(), 500); }<\/script>
</body>
</html>`);
  w.document.close();
}
