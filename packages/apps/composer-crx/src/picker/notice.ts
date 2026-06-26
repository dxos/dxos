//
// Copyright 2026 DXOS.org
//

const NOTICE_TTL_MS = 4_000;

/**
 * Transient in-page notice for picker flows that cannot proceed. The popup is
 * already closed when the picker runs, so an in-page element is the only
 * feedback surface available to the content script.
 */
export const showPickerNotice = (message: string): void => {
  const host = document.createElement('div');
  host.setAttribute('data-dxos-crx-picker', '');
  Object.assign(host.style, {
    position: 'fixed',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '2147483647',
    background: '#111827',
    color: '#fff',
    padding: '8px 14px',
    borderRadius: '8px',
    boxShadow: '0 10px 25px -10px rgba(0,0,0,0.5)',
    font: '13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    pointerEvents: 'none',
  });
  host.textContent = message;
  document.body.appendChild(host);
  setTimeout(() => host.remove(), NOTICE_TTL_MS);
};
