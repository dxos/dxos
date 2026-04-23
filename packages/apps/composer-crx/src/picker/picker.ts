//
// Copyright 2026 DXOS.org
//

import { type ClipKind } from '../clip/types';

const ROOT_ATTR = 'data-dxos-crx-picker';

/**
 * Result of a user interaction with the picker. The click resolves with
 * either a picked element + kind, or `cancelled` when the user hits Esc.
 */
export type PickerResult = { status: 'picked'; element: Element; kind: ClipKind } | { status: 'cancelled' };

type PickerState = {
  current: Element | null;
  frozen: Element | null;
  outline: HTMLElement;
  label: HTMLElement;
  toolbar: HTMLElement;
  host: HTMLElement;
  resolve: (r: PickerResult) => void;
  raf: number | null;
};

const applyBoxStyle = (el: HTMLElement) => {
  const s = el.style;
  s.position = 'fixed';
  s.boxSizing = 'border-box';
  s.pointerEvents = 'none';
  s.zIndex = '2147483646';
  s.transition = 'none';
};

const isPickerOwned = (el: Element | null): boolean => !!el && !!(el as HTMLElement).closest?.(`[${ROOT_ATTR}]`);

const updateOutline = (state: PickerState, target: Element): void => {
  const rect = (target as HTMLElement).getBoundingClientRect();
  Object.assign(state.outline.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  const tag = target.tagName.toLowerCase();
  const cls = (target as HTMLElement).className
    ? `.${String((target as HTMLElement).className)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join('.')}`
    : '';
  state.label.textContent = `${tag}${cls} · ${Math.round(rect.width)}×${Math.round(rect.height)}`;
  Object.assign(state.label.style, {
    left: `${rect.left}px`,
    top: `${Math.max(0, rect.top - 22)}px`,
    display: 'inline-block',
  });
};

const positionToolbar = (state: PickerState, target: Element): void => {
  const rect = (target as HTMLElement).getBoundingClientRect();
  const margin = 8;
  const tb = state.toolbar;
  tb.style.display = 'flex';
  tb.style.visibility = 'hidden';
  // Force layout to get toolbar size.
  const tbRect = tb.getBoundingClientRect();
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  let top = rect.bottom + margin;
  if (top + tbRect.height > viewportH) {
    top = Math.max(margin, rect.top - tbRect.height - margin);
  }
  let left = rect.left;
  if (left + tbRect.width > viewportW) {
    left = Math.max(margin, viewportW - tbRect.width - margin);
  }
  tb.style.left = `${left}px`;
  tb.style.top = `${top}px`;
  tb.style.visibility = 'visible';
};

const freeze = (state: PickerState, el: Element): void => {
  state.frozen = el;
  state.outline.style.borderColor = '#2563eb';
  state.outline.style.background = 'rgba(37, 99, 235, 0.08)';
  positionToolbar(state, el);
};

/**
 * Start picker mode on the page. Returns a promise that resolves when the
 * user picks (+ labels) an element or cancels via Esc.
 *
 * Idempotent — a second call while one is active returns the same promise.
 */
let active: Promise<PickerResult> | null = null;

export const startPicker = (): Promise<PickerResult> => {
  if (active) {
    return active;
  }

  active = new Promise<PickerResult>((resolve) => {
    const host = document.createElement('div');
    host.setAttribute(ROOT_ATTR, '');
    host.style.all = 'initial';
    host.style.position = 'fixed';
    host.style.inset = '0';
    host.style.pointerEvents = 'none';
    host.style.zIndex = '2147483647';

    const outline = document.createElement('div');
    applyBoxStyle(outline);
    outline.style.border = '2px solid #3b82f6';
    outline.style.background = 'rgba(59, 130, 246, 0.08)';
    outline.style.borderRadius = '2px';
    host.appendChild(outline);

    const label = document.createElement('div');
    applyBoxStyle(label);
    label.style.display = 'none';
    label.style.font = '12px/1.4 ui-monospace, Menlo, Consolas, monospace';
    label.style.color = '#fff';
    label.style.background = '#3b82f6';
    label.style.padding = '1px 6px';
    label.style.borderRadius = '3px';
    label.style.whiteSpace = 'nowrap';
    host.appendChild(label);

    const toolbar = document.createElement('div');
    toolbar.style.position = 'fixed';
    toolbar.style.display = 'none';
    toolbar.style.gap = '6px';
    toolbar.style.padding = '6px';
    toolbar.style.background = '#111827';
    toolbar.style.color = '#fff';
    toolbar.style.borderRadius = '8px';
    toolbar.style.boxShadow = '0 10px 25px -10px rgba(0,0,0,0.5)';
    toolbar.style.font = '13px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    toolbar.style.pointerEvents = 'auto';
    toolbar.style.zIndex = '2147483647';
    toolbar.style.alignItems = 'center';

    const makeBtn = (text: string, onClick: () => void) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.style.background = '#1f2937';
      b.style.color = '#fff';
      b.style.border = '1px solid #374151';
      b.style.padding = '6px 10px';
      b.style.borderRadius = '6px';
      b.style.font = 'inherit';
      b.style.cursor = 'pointer';
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        onClick();
      });
      return b;
    };

    const savePerson = makeBtn('👤 Person', () => finish({ status: 'picked', element: state.frozen!, kind: 'person' }));
    const saveOrg = makeBtn('🏢 Organization', () =>
      finish({ status: 'picked', element: state.frozen!, kind: 'organization' }),
    );
    const cancelBtn = makeBtn('✕', () => finish({ status: 'cancelled' }));
    toolbar.append(savePerson, saveOrg, cancelBtn);
    host.appendChild(toolbar);

    const state: PickerState = {
      current: null,
      frozen: null,
      outline,
      label,
      toolbar,
      host,
      resolve,
      raf: null,
    };

    const finish = (result: PickerResult) => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey, true);
      host.remove();
      active = null;
      state.resolve(result);
    };

    const onMove = (ev: MouseEvent) => {
      if (state.frozen) {
        return;
      }
      if (state.raf != null) {
        cancelAnimationFrame(state.raf);
      }
      state.raf = requestAnimationFrame(() => {
        const target = document.elementFromPoint(ev.clientX, ev.clientY);
        if (!target || isPickerOwned(target)) {
          return;
        }
        state.current = target;
        updateOutline(state, target);
      });
    };

    const onClick = (ev: MouseEvent) => {
      if (state.frozen) {
        // Dismiss if click is outside the toolbar. Suppress the click so it
        // doesn't activate an underlying link/button on the page.
        if (!isPickerOwned(ev.target as Element)) {
          ev.preventDefault();
          ev.stopPropagation();
          finish({ status: 'cancelled' });
        }
        return;
      }
      // Prefer the arrow-key-widened selection in `state.current` when it is
      // still present, falling back to hit-testing under the cursor. Without
      // this, widening with ↑ then clicking would freeze the original
      // deepest element instead of the widened ancestor.
      const widened =
        state.current && document.contains(state.current) && !isPickerOwned(state.current) ? state.current : undefined;
      const target = widened ?? document.elementFromPoint(ev.clientX, ev.clientY);
      if (!target || isPickerOwned(target)) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      freeze(state, target);
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        finish({ status: 'cancelled' });
        return;
      }
      if (!state.frozen && state.current && (ev.key === 'ArrowUp' || ev.key === 'ArrowDown')) {
        ev.preventDefault();
        const next = ev.key === 'ArrowUp' ? state.current.parentElement : state.current.firstElementChild;
        if (next && !isPickerOwned(next)) {
          state.current = next;
          updateOutline(state, next);
        }
      }
    };

    document.body.appendChild(host);
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey, true);
  });

  return active;
};

/**
 * Test-only helper: reset the active promise guard so a subsequent
 * `startPicker` call creates a fresh instance. Not used in production.
 */
export const __resetPickerForTests = (): void => {
  active = null;
};
