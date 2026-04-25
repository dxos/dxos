//
// Copyright 2026 DXOS.org
//

import { type Clip } from '../clip/types';

/**
 * Show the serialized Clip payload to the user before delivery, with
 * [Send to Composer] and [Cancel] buttons. Resolves `true` when the user
 * confirms, `false` when they cancel.
 *
 * Mounted directly in the page (not the popup) so the user can inspect the
 * JSON without the flow being blocked by popup-close behavior. Activated
 * only when the `clip-debug` option is on.
 */
export const showDebugPreview = (clip: Clip): Promise<boolean> => {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.setAttribute('data-dxos-crx-picker', '');
    Object.assign(host.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0, 0, 0, 0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '2147483647',
      font: '13px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      color: '#111827',
    } as CSSStyleDeclaration);

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: '#fff',
      width: 'min(780px, 92vw)',
      maxHeight: '82vh',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '10px',
      boxShadow: '0 30px 60px -20px rgba(0, 0, 0, 0.5)',
      overflow: 'hidden',
    } as CSSStyleDeclaration);

    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: '12px 16px',
      borderBottom: '1px solid #e5e7eb',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
    } as CSSStyleDeclaration);
    const title = document.createElement('span');
    title.textContent = `Debug: Clip preview (${clip.kind})`;
    header.appendChild(title);
    const size = document.createElement('span');
    Object.assign(size.style, {
      fontSize: '12px',
      color: '#6b7280',
      fontWeight: '400',
    } as CSSStyleDeclaration);
    const json = JSON.stringify(clip, null, 2);
    size.textContent = `${json.length.toLocaleString()} chars`;
    header.appendChild(size);
    panel.appendChild(header);

    const body = document.createElement('pre');
    Object.assign(body.style, {
      margin: '0',
      padding: '16px',
      overflow: 'auto',
      flex: '1',
      background: '#f9fafb',
      font: '12px/1.55 ui-monospace, Menlo, Consolas, monospace',
      whiteSpace: 'pre',
      userSelect: 'text',
    } as CSSStyleDeclaration);
    body.textContent = json;
    panel.appendChild(body);

    const footer = document.createElement('div');
    Object.assign(footer.style, {
      padding: '12px 16px',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '8px',
    } as CSSStyleDeclaration);

    const makeBtn = (text: string, kind: 'primary' | 'secondary') => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      Object.assign(b.style, {
        padding: '8px 14px',
        borderRadius: '6px',
        border: kind === 'primary' ? '1px solid #1d4ed8' : '1px solid #d1d5db',
        background: kind === 'primary' ? '#2563eb' : '#fff',
        color: kind === 'primary' ? '#fff' : '#111827',
        font: 'inherit',
        fontWeight: '500',
        cursor: 'pointer',
      } as CSSStyleDeclaration);
      return b;
    };

    const copyBtn = makeBtn('Copy JSON', 'secondary');
    const cancelBtn = makeBtn('Cancel', 'secondary');
    const sendBtn = makeBtn('Send to Composer', 'primary');
    footer.append(copyBtn, cancelBtn, sendBtn);
    panel.appendChild(footer);

    host.appendChild(panel);
    document.body.appendChild(host);

    const cleanup = () => {
      host.remove();
      window.removeEventListener('keydown', onKey, true);
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        cleanup();
        resolve(false);
      } else if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
        ev.preventDefault();
        cleanup();
        resolve(true);
      }
    };
    window.addEventListener('keydown', onKey, true);

    copyBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      void navigator.clipboard?.writeText(json).catch(() => {
        /* ignore clipboard failures */
      });
      copyBtn.textContent = 'Copied';
      setTimeout(() => (copyBtn.textContent = 'Copy JSON'), 1200);
    });
    cancelBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      cleanup();
      resolve(false);
    });
    sendBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      cleanup();
      resolve(true);
    });
    // Backdrop click cancels.
    host.addEventListener('click', (ev) => {
      if (ev.target === host) {
        cleanup();
        resolve(false);
      }
    });
  });
};
