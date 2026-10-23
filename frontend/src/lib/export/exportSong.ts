export interface ExportSongOptions {
  element: HTMLElement;
  title: string;
  artist?: string | null;
  currentKey?: string | null;
}

export function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

/**
 * Capture full element to high-res PNG snapshot
 */
export async function exportSongAsPng({
  element,
  title,
  currentKey,
}: ExportSongOptions): Promise<void> {
  const safeName = sanitizeFileName(title);
  const keyPart = currentKey ? `-${sanitizeFileName(currentKey)}` : '';
  const fileName = `${safeName}${keyPart}.png`;

  const html2canvasModule = await import('html2canvas');
  const html2canvas = html2canvasModule.default || html2canvasModule;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: element.scrollWidth,
    onclone: (clonedDoc) => {
      // Force clean white background and light-mode tokens in snapshot export
      clonedDoc.documentElement.classList.remove('dark');
      const printHidden = clonedDoc.querySelectorAll('.print\\:hidden');
      printHidden.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });
    },
  });

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Capture element and compile into paginated A4 PDF
 */
export async function exportSongAsPdf({
  element,
  title,
  currentKey,
}: ExportSongOptions): Promise<void> {
  const safeName = sanitizeFileName(title);
  const keyPart = currentKey ? `-${sanitizeFileName(currentKey)}` : '';
  const fileName = `${safeName}${keyPart}.pdf`;

  const html2canvasModule = await import('html2canvas');
  const html2canvas = html2canvasModule.default || html2canvasModule;
  const jspdfModule = await import('jspdf');
  const jsPDF = jspdfModule.jsPDF || (jspdfModule as any).default;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: element.scrollWidth,
    onclone: (clonedDoc) => {
      // Force clean white background and light-mode tokens in PDF export
      clonedDoc.documentElement.classList.remove('dark');
      const printHidden = clonedDoc.querySelectorAll('.print\\:hidden');
      printHidden.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });
    },
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF('p', 'mm', 'a4');

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
  const margin = 10; // 10mm margin
  const contentWidth = pdfWidth - margin * 2; // 190mm
  const contentHeight = (canvas.height * contentWidth) / canvas.width;

  let heightLeft = contentHeight;
  let position = margin;
  let page = 1;

  // First page
  pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
  heightLeft -= pdfHeight - margin * 2;

  // Add subsequent pages if long song
  while (heightLeft > 0) {
    position = margin - page * (pdfHeight - margin * 2);
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
    page++;
    heightLeft -= pdfHeight - margin * 2;
  }

  pdf.save(fileName);
}
