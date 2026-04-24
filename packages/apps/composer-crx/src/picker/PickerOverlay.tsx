//
// Copyright 2026 DXOS.org
//

import React, { type CSSProperties, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { type ClipKindDef } from './kinds';
import { type PickerResult } from './types';

export type PickerOverlayProps = {
  kinds: readonly ClipKindDef[];
  /**
   * The Shadow DOM host on the page. Used so hit-testing can reject events
   * that originate from the picker's own UI (Shadow DOM retargets those to
   * the host element when they cross the shadow boundary).
   */
  hostEl: Element;
  onResult: (result: PickerResult) => void;
};

type Rect = { x: number; y: number; width: number; height: number };

const toRect = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
};

const OUTLINE_BASE: CSSProperties = {
  position: 'fixed',
  boxSizing: 'border-box',
  pointerEvents: 'none',
  borderRadius: 2,
  transition: 'none',
  zIndex: 2147483646,
};

const LABEL_STYLE: CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  font: '12px/1.4 ui-monospace, Menlo, Consolas, monospace',
  color: '#fff',
  background: '#3b82f6',
  padding: '1px 6px',
  borderRadius: 3,
  whiteSpace: 'nowrap',
  zIndex: 2147483647,
};

const TOOLBAR_STYLE: CSSProperties = {
  position: 'fixed',
  display: 'flex',
  gap: 6,
  padding: 6,
  background: '#111827',
  color: '#fff',
  borderRadius: 8,
  boxShadow: '0 10px 25px -10px rgba(0,0,0,0.5)',
  font: '13px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  pointerEvents: 'auto',
  alignItems: 'center',
  zIndex: 2147483647,
};

const BTN_STYLE: CSSProperties = {
  background: '#1f2937',
  color: '#fff',
  border: '1px solid #374151',
  padding: '6px 10px',
  borderRadius: 6,
  font: 'inherit',
  cursor: 'pointer',
};

/**
 * React overlay that drives the DOM-picking flow.
 *
 * Owns hit-testing state (hovered / frozen element), renders the highlight
 * outline + a label chip describing the hover target, and when the user
 * clicks to freeze a selection, shows a floating toolbar built from the
 * `kinds` prop (+ a cancel button). Fires `onResult` once on pick or cancel.
 */
export const PickerOverlay = ({ kinds, hostEl, onResult }: PickerOverlayProps) => {
  const [current, setCurrent] = useState<Element | null>(null);
  const [frozen, setFrozen] = useState<Element | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // `hostEl` is the shadow host. Events from inside the shadow tree get
  // retargeted to it at the window level; `document.elementFromPoint`
  // likewise returns the host (Shadow DOM doesn't pierce by default).
  const isOwned = useCallback((el: Element | null): boolean => !el || el === hostEl, [hostEl]);

  const finish = useCallback((result: PickerResult) => onResult(result), [onResult]);

  useEffect(() => {
    const onMove = (ev: MouseEvent) => {
      if (frozen) {
        return;
      }
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        const target = document.elementFromPoint(ev.clientX, ev.clientY);
        if (!target || isOwned(target)) {
          return;
        }
        setCurrent(target);
        setRect(toRect(target));
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
      setFrozen(target);
      setRect(toRect(target));
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
          setCurrent(next);
          setRect(toRect(next));
        }
      } else if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        const next = current.firstElementChild;
        if (next && !isOwned(next)) {
          setCurrent(next);
          setRect(toRect(next));
        }
      }
    };

    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey, true);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [current, frozen, isOwned, finish]);

  // Position the toolbar after it mounts. Render invisibly first so we can
  // measure, then flip to visible once positioned — avoids a one-frame flash
  // at the viewport origin.
  useLayoutEffect(() => {
    if (!frozen || !rect) {
      setToolbarPos(null);
      return;
    }
    const tbEl = toolbarRef.current;
    if (!tbEl) {
      return;
    }
    const tbRect = tbEl.getBoundingClientRect();
    const margin = 8;
    let top = rect.y + rect.height + margin;
    if (top + tbRect.height > window.innerHeight) {
      top = Math.max(margin, rect.y - tbRect.height - margin);
    }
    let left = rect.x;
    if (left + tbRect.width > window.innerWidth) {
      left = Math.max(margin, window.innerWidth - tbRect.width - margin);
    }
    setToolbarPos({ top, left });
  }, [frozen, rect]);

  const outlineStyle: CSSProperties = rect
    ? {
        ...OUTLINE_BASE,
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        border: frozen ? '2px solid #2563eb' : '2px solid #3b82f6',
        background: frozen ? 'rgba(37, 99, 235, 0.08)' : 'rgba(59, 130, 246, 0.08)',
      }
    : { ...OUTLINE_BASE, display: 'none' };

  const labelText = current
    ? (() => {
        const tag = current.tagName.toLowerCase();
        const className =
          typeof (current as HTMLElement).className === 'string' ? (current as HTMLElement).className : '';
        const cls = className ? '.' + className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.') : '';
        const r = rect ?? toRect(current);
        return `${tag}${cls} · ${Math.round(r.width)}×${Math.round(r.height)}`;
      })()
    : '';

  const labelStyle: CSSProperties = rect
    ? { ...LABEL_STYLE, left: rect.x, top: Math.max(0, rect.y - 22) }
    : { ...LABEL_STYLE, display: 'none' };

  return (
    <>
      <div style={outlineStyle} />
      {!frozen && current && <div style={labelStyle}>{labelText}</div>}
      {frozen && (
        <div
          ref={toolbarRef}
          style={{
            ...TOOLBAR_STYLE,
            top: toolbarPos?.top ?? 0,
            left: toolbarPos?.left ?? 0,
            visibility: toolbarPos ? 'visible' : 'hidden',
          }}
        >
          {kinds.map((k) => (
            <button
              key={k.kind}
              type='button'
              style={BTN_STYLE}
              onClick={(ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                finish({ status: 'picked', element: frozen, kind: k.kind });
              }}
            >
              {k.icon} {k.label}
            </button>
          ))}
          <button
            type='button'
            style={BTN_STYLE}
            onClick={(ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              finish({ status: 'cancelled' });
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};
