//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

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
        <div id='boot-loader-disc' style={{ ['--boot-loader-bar-progress' as string]: String(clamped * 100) }}>
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
const STORY_PLUGIN_COUNT = 59;

/** Tick interval for the determinate-progress simulation, in ms. */
const STORY_TICK_MS = 100;

const CyclingStory = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const handle = setInterval(() => {
      setIndex((current) => (current + 1) % PHASES.length);
    }, 1_500);
    return () => clearInterval(handle);
  }, []);
  return <BootLoader status={PHASES[index]} markSvg={PLACEHOLDER_MARK} />;
};

const DeterminateStory = () => {
  // Walks progress 0 → 1 by ticking once every `STORY_TICK_MS`, mirroring
  // composer's per-plugin counter in `getPlugins`.
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let loaded = 0;
    const handle = setInterval(() => {
      loaded += 1;
      setProgress(loaded / STORY_PLUGIN_COUNT);
      if (loaded >= STORY_PLUGIN_COUNT) {
        clearInterval(handle);
      }
    }, STORY_TICK_MS);
    return () => clearInterval(handle);
  }, []);
  const loaded = Math.round(progress * STORY_PLUGIN_COUNT);
  const status = progress >= 1 ? 'Starting Composer…' : `Loading plugins (${loaded}/${STORY_PLUGIN_COUNT})…`;
  return <BootLoader status={status} markSvg={PLACEHOLDER_MARK} progress={progress} />;
};

const meta: Meta<typeof BootLoader> = {
  title: 'sdk/app-framework/vite-plugin/BootLoader',
  component: BootLoader,
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

/** Static loader exactly as it ships in `composer-app` (without the brand SVG). */
export const Default: Story = {
  args: {
    status: 'Loading…',
  },
};

/** Same loader plus an inline brand mark — verify currentColor inheritance. */
export const WithMark: Story = {
  args: {
    status: 'Loading…',
    markSvg: PLACEHOLDER_MARK,
  },
};

/**
 * Cycles through the strings the host typically passes to
 * `window.__bootLoader.status(...)`. Useful for verifying that the ring's
 * vertical position is stable across status changes — `#boot-loader-status`
 * has a fixed height so the line-box can't reflow the flex column.
 */
export const Cycling: Story = {
  render: () => <CyclingStory />,
};

/**
 * Determinate progress driven by `__bootLoader.progress(fraction)`. Mirrors
 * composer-app's behaviour during the `getPlugins` phase — the arc grows
 * 0 → 100% around the brand mark as plugin chunks resolve.
 */
export const Determinate: Story = {
  render: () => <DeterminateStory />,
};
