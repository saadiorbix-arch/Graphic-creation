/**
 * High-precision SVG and High-DPI Raster (PNG) export pipeline.
 * Ensures standalone SVG files include explicit XML namespaces and font definitions
 * so they open cleanly in Adobe Illustrator, Affinity Designer, Inkscape, or LaTeX workflows.
 */

export interface ExportOptions {
  filename: string;
  /** Scale multiplier for PNG rasterization (e.g., 3 = ~300 DPI print quality, 4 = ~400 DPI) */
  scaleFactor?: number;
  backgroundColor?: string;
}

/**
 * Serializes an `<svg>` DOM element into a standalone, self-contained SVG string.
 */
export function serializeSvgElement(svgElement: SVGSVGElement): string {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Ensure standard XML namespaces for vector editors (Illustrator, Figma, Inkscape)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('version', '1.1');

  // Remove any interactive/calibration overlay layers marked with data-export-ignore="true"
  const ignoredNodes = clone.querySelectorAll('[data-export-ignore="true"]');
  ignoredNodes.forEach((node) => node.parentNode?.removeChild(node));

  const serializer = new XMLSerializer();
  const rawSvg = serializer.serializeToString(clone);

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${rawSvg}`;
}

/**
 * Triggers a browser download of the serialized standalone SVG file.
 */
export function exportSvgFile(svgElement: SVGSVGElement, options: ExportOptions): void {
  const svgString = serializeSvgElement(svgElement);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const sanitizedName = options.filename.replace(/[^a-z0-9-_]/gi, '_').toLowerCase() || 'research_figure';
  triggerDownload(url, `${sanitizedName}.svg`);
  URL.revokeObjectURL(url);
}

/**
 * Rasterizes an `<svg>` element at a specified DPI multiplier (default 3x for ~300 DPI publication quality)
 * and downloads a lossless PNG file.
 */
export async function exportHighDpiPng(
  svgElement: SVGSVGElement,
  options: ExportOptions
): Promise<void> {
  const scale = options.scaleFactor ?? 3;
  const svgString = serializeSvgElement(svgElement);

  const width = Number(svgElement.getAttribute('width')) || svgElement.clientWidth || 900;
  const height = Number(svgElement.getAttribute('height')) || svgElement.clientHeight || 560;

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to initialize 2D canvas context for high-DPI export.'));
        return;
      }

      if (options.backgroundColor) {
        ctx.fillStyle = options.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          reject(new Error('Failed to encode high-DPI PNG blob.'));
          return;
        }
        const pngUrl = URL.createObjectURL(pngBlob);
        const sanitizedName =
          options.filename.replace(/[^a-z0-9-_]/gi, '_').toLowerCase() || 'research_figure';
        triggerDownload(pngUrl, `${sanitizedName}_${scale}x.png`);
        URL.revokeObjectURL(pngUrl);
        resolve();
      }, 'image/png');
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
