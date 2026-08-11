//
// Copyright 2026 DXOS.org
//

import { type Component, For, createEffect } from 'solid-js';

import { type LoaderStore } from './store';
import { Swarm, type SwarmProps } from './SwarmField';

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
  /** Storybook/testing overrides for the swarm; production passes nothing and gets a random variant. */
  swarm?: SwarmProps['config'];
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

  return (
    <>
      <div id='boot-loader-disc'>
        <Swarm store={props.store} markSvg={props.markSvg} config={props.swarm} />
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
