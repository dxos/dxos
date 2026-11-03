//
// Copyright 2026 DXOS.org
//

/** Neutral document styling, since the app's stylesheet is not loaded into the print frame. */
const PRINT_STYLE = `
  body {
    font-family: system-ui, sans-serif; font-size: 11pt; line-height: 1.5; color: #000;
    margin: 0; padding: 16mm;
    -webkit-box-decoration-break: clone; box-decoration-break: clone;
  }
  h1, h2, h3, h4, h5, h6 { line-height: 1.25; break-after: avoid; }
  pre, code { font-family: ui-monospace, monospace; font-size: 10pt; }
  pre { white-space: pre-wrap; padding: 8px; background: #f4f4f4; }
  img, svg { max-width: 100%; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #eee; }
  tr { break-inside: avoid; }
  figure { margin: 1em 0; }
  figcaption { font-weight: 600; margin-bottom: 0.5em; }
  /* Browsers print the URL, title and page number in the page margin, so the margin moves to the body. */
  @page { margin: 0; }
`;

/** Escape text for an HTML element body or quoted attribute. */
export const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A plain HTML table of text cells, for printing tabular objects. */
export const htmlTable = (rows: readonly (readonly string[])[], { header }: { header?: readonly string[] } = {}) => {
  const cells = (tag: string, values: readonly string[]) =>
    values.map((value) => `<${tag}>${escapeHtml(value)}</${tag}>`).join('');
  const head = header ? `<thead><tr>${cells('th', header)}</tr></thead>` : '';
  const body = rows.map((row) => `<tr>${cells('td', row)}</tr>`).join('');
  return `<table>${head}<tbody>${body}</tbody></table>`;
};

/**
 * Print an HTML fragment through the browser's print dialog, whose destinations include Save as PDF.
 * Uses a hidden frame so the app's own layout is not what gets printed.
 */
export const printHtml = async (html: string, { title = '', style = '' }: { title?: string; style?: string } = {}) => {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.visibility = 'hidden';
  // No `allow-scripts`: the fragment is rendered markup only, so nothing in it may run with the app's origin.
  frame.sandbox.add('allow-same-origin', 'allow-modals');
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_STYLE}${style}</style></head><body>${html}</body></html>`;

  await new Promise<void>((resolve) => {
    frame.addEventListener('load', () => resolve(), { once: true });
    document.body.appendChild(frame);
  });

  const view = frame.contentWindow;
  if (!view) {
    frame.remove();
    return;
  }

  // The dialog's title defaults to the top document's, so the PDF would otherwise be named after the app.
  const previousTitle = document.title;
  if (title) {
    document.title = title;
  }
  try {
    view.focus();
    view.print();
  } finally {
    document.title = previousTitle;
    // Removing the frame while the dialog is open cancels the job in some engines.
    setTimeout(() => frame.remove(), 1_000);
  }
};
