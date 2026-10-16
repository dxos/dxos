//
// Copyright 2026 DXOS.org
//

import { type Component, For, Index, createEffect, createSignal, onCleanup, onMount } from 'solid-js';

import { type LoaderStore } from './store.ts';
import { Swarm, type SwarmProps } from './SwarmField.tsx';

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
  /** A CSS filter over the mark — how a channel recolours the released artwork without its own file. */
  markFilter?: string;
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
 * paints from CSS before this bundle executes; this component renders the swarm
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

  // The activation row centres on an eased count rather than the real one:
  // a new arrival only moves the target, so the row keeps its velocity instead
  // of easing to a stop and starting again, which is what a per-arrival
  // transition does.
  const [shownCount, setShownCount] = createSignal(props.store.plugins().length);
  let raf: number | undefined;
  const animate = () => {
    const targetCount = props.store.plugins().length;
    const currentCount = shownCount();
    const nextCount =
      Math.abs(targetCount - currentCount) < 0.005 ? targetCount : currentCount + (targetCount - currentCount) * 0.18;
    if (nextCount !== currentCount) {
      setShownCount(nextCount);
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

  return (
    <>
      {/* The channel filter sits on the disc so the swarm's mark (and the classic ring variant)
          recolour together with whatever the channel ships. */}
      <div id='boot-loader-disc' style={{ '--boot-loader-mark-filter': props.markFilter }}>
        <Swarm store={props.store} markSvg={props.markSvg} config={props.swarm} />
      </div>
      <div id='boot-loader-status'>
        <div id='boot-loader-status-fade' />
        <div id='boot-loader-status-track' ref={trackRef}>
          <For each={props.store.lines()}>{(line) => <div class='boot-loader-status-line'>{line.text}</div>}</For>
        </div>
      </div>
      {/* The sprite's symbols, inlined so the row's `<use>` references resolve locally: fetched by
          the store at mount (see `loadSprite`), which is what gets the download in before the
          row needs it. */}
      <svg id='boot-loader-sprite' aria-hidden='true' innerHTML={props.store.sprite()} />
      {/* Activation row: one icon per plugin as it activates, appended monochrome and fading in. */}
      <div id='boot-loader-plugins' aria-hidden='true'>
        {/* Inner track: the flex row, translated as one group to keep its centre on the row's; the
            outer element keeps its vertical placement transform and clips. `--n` is the eased count
            the offset is computed from: a new icon lands one gap past the row's end and the row
            slides half a slot left as `--n` catches up. */}
        <div id='boot-loader-plugins-track' style={{ '--n': shownCount() }}>
          {/* `Index`, not `For`: `For` keys by item identity, so any row rewrite would re-create the
              element and restart its entrance animation. */}
          <Index each={props.store.plugins()}>
            {(plugin) => (
              // Wrapper owns the slot and the fade, so the glyph inside can be restyled (a chip, a
              // badge, a hover affordance) without touching either.
              <div class='boot-loader-plugin'>
                <svg class='boot-loader-plugin-icon' viewBox='0 0 256 256'>
                  <use href={`#${plugin().icon}`} />
                </svg>
              </div>
            )}
          </Index>
        </div>
      </div>
      {/* Shown only once the host reports the deadline passed, and only in dev — startup keeps
          running behind it, so this is an offer rather than a verdict. */}
      {props.store.onAbort() ? (
        <div id='boot-loader-stalled'>
          <p id='boot-loader-stalled-text'>Still starting after {props.store.elapsedSeconds()}s.</p>
          {/* `on:click`, not `onClick`: Solid delegates `onClick` to a document listener that outlives
              the loader, and its handler pins the app's first click event, and that event's view. */}
          <button id='boot-loader-stalled-abort' type='button' on:click={() => props.store.onAbort()?.()}>
            Abort and show diagnostics
          </button>
        </div>
      ) : null}
    </>
  );
};
