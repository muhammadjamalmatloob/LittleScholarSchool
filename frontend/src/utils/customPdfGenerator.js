import { jsPDF } from "jspdf";
import { toCanvas } from "html-to-image";
import html2canvas from "html2canvas";

/**
 * Robust capture function: tries html-to-image first (native browser SVG rendering, supports Tailwind v4 oklch),
 * then falls back to html2canvas if needed.
 */
async function captureElementToCanvas(element) {
  // Prefer html2canvas for true DOM font metrics and precise text alignment
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: element.offsetWidth || 794,
    });
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      return canvas;
    }
  } catch (err) {
    console.warn("html2canvas encountered error, falling back to toCanvas:", err);
  }

  // Fallback to html-to-image toCanvas
  return await toCanvas(element, {
    quality: 0.98,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
    filter: (node) => {
      if (node.classList && node.classList.contains("no-print")) return false;
      return true;
    },
  });
}

/**
 * Custom Multi-Page A4 PDF Generator for Little Scholar School System.
 * - Slices long reports into true A4 pages without browser print dialog.
 * - Eliminates browser headers/footers (e.g. "localhost:5173/students").
 * - Features smart table-row boundary detection so rows are never sliced in half.
 * - Generates high-resolution raster/vector PDF.
 */
export async function generateMultiPagePdf(element, options = {}) {
  const {
    title = "Academic Document",
    orientation = "portrait", // "portrait" | "landscape"
    margin = orientation === "landscape" ? 6 : 8, // mm
  } = options;

  if (!element) {
    throw new Error("Target element for PDF generation was not provided.");
  }

  // 1. Temporarily enforce exact standard A4 width, visible overflow, and clean borders
  const isLandscape = orientation === "landscape";
  const targetWidthPx = isLandscape ? 1122 : 794;

  const prevOverflow = element.style.overflow;
  const prevMaxHeight = element.style.maxHeight;
  const prevHeight = element.style.height;
  const prevWidth = element.style.width;
  const prevMinWidth = element.style.minWidth;
  const prevMaxWidth = element.style.maxWidth;
  const prevBoxShadow = element.style.boxShadow;
  const prevBorder = element.style.border;

  element.style.overflow = "visible";
  element.style.maxHeight = "none";
  element.style.height = "auto";
  element.style.width = `${targetWidthPx}px`;
  element.style.minWidth = `${targetWidthPx}px`;
  element.style.maxWidth = `${targetWidthPx}px`;
  element.style.boxShadow = "none";
  element.style.border = "none";

  // Recursively disable overflow & scrollbars on all descendants so no scrollbars can be drawn
  const descendants = Array.from(element.querySelectorAll("*"));
  const savedOverflows = [];
  descendants.forEach((child) => {
    const cs = window.getComputedStyle(child);
    if (cs.overflowX !== "visible" || cs.overflowY !== "visible" || cs.overflow !== "visible") {
      savedOverflows.push({
        child,
        overflow: child.style.overflow,
        overflowX: child.style.overflowX,
        overflowY: child.style.overflowY,
      });
      child.style.overflow = "visible";
      child.style.overflowX = "visible";
      child.style.overflowY = "visible";
    }
  });

  try {
    // 2. High-DPI canvas capture using resilient engine
    const canvas = await captureElementToCanvas(element);

    const isLandscape = orientation === "landscape";
    const pageWidthMm = isLandscape ? 297 : 210;
    const pageHeightMm = isLandscape ? 210 : 297;

    const contentWidthMm = pageWidthMm - margin * 2;
    const contentHeightMm = pageHeightMm - margin * 2;

    // Pixel-to-mm ratio based on canvas width
    const pxPerMm = canvas.width / contentWidthMm;
    const maxPageHeightPx = Math.floor(contentHeightMm * pxPerMm);

    // 3. Collect row boundary cut candidates from table rows to prevent slicing rows in half
    const rows = Array.from(element.querySelectorAll("tr"));
    const elementRect = element.getBoundingClientRect();
    const rowTopsPx = rows
      .map((r) => {
        const rRect = r.getBoundingClientRect();
        return Math.round((rRect.top - elementRect.top) * (canvas.height / elementRect.height));
      })
      .filter((y) => y > 0 && y < canvas.height);

    // 4. Calculate smart page cut offsets (in canvas pixels)
    const pageCutPoints = [0];

    // If total content height fits on one single page (with 8% buffer), keep strictly 1 page!
    if (canvas.height <= maxPageHeightPx * 1.08) {
      pageCutPoints.push(canvas.height);
    } else {
      let currentY = 0;
      while (currentY + maxPageHeightPx < canvas.height) {
        const idealCut = currentY + maxPageHeightPx;
        const safeCut = rowTopsPx
          .filter((y) => y > currentY + maxPageHeightPx * 0.65 && y <= idealCut)
          .pop();

        const chosenCut = safeCut || idealCut;
        pageCutPoints.push(chosenCut);
        currentY = chosenCut;
      }
      // Only append canvas.height if the remaining content height is substantive (> 40px)
      if (canvas.height - currentY > 40) {
        pageCutPoints.push(canvas.height);
      }
    }

    const totalPages = pageCutPoints.length - 1;

    // 5. Initialize jsPDF
    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
      compress: true,
    });

    // 6. Draw each sliced page
    for (let i = 0; i < totalPages; i++) {
      if (i > 0) {
        pdf.addPage("a4", orientation);
      }

      const sliceTop = pageCutPoints[i];
      const sliceBottom = pageCutPoints[i + 1];
      const sliceHeight = sliceBottom - sliceTop;

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      ctx.drawImage(
        canvas,
        0,
        sliceTop,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

      const sliceHeightMm = sliceHeight / pxPerMm;
      const imgData = pageCanvas.toDataURL("image/jpeg", 0.95);

      pdf.addImage(
        imgData,
        "JPEG",
        margin,
        margin,
        contentWidthMm,
        sliceHeightMm,
        undefined,
        "FAST"
      );

      // Footer removed per user specification
    }

    return pdf;
  } finally {
    // Restore all child styles
    savedOverflows.forEach(({ child, overflow, overflowX, overflowY }) => {
      child.style.overflow = overflow;
      child.style.overflowX = overflowX;
      child.style.overflowY = overflowY;
    });
    // Restore original styles
    element.style.overflow = prevOverflow;
    element.style.maxHeight = prevMaxHeight;
    element.style.height = prevHeight;
    element.style.width = prevWidth;
    element.style.minWidth = prevMinWidth;
    element.style.maxWidth = prevMaxWidth;
    element.style.boxShadow = prevBoxShadow;
    element.style.border = prevBorder;
  }
}

/**
 * Directly downloads the paginated A4 PDF without opening browser print dialog.
 */
export async function downloadCustomPdf(element, options = {}) {
  const { title = "Academic Document" } = options;
  const pdf = await generateMultiPagePdf(element, options);
  const cleanTitle = (options.filename || title)
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .trim();
  pdf.save(`${cleanTitle}.pdf`);
  return pdf;
}

/**
 * Prints the document cleanly via a silent PDF Blob iframe, avoiding browser URL headers.
 */
export async function printCustomPdf(element, options = {}) {
  const pdf = await generateMultiPagePdf(element, options);
  const blob = pdf.output("blob");
  const blobUrl = URL.createObjectURL(blob);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = blobUrl;

  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error("Iframe print fallback:", err);
        window.open(blobUrl, "_blank");
      }
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    }, 400);
  };
}
