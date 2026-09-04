//
// Copyright 2026 DXOS.org
//

import { type Component, For, createEffect, createSignal, onCleanup, onMount } from 'solid-js';

import { type LoaderStore } from './store';

// Ring geometry in the SVG's `0 0 100 100` viewBox. The radius leaves a couple
// of units of padding so the stroke, its round cap, and the end marker aren't
// clipped at the viewBox edge.
const RING_RADIUS = 48;
const RING_CENTER = 50;
// Leading-edge marker: a small dot drawn at the arc's head in an unmasked layer.
const MARKER_RADIUS = 1; // viewBox units → ~3.8px on the 384px disc

/** Sprite the activation row's icons resolve against when the host configures none. */
const DEFAULT_SPRITE_PATH = '/icons.svg';

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
  /** URL of the icon sprite the activation row resolves `<use href>` against. */
  spritePath?: string;
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
  // recompute the path each frame. This restores the compositor-smooth growth
  // the old `transition: stroke-dashoffset` gave, while keeping the path +
  // `marker-end` (the marker rides the arc's recomputed end automatically).
  const [shown, setShown] = createSignal(props.store.progress());
  let raf: number | undefined;
  const animate = () => {
    const target = props.store.progress();
    const current = shown();
    // Snap when within a hair to settle; otherwise lerp ~18% of the gap/frame.
    const next = Math.abs(target - current) < 0.05 ? target : current + (target - current) * 0.18;
    if (next !== current) {
      setShown(next);
    }
    raf = requestAnimationFrame(animate);
  };

  onMount(() => {
    raf = requestAnimationFrame(animate);
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
    const fraction = Math.min(shown() / 100, 0.9999);
    const sweep = fraction * 2 * Math.PI;
    const start = -Math.PI / 2; // 12 o'clock
    const end = start - sweep; // anticlockwise (decreasing angle)
    const x0 = RING_CENTER + RING_RADIUS * Math.cos(start);
    const y0 = RING_CENTER + RING_RADIUS * Math.sin(start);
    const headX = RING_CENTER + RING_RADIUS * Math.cos(end);
    const headY = RING_CENTER + RING_RADIUS * Math.sin(end);
    const largeArc = sweep > Math.PI ? 1 : 0;
    // sweep-flag 0 = anticlockwise (negative-angle) direction.
    return { d: `M ${x0} ${y0} A ${RING_RADIUS} ${RING_RADIUS} 0 ${largeArc} 0 ${headX} ${headY}`, headX, headY };
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
        {/* Leading-edge dot in its own unmasked layer (see `arc()`), so the ring's fade mask
            never clips it. Stacked over `#boot-loader-ring` via the disc grid. */}
        {shown() > 0 ? (
          <svg id='boot-loader-ring-head' viewBox='0 0 100 100' aria-hidden='true'>
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
      {/* Activation row: every plugin due to activate, seeded monochrome and dimmed, each easing to
          its own hue as the host reports it in — so the row shows what is left as well as what has
          landed. Icons resolve against the static sprite, which needs no app bundle. */}
      <div id='boot-loader-plugins' aria-hidden='true'>
        <For each={props.store.plugins()}>
          {(plugin) => (
            <svg
              class='boot-loader-plugin'
              data-active={plugin.active ? '' : undefined}
              viewBox='0 0 256 256'
              style={plugin.hue ? { '--boot-loader-plugin-color': `var(--boot-loader-hue-${plugin.hue})` } : undefined}
            >
              <use href={`${props.spritePath ?? DEFAULT_SPRITE_PATH}#${plugin.icon}`} />
            </svg>
          )}
        </For>
      </div>
      {/* Shown only once the host reports the deadline passed, and only in dev — startup keeps
          running behind it, so this is an offer rather than a verdict. Placed below the status log,
          where the reader's eye already is. */}
      {props.store.onAbort() ? (
        <div id='boot-loader-stalled'>
          <p id='boot-loader-stalled-text'>Still starting after {props.store.elapsedSeconds()}s.</p>
          <button id='boot-loader-stalled-abort' type='button' onClick={() => props.store.onAbort()?.()}>
            Abort and show diagnostics
          </button>
        </div>
      ) : null}
    </>
  );
};
