//
// Copyright 2026 DXOS.org
//

import { type Component, createSignal, onCleanup, onMount } from 'solid-js';

import { type LoaderStore } from './store';

// Ring geometry in the SVG's `0 0 100 100` viewBox. The radius leaves a couple
// of units of padding so the stroke, its round cap, and the end marker aren't
// clipped at the viewBox edge.
const RING_RADIUS = 48;
const RING_CENTER = 50;
// Leading-edge marker: a small dot drawn at the arc's head in an unmasked layer.
const MARKER_RADIUS = 1; // viewBox units → ~3.8px on the 384px disc

export type ClassicRingProps = {
  /** Reactive source of truth for progress and lifecycle phase. */
  store: LoaderStore;
  /** Inline SVG markup for the brand mark rendered inside the ring. */
  markSvg?: string;
};

/**
 * The original determinate ring, preserved verbatim (geometry, easing, conic
 * fade mask, host-driven colour reveal) as the `'arc'` variant — kept as its
 * own component rather than adapted to the swarm engine so the two loaders can
 * be compared side by side.
 */
export const ClassicRing: Component<ClassicRingProps> = (props) => {
  // Eased display progress. A `<path>`'s `d` can't be CSS-transitioned, so the
  // arc would snap on every store tick; instead we ease a displayed value toward
  // the store's progress with a requestAnimationFrame loop (~per-frame lerp) and
  // recompute the path each frame.
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
  // 100%. The leading-edge dot is its `head` point, rendered separately in an
  // *unmasked* layer — drawing it via `marker-end` on this path would put it
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
    <div id='boot-loader-disc-classic' data-host-driven={isHostDriven() ? '' : undefined}>
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
  );
};
