//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { Composer } from '@dxos/brand';
import { Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { Placeholder } from '../../ui';
import css from './boot-loader.css?raw';

/**
 * React rendering of the native-DOM boot loader so the visual can be poked at
 * in storybook without having to rebuild a host app. The DOM structure and
 * style classes are identical to what {@link bootLoaderPlugin} injects via
 * `transformIndexHtml`; the CSS itself is imported as a raw string from the
 * same source the plugin uses, so a styling change in `boot-loader.css`
 * shows up here automatically.
 *
 * Coupled-but-not-shared: the actual production loader runs as inline HTML
 * before any module loads, so it can't be a React component there. This
 * mirror lets us iterate on the look + animations + status-text behaviour
 * with hot-reload.
 */
type BootLoaderProps = {
  status?: string;
  /**
   * Inline SVG markup. May carry its own brand-palette fills; SVGs using
   * `fill="currentColor"` still inherit the loader's text colour.
   */
  markSvg?: string;
  /**
   * Determinate progress fraction in [0, 1]. The ring is always determinate —
   * defaults to 0 (empty ring) until the host calls `__bootLoader.progress(...)`.
   */
  progress?: number;
};

const BootLoader = ({ status = 'Loading…', markSvg, progress = 0 }: BootLoaderProps) => {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <>
      <style>{css}</style>
      <div id='boot-loader' role='status' aria-live='polite' aria-label='Initializing'>
        <div
          id='boot-loader-disc'
          style={{ ['--boot-loader-bar-progress' as string]: String(clamped * 100) }}
          {...(clamped > 0 && clamped < 1 ? { 'data-progress-active': '' } : {})}
        >
          <div id='boot-loader-bar' />
          <div id='boot-loader-dot' />
          {markSvg ? <div id='boot-loader-mark' dangerouslySetInnerHTML={{ __html: markSvg }} /> : null}
        </div>
        <div id='boot-loader-status'>{status}</div>
      </div>
    </>
  );
};

// Inlined snapshot of `packages/ui/brand/assets/icons/composer-icon.svg` —
// keeps storybook self-contained (production pipes the same file in from
// vite.config.ts via the plugin's `markSvg` option) while previewing the
// real brand palette the loader will render in production.
const PLACEHOLDER_MARK = `
  <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">
    <g transform="matrix(0.969697,0,0,1,-570.182,0)">
      <rect x="588" y="0" width="264" height="256" style="fill:none;"/>
      <g transform="matrix(0.917198,0,0,1,-223.93,-876)">
        <path d="M1065.83,1064L1029.14,1064C991.913,1064 961.684,1037.12 961.684,1004C961.684,971.197 991.282,944.542 1028.02,944.008L1028.02,944L1047.85,944L1039.21,968L1029.14,968C1006.79,968 988.669,984.118 988.669,1004C988.669,1023.87 1006.81,1040 1029.14,1040C1029.38,1040 1029.62,1040 1029.85,1040L1029.85,1040L1074.47,1040L1065.83,1064ZM1083.11,1040L1083.11,1040L1083.11,1064L1083.11,1064L1083.11,1040Z" style="fill:rgb(1,122,183);"/>
      </g>
      <path d="M761.579,164L720,164C699.51,164 682.875,147.869 682.875,128C682.875,108.452 698.942,92.543 718.969,92.014L718.969,92L729.238,92L721.317,116L720,116C713.165,116 707.625,121.373 707.625,128C707.625,134.623 713.17,140 720,140C720.072,140 720.144,139.999 720.216,139.998L720.216,140L769.5,140L761.579,164Z" style="fill:rgb(6,197,253);"/>
      <path d="M745.738,212L720.025,212L720,212C672.202,212 633.389,174.377 633.375,128.024C633.361,81.958 671.591,44.542 718.969,44.006L718.969,44L719.975,44L745.079,44L737.159,68L719.982,68C685.809,68.01 658.115,94.88 658.125,128.017C658.135,161.126 685.858,188 720,188L720.018,188C720.378,188 720.738,187.997 721.098,187.991L721.098,188L753.659,188L745.738,212Z" style="fill:rgb(10,75,105);"/>
      <g transform="matrix(1.03125,0,0,1,588,0)">
        <path d="M128,236C68.393,236 20,187.607 20,128C20,68.353 68.353,20 128,20L160,20L152.319,44L128,44C81.608,44 44,81.608 44,128C44,174.361 81.639,212 128,212C127.756,212.004 127.878,212.004 128,212.003C128.122,212.002 128.244,212 128,212L152.958,212L145.277,236L128,236ZM128,236C128.628,236 127.372,236.011 128,236Z" style="fill:rgb(5,40,61);"/>
      </g>
    </g>
  </svg>
`;

const PHASES = ['Loading…', 'Loading framework…', 'Reading configuration…', 'Starting services…', 'Loading plugins…'];

/**
 * Approximate plugin count used by the `Determinate` story. Hardcoded here
 * to keep the storybook self-contained — the production count comes from
 * `composer-app/src/plugin-defs.tsx`'s dynamic-import list. Adjust if the
 * story should mirror an updated count.
 */
const STORY_PLUGIN_COUNT = 80;

/** Tick interval for the determinate-progress simulation, in ms. */
const STORY_TICK_MS = 100;

// Mirrors the inline driver's auto-creep constants in `boot-loader.js` so the
// pre-host-progress phase animates identically in storybook and production.
const CREEP_ASYMPTOTE = 12;
const CREEP_RATE = 0.04;
const CREEP_TICK_MS = 100;

type BootLoaderSimOptions = {
  progress?: number;
  /**
   * Whether the random-walk starts running on mount.
   *  - `true` (default): start running immediately, skip the creep.
   *  - `false`: start paused — the disc auto-creeps toward
   *    `CREEP_ASYMPTOTE` until `toggle()` is called.
   *  - `<number>`: start paused, then auto-flip to running after this many
   *    ms. Mirrors a host whose first `progress()` call lands `<number>`
   *    ms after the page paints.
   */
  autoStart?: boolean | number;
  /**
   * Walk the placeholder through `stage 0 → 1 → 2` after progress hits 1
   * (the production handoff sequence). Without this, the sim stops at 100%.
   */
  withHandoff?: boolean;
  /**
   * Reset progress and stage back to 0 after the handoff fade-out and start
   * a new cycle. Only meaningful with `withHandoff`. Useful for stories
   * that want the transition to repeat for visual review.
   */
  loop?: boolean;
};

type BootLoaderSimState = {
  progress: number;
  stage: number;
  status: string;
  running: boolean;
  /** Toggle pause / resume; restart from zero once progress has hit 1. */
  toggle: () => void;
};

/**
 * Shared simulation guts driving the `BootLoader` stories — animates the
 * progress var via `STORY_PLUGIN_COUNT` random-walk ticks and (optionally)
 * walks the React `Placeholder` stage afterwards. Both `Default` and
 * `Handoff` use this hook so the Phase 1 / Phase 2 timing stays consistent.
 */
const useBootLoaderSim = ({
  progress: progressProp = 0,
  autoStart = true,
  withHandoff = false,
  loop = false,
}: BootLoaderSimOptions = {}): BootLoaderSimState => {
  const [progress, setProgress] = useState(progressProp);
  const [stage, setStage] = useState(0);
  // The creep runs whenever `running === false`, so a paused initial state
  // gives the disc the auto-creep look until `toggle()` (or `autoStart` as a
  // number) flips it on.
  const [running, setRunning] = useState(autoStart === true);
  const [tick, setTick] = useState(0);

  // Optional auto-flip from paused → running after a delay. Re-arms on every
  // `tick` bump so the handoff loop sees a fresh creep window per cycle.
  useEffect(() => {
    if (typeof autoStart !== 'number') {
      return;
    }
    setRunning(false);
    const handle = setTimeout(() => setRunning(true), autoStart);
    return () => clearTimeout(handle);
  }, [autoStart, tick]);

  // Phase 0 — auto-creep while paused. Asymptotic ease toward
  // `CREEP_ASYMPTOTE` so the disc reads as alive before the random-walk
  // starts. Once the asymptote is approached the timer ticks become no-ops
  // (cheap idle); we don't bother stopping the interval.
  useEffect(() => {
    if (running) {
      return;
    }
    const handle = setInterval(() => {
      setProgress((current) => {
        const fraction = current * 100;
        if (fraction >= CREEP_ASYMPTOTE - 0.1) {
          return current;
        }
        return (fraction + (CREEP_ASYMPTOTE - fraction) * CREEP_RATE) / 100;
      });
    }, CREEP_TICK_MS);
    return () => clearInterval(handle);
  }, [running]);

  // Phase 1 — random-walk while running. Resumes from the current progress
  // (e.g. the creep value) so the bar doesn't jump when running flips on.
  useEffect(() => {
    if (!running || progress >= 1) {
      return;
    }

    let loaded = progress * STORY_PLUGIN_COUNT;
    const handle = setInterval(() => {
      loaded += Math.abs(Math.random());
      setProgress(Math.min(1, loaded / STORY_PLUGIN_COUNT));
      if (loaded >= STORY_PLUGIN_COUNT) {
        clearInterval(handle);
        // Without a handoff there's nothing to do once the bar fills, so
        // flip `running` off and let `toggle()` decide what comes next.
        if (!withHandoff) {
          setRunning(false);
        }
      }
    }, STORY_TICK_MS);
    return () => clearInterval(handle);
  }, [running, tick, withHandoff]);

  // Phase 2 — at 100%, walk the placeholder stage and (optionally) loop back.
  useEffect(() => {
    if (!withHandoff || progress < 1) {
      return;
    }
    const handles: ReturnType<typeof setTimeout>[] = [];
    handles.push(setTimeout(() => setStage(1), 200)); // FadeIn — placeholder mark visible.
    handles.push(setTimeout(() => setStage(2), 2_000)); // FadeOut — mark shrinks.
    if (loop) {
      handles.push(
        setTimeout(() => {
          setStage(0);
          setProgress(0);
          setTick((current) => current + 1);
        }, 3_500),
      );
    }
    return () => handles.forEach(clearTimeout);
  }, [progress, withHandoff, loop]);

  const toggle = () => {
    if (progress >= 1) {
      // Finished — drop back to the paused / creeping state. The next click
      // (or `autoStart` timer) starts the random-walk again.
      setProgress(0);
      setStage(0);
      setRunning(false);
      setTick((current) => current + 1);
    } else {
      setRunning((current) => !current);
    }
  };

  const loaded = Math.round(progress * STORY_PLUGIN_COUNT);
  const status = progress >= 1 ? 'Starting Composer…' : `Loading plugins (${loaded}/${STORY_PLUGIN_COUNT})`;

  return { progress, stage, status, running, toggle };
};

const DefaultStory = () => {
  // Start paused so the disc auto-creeps while the toolbar reads "Start".
  // Pressing the button kicks off the random-walk from whatever value the
  // creep had reached.
  const { progress, status, running, toggle } = useBootLoaderSim({ autoStart: false });

  return (
    <>
      {/* `relative` opens a positioned context so `z-20` actually applies — */}
      {/* the boot loader is `position: fixed; z-index: 10` so anything above */}
      {/* must (a) be positioned and (b) outrank 10. */}
      <Toolbar.Root classNames='relative z-20'>
        <Toolbar.IconButton
          icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
          label={running ? 'Pause' : progress >= 1 ? 'Restart' : 'Start'}
          iconOnly
          onClick={toggle}
        />
      </Toolbar.Root>
      <BootLoader status={status} markSvg={PLACEHOLDER_MARK} progress={progress} />
    </>
  );
};

const meta: Meta<typeof BootLoader> = {
  title: 'sdk/app-framework/vite-plugin/BootLoader',
  component: BootLoader,
  render: DefaultStory,
  decorators: [withTheme({})],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    status: { control: 'text' },
    markSvg: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<typeof BootLoader>;

export const Default: Story = {};

/**
 * Renders the React `Placeholder` from `@dxos/app-framework/ui` on its own —
 * useful for eyeballing the handoff target the boot loader dismisses to,
 * with the same `<Composer />` brand mark the loader paints during cold load.
 */
export const PlaceholderHandoff: Story = {
  name: 'Placeholder',
  render: () => <Placeholder stage={1} logo={(logoProps) => <Composer {...logoProps} />} />,
};

/**
 * End-to-end handoff sim: the `BootLoader` ticks 0 → 100% then unmounts and
 * the `Placeholder` underneath fades its mark in (`stage 0 → 1`) and back
 * out (`stage 1 → 2`), mirroring the production sequence where the native
 * loader paints first, the React placeholder mounts beneath, and the
 * placeholder's `useLayoutEffect` dismisses the loader the moment the mark
 * becomes visible. The story restarts on a loop so the transition can be
 * eyeballed repeatedly.
 */
export const Handoff: Story = {
  render: () => {
    const { progress, stage, status } = useBootLoaderSim({ autoStart: 2_000, withHandoff: true, loop: true });
    return (
      <>
        {/* Placeholder underneath — `stage = 0` keeps the logo at opacity 0 */}
        {/* until the BootLoader unmounts, then it fades in. */}
        <Placeholder stage={stage} logo={(logoProps) => <Composer {...logoProps} />} />
        {stage < 1 && <BootLoader status={status} markSvg={PLACEHOLDER_MARK} progress={progress} />}
      </>
    );
  },
};
