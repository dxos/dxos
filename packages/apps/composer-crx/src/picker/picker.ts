//
// Copyright 2026 DXOS.org
//

import browser from 'webextension-polyfill';

import { Domino } from '@dxos/ui';

import { type ClipKind } from '../clip';
import { CLIP_KINDS, type ClipKindDef } from './kinds';

const ROOT_ATTR = 'data-dxos-crx-picker';
const Z_TOP = Number.MAX_SAFE_INTEGER.toString();

/**
 * Result of a user interaction with the picker. The click resolves with
 * either a picked element + kind, or `cancelled` when the user hits Esc.
 */
export type PickerResult = { status: 'picked'; element: Element; kind: ClipKind } | { status: 'cancelled' };

// Resolve the icon sprite shipped with the extension so `Domino.svg()` works
// when this module is imported from a content script on an arbitrary page.
// Set once, lazily, the first time `startPicker()` runs.
let iconsUrlConfigured = false;
const configureIcons = () => {
  if (iconsUrlConfigured) {
    return;
  }
  iconsUrlConfigured = true;
  const url = browser.runtime?.getURL?.('icons.svg');
  if (url) {
    Domino.iconsUrl = url;
  }
};

// Inline style blocks — grouped as readonly constants so the build code below
// reads declaratively.
const S_HOST: Partial<CSSStyleDeclaration> = {
  all: 'initial',
  position: 'fixed',
  inset: '0',
  pointerEvents: 'none',
  zIndex: Z_TOP,
};

const S_OUTLINE: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  boxSizing: 'border-box',
  pointerEvents: 'none',
  borderRadius: '2px',
  transition: 'none',
  display: 'none',
};

const S_LABEL: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  pointerEvents: 'none',
  font: '12px/1.4 ui-monospace, Menlo, Consolas, monospace',
  color: '#fff',
  background: '#3b82f6',
  padding: '1px 6px',
  borderRadius: '3px',
  whiteSpace: 'nowrap',
  display: 'none',
};

const S_TOOLBAR: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  display: 'none',
  gap: '6px',
  padding: '6px',
  background: '#111827',
  color: '#fff',
  borderRadius: '8px',
  boxShadow: '0 10px 25px -10px rgba(0,0,0,0.5)',
  font: '13px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  pointerEvents: 'auto',
  alignItems: 'center',
};

const S_BTN: Partial<CSSStyleDeclaration> = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  background: '#1f2937',
  color: '#fff',
  border: '1px solid #374151',
  padding: '6px 10px',
  borderRadius: '6px',
  font: 'inherit',
  cursor: 'pointer',
};

const OUTLINE_HOVER = { border: '2px solid #3b82f6', background: 'rgba(59, 130, 246, 0.08)' } as const;
const OUTLINE_FROZEN = { border: '2px solid #2563eb', background: 'rgba(37, 99, 235, 0.08)' } as const;

const createButton = (label: string, iconName: string | null, onClick: () => void) => {
  const btn = Domino.of('button').attributes({ type: 'button' }).style(S_BTN);
  if (iconName) {
    btn.append(Domino.svg(iconName).style({ width: '16px', height: '16px' }));
  }
  btn.append(Domino.of('span').text(label));
  btn.on(
    'click',
    (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      onClick();
    },
    true,
  );
  return btn;
};

const describeElement = (el: Element, width: number, height: number): string => {
  const tag = el.tagName.toLowerCase();
  const className = typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '';
  const cls = className ? '.' + className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.') : '';
  return `${tag}${cls} · ${Math.round(width)}×${Math.round(height)}`;
};

/**
 * Start picker mode in the current tab. Builds the overlay via `Domino`
 * inside a Shadow DOM — keeps the host page's CSS cascade out of our UI and
 * re-targets any event we dispatch to our own host element so hit-testing
 * never picks our own chrome.
 *
 * Idempotent — a second call while one is active returns the same promise.
 */
let active: Promise<PickerResult> | null = null;

export const startPicker = (): Promise<PickerResult> => {
  if (active) {
    return active;
  }
  configureIcons();

  active = new Promise<PickerResult>((resolve) => {
    const hostDomino = Domino.of('div')
      .attributes({ [ROOT_ATTR]: '' })
      .style(S_HOST);
    const host = hostDomino.root;
    const shadow = host.attachShadow({ mode: 'open' });

    const outline = Domino.of('div').style(S_OUTLINE).mount(shadow);
    const label = Domino.of('div').style(S_LABEL).mount(shadow);
    const toolbar = Domino.of('div').style(S_TOOLBAR).mount(shadow);

    document.body.appendChild(host);

    // State — mutable because the overlay redraws imperatively on every
    // mousemove / key event. Scoping to the closure keeps it contained.
    let current: Element | null = null;
    let frozen: Element | null = null;
    let raf: number | null = null;

    // `isOwned` guards hit-testing + click handlers: Shadow DOM retargets
    // any event from inside the shadow tree to the host element, so an event
    // whose target is our host came from our own UI.
    const isOwned = (el: Element | null): boolean => !el || el === host;

    const drawOutline = (rect: DOMRect, isFrozen: boolean) => {
      Object.assign(outline.root.style, {
        display: 'block',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        ...(isFrozen ? OUTLINE_FROZEN : OUTLINE_HOVER),
      });
    };

    const drawLabel = (el: Element, rect: DOMRect) => {
      label.root.textContent = describeElement(el, rect.width, rect.height);
      Object.assign(label.root.style, {
        display: 'inline-block',
        left: `${rect.left}px`,
        top: `${Math.max(0, rect.top - 22)}px`,
      });
    };

    const hideLabel = () => {
      label.root.style.display = 'none';
    };

    const positionToolbar = (rect: DOMRect) => {
      const tb = toolbar.root;
      tb.style.display = 'flex';
      tb.style.visibility = 'hidden';
      const tbRect = tb.getBoundingClientRect();
      const margin = 8;
      let top = rect.bottom + margin;
      if (top + tbRect.height > window.innerHeight) {
        top = Math.max(margin, rect.top - tbRect.height - margin);
      }
      let left = rect.left;
      if (left + tbRect.width > window.innerWidth) {
        left = Math.max(margin, window.innerWidth - tbRect.width - margin);
      }
      tb.style.top = `${top}px`;
      tb.style.left = `${left}px`;
      tb.style.visibility = 'visible';
    };

    const populateToolbar = (kinds: readonly ClipKindDef[], el: Element) => {
      toolbar.root.replaceChildren();
      for (const def of kinds) {
        toolbar.append(
          createButton(def.label, def.icon, () => finish({ status: 'picked', element: el, kind: def.kind })),
        );
      }
      toolbar.append(createButton('Cancel', null, () => finish({ status: 'cancelled' })));
    };

    const freeze = (el: Element) => {
      frozen = el;
      const rect = el.getBoundingClientRect();
      drawOutline(rect, true);
      hideLabel();
      populateToolbar(CLIP_KINDS, el);
      positionToolbar(rect);
    };

    const onMove = (ev: MouseEvent) => {
      if (frozen) {
        return;
      }
      if (raf != null) {
        cancelAnimationFrame(raf);
      }
      raf = requestAnimationFrame(() => {
        const target = document.elementFromPoint(ev.clientX, ev.clientY);
        if (!target || isOwned(target)) {
          return;
        }
        current = target;
        const rect = target.getBoundingClientRect();
        drawOutline(rect, false);
        drawLabel(target, rect);
      });
    };

    const onClick = (ev: MouseEvent) => {
      if (frozen) {
        // Outside-toolbar click cancels.
        if (isOwned(ev.target as Element)) {
          return;
        }
        ev.preventDefault();
        ev.stopPropagation();
        finish({ status: 'cancelled' });
        return;
      }
      // Prefer the arrow-widened selection when it's still present, else hit
      // test under the cursor. Without this, widening with ↑ and clicking
      // would freeze the deepest element instead of the widened ancestor.
      const widened = current && document.contains(current) && !isOwned(current) ? current : undefined;
      const target = widened ?? document.elementFromPoint(ev.clientX, ev.clientY);
      if (!target || isOwned(target)) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      freeze(target);
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        finish({ status: 'cancelled' });
        return;
      }
      if (frozen || !current) {
        return;
      }
      if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        const next = current.parentElement;
        if (next && !isOwned(next)) {
          current = next;
          const rect = next.getBoundingClientRect();
          drawOutline(rect, false);
          drawLabel(next, rect);
        }
      } else if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        const next = current.firstElementChild;
        if (next && !isOwned(next)) {
          current = next;
          const rect = next.getBoundingClientRect();
          drawOutline(rect, false);
          drawLabel(next, rect);
        }
      }
    };

    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey, true);

    const finish = (result: PickerResult) => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey, true);
      if (raf != null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      host.remove();
      active = null;
      resolve(result);
    };
  });

  return active;
};

/**
 * Test-only helper: reset the active guard so a subsequent `startPicker`
 * call creates a fresh instance. Not used in production.
 */
export const __resetPickerForTests = (): void => {
  active = null;
};
