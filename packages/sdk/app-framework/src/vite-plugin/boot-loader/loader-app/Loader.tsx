//
// Copyright 2026 DXOS.org
//

import { type Component, For, createEffect, createSignal, onCleanup, untrack } from 'solid-js';

import { type LoaderStore } from './store';

// Ring geometry in the SVG's `0 0 100 100` viewBox. The radius leaves a couple
// of units of padding so the stroke, its round cap, and the end marker aren't
// clipped at the viewBox edge.
const RING_RADIUS = 48;
const RING_CENTER = 50;

// Leading-edge marker: a small dot drawn at the arc's head in an unmasked layer.
const MARKER_RADIUS = 1; // viewBox units → ~3.8px on the 384px disc

/**
 * Read an element's *current animated* translateY (px) from its live transform
 * matrix — the interpolated value mid-transition, not the last-written property.
 * Used by the status FLIP so successive appends chain off the in-flight position
 * instead of yanking the track back to a fixed invert target.
 */
const readTranslateY = (element: HTMLElement): number => {
  const computed = getComputedStyle(element).transform;
  if (!computed || computed === 'none') {
    return 0;
  }
  const match = computed.match(/matrix.*\(([^)]+)\)/);
  if (!match) {
    return 0;
  }
  const values = match[1].split(',');
  // 2D `matrix(a, b, c, d, tx, ty)` → ty at index 5; 3D `matrix3d(...)` → ty at 13.
  if (values.length === 6) {
    return Number.parseFloat(values[5]) || 0;
  }
  if (values.length === 16) {
    return Number.parseFloat(values[13]) || 0;
  }
  return 0;
};

export type LoaderProps = {
  /** Reactive source of truth for progress, status lines, and lifecycle phase. */
  store: LoaderStore;
  /** Inline SVG markup for the brand mark rendered inside the ring. */
  markSvg?: string;
};

/**
 * The boot loader, authored as a single Solid component — the one source of
 * truth for the loader DOM. `bootLoaderPlugin` bundles this (Solid runtime
 * inlined) into `index.html`; the storybook mounts the very same component, so
 * the two can no longer drift. The DOM structure, ids, and classes mirror
 * `boot-loader.css`.
 *
 * The full-screen backdrop (`#boot-loader`) is injected as static markup so it
 * paints from CSS before this bundle executes; this component renders the disc
 * and status log *into* that backdrop. The dismissal outro (fading `#boot-loader`)
 * and its teardown are owned by {@link mountLoader}, which has the host element.
 */
export const Loader: Component<LoaderProps> = (props) => {
  let trackRef: HTMLDivElement | undefined;
  let previousCount = props.store.lines().length;

  // FLIP-style slide on each appended line: snap the track down by one
  // line-height (chained off any in-flight translate) with no transition, force
  // a reflow, then animate back to translateY(0) so the new entry rises from
  // below the bottom-anchored viewport. Range ticks (length unchanged) skip it.
  createEffect(() => {
    const count = props.store.lines().length;
    const track = trackRef;
    if (track && count > previousCount) {
      const currentY = readTranslateY(track);
      const lineHeight = track.lastElementChild?.getBoundingClientRect().height ?? 0;
      track.style.transition = 'none';
      track.style.transform = `translateY(${currentY + lineHeight}px)`;
      void track.offsetHeight;
      track.style.transition = '';
      track.style.transform = 'translateY(0)';
    }
    previousCount = count;
  });

  // Eased display progress. A `<path>`'s `d` can't be CSS-transitioned, so the
  // arc would snap on every store tick; instead we ease a displayed value toward
  // the store's progress with a requestAnimationFrame loop (~per-frame lerp) and
  // recompute the path each frame. Each frame is main-thread JS + SVG repaint, so
  // the loop must not run when there is nothing to ease: it parks itself once the
  // displayed value settles on the target, and the store effect below re-kicks it
  // on the next progress tick. Under `prefers-reduced-motion` the value snaps to
  // the target on each tick and the loop never runs.
  const [shown, setShown] = createSignal(props.store.progress());
  const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf: number | undefined;
  const animate = () => {
    raf = undefined;
    const target = props.store.progress();
    const current = shown();
    // Snap when within a hair to settle; otherwise lerp ~18% of the gap/frame.
    const next = Math.abs(target - current) < 0.05 ? target : current + (target - current) * 0.18;
    if (next !== current) {
      setShown(next);
    }
    if (next !== target) {
      raf = requestAnimationFrame(animate);
    }
  };

  createEffect(() => {
    const target = props.store.progress();
    if (reducedMotion) {
      setShown(target);
      return;
    }
    if (raf == null && target !== untrack(shown)) {
      raf = requestAnimationFrame(animate);
    }
  });

  onCleanup(() => {
    if (raf != null) {
      cancelAnimationFrame(raf);
    }
  });

  // Determinate ring as an SVG `<path>` arc: an anticlockwise sweep starting at
  // 12 o'clock whose angle grows with the eased `shown()` progress. The sweep is
  // capped just shy of a full turn so the single arc command never degenerates at
  // 100%. The leading-edge dot is its `head` point, rendered separately (below) in
  // an *unmasked* layer — drawing it via `marker-end` on this path would put it
  // under the ring's conic fade mask, whose hard edge bisects the dot into a
  // half-circle.
  const arc = () => {
    const TWO_PI = 2 * Math.PI;
    const TOP = -Math.PI / 2; // 12 o'clock
    const fraction = Math.min(shown() / 100, 0.9999);
    const sweep = fraction * TWO_PI;
    const head = TOP - sweep; // anticlockwise (decreasing angle)
    const start = TOP - (fraction * Math.PI) / 2;
    // Anticlockwise span from start to head, normalized to [0, 2π).
    const span = (((start - head) % TWO_PI) + TWO_PI) % TWO_PI;
    const largeArc = span > Math.PI ? 1 : 0;
    // const startX = RING_CENTER + RING_RADIUS * Math.cos(top);
    // const startY = RING_CENTER + RING_RADIUS * Math.sin(top);
    const startX = RING_CENTER + RING_RADIUS * Math.cos(start);
    const startY = RING_CENTER + RING_RADIUS * Math.sin(start);
    const headX = RING_CENTER + RING_RADIUS * Math.cos(head);
    const headY = RING_CENTER + RING_RADIUS * Math.sin(head);
    return {
      d: `M ${startX} ${startY} A ${RING_RADIUS} ${RING_RADIUS} 0 ${largeArc} 0 ${headX} ${headY}`,
      startX,
      startY,
      headX,
      headY,
    };
  };

  // Once host-driven, the brand mark eases grayscale → colour and stays there.
  const isHostDriven = () => props.store.phase() !== 'creep';

  return (
    <>
      <div id='boot-loader-disc' data-host-driven={isHostDriven() ? '' : undefined}>
        <svg
          id='boot-loader-ring'
          viewBox='0 0 100 100'
          aria-hidden='true'
          style={{ '--boot-loader-arc': String(shown()) }}
        >
          {shown() > 0 ? <path class='boot-loader-ring-progress' d={arc().d} /> : null}
        </svg>
        {/*
         * Leading-edge dot in its own unmasked layer (see `arc()`), so the ring's fade mask
         * never clips it. Stacked over `#boot-loader-ring` via the disc grid.
         */}
        {shown() > 0 ? (
          <svg id='boot-loader-ring-head' viewBox='0 0 100 100' aria-hidden='true'>
            {/* <circle class='boot-loader-ring-marker' cx={arc().startX} cy={arc().startY} r={MARKER_RADIUS / 3} /> */}
            <circle class='boot-loader-ring-marker' cx={arc().headX} cy={arc().headY} r={MARKER_RADIUS} />
          </svg>
        ) : null}
        {props.markSvg ? <div id='boot-loader-mark' innerHTML={props.markSvg} /> : null}
      </div>
      <div id='boot-loader-status'>
        <div id='boot-loader-status-fade' />
        <div id='boot-loader-status-track' ref={trackRef}>
          <For each={props.store.lines()}>{(line) => <div class='boot-loader-status-line'>{line.text}</div>}</For>
        </div>
      </div>
    </>
  );
};
