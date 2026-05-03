//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';

import { Composer } from '@dxos/brand';
import { Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { Placeholder } from '../../ui';
import bootLoaderCss from './boot-loader.css?raw';
import bootLoaderScript from './boot-loader.js?raw';

/**
 * Storybook host that runs the **real** inline driver script (`boot-loader.js`)
 * against the same DOM structure {@link bootLoaderPlugin} injects in production
 * via `transformIndexHtml`. The component injects `<style>` + the loader DOM,
 * evaluates the driver, and exposes `window.__bootLoader` for the stories to
 * call — no React reimplementation of the state machine.
 *
 * On unmount, the host calls `__bootLoader.dismiss()` (which clears the creep
 * timer and removes the `#boot-loader` node) and clears the global so a fresh
 * mount re-runs the driver from scratch.
 */
type BootLoaderHostProps = {
  initialStatus?: string;
  markSvg?: string;
};

// `__bootLoader` is declared globally by `../../ui/components/Placeholder/Placeholder.tsx`
// so consumers don't have to redeclare it. The story imports `Placeholder` for the
// handoff scenarios, which pulls the declaration into scope.

const BootLoaderHost = ({ initialStatus = 'Loading…', markSvg }: BootLoaderHostProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    // Mirror the HTML structure produced by `bootLoaderPlugin.transformIndexHtml`.
    const initialLine = initialStatus ? `<div class="boot-loader-status-line">${escapeHtml(initialStatus)}</div>` : '';
    const markHtml = markSvg ? `<div id="boot-loader-mark">${markSvg}</div>` : '';
    container.innerHTML = `
      <div id="boot-loader" role="status" aria-live="polite" aria-label="Initializing">
        <div id="boot-loader-disc">
          <div id="boot-loader-bar"></div>
          <div id="boot-loader-dot"></div>
          ${markHtml}
        </div>
        <div id="boot-loader-status">${initialLine}</div>
      </div>
    `;
    // Evaluate the driver IIFE — it auto-promotes idle → state 1 (slow creep)
    // and exposes `window.__bootLoader.{status, progress, dismiss}` globally.
    const driverEl = document.createElement('script');
    driverEl.textContent = bootLoaderScript;
    container.appendChild(driverEl);

    return () => {
      try {
        window.__bootLoader?.dismiss();
      } catch {
        // Driver removes its own DOM — swallow errors from idempotent retries.
      }
      delete window.__bootLoader;
      container.innerHTML = '';
    };
  }, [initialStatus, markSvg]);

  return (
    <>
      <style>{bootLoaderCss}</style>
      <div ref={containerRef} />
    </>
  );
};

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

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

/**
 * Approximate plugin count used by the simulation. Hardcoded here to keep the
 * storybook self-contained — the production count comes from
 * `composer-app/src/plugin-defs.tsx`'s dynamic-import list.
 */
const STORY_PLUGIN_COUNT = 80;

/** Tick interval for the determinate-progress simulation, in ms. */
const STORY_TICK_MS = 50;

/**
 * Story controls — emits real `__bootLoader.status(...)` and `progress(...)`
 * calls into the running driver script, which then drives the visible DOM.
 * No React state shadow of the loader's progress; the driver is the source
 * of truth.
 */
type SimRunningState = 'idle' | 'creep' | 'progress' | 'done';

const useBootLoaderDriver = ({ withHandoff = false }: { withHandoff?: boolean } = {}) => {
  const [running, setRunning] = useState<SimRunningState>('creep');
  const [stage, setStage] = useState(0);

  // `creep` state — driver auto-creeps; the story emits a sequence of
  // status messages so the appended-log behaviour is observable.
  useEffect(() => {
    if (running !== 'creep') {
      return;
    }
    const phases = ['Loading framework…', 'Reading configuration…', 'Starting services…'];
    let index = 0;
    const handle = setInterval(() => {
      window.__bootLoader?.status({ humanized: phases[index] });
      index += 1;
      if (index >= phases.length) {
        clearInterval(handle);
      }
    }, 600);
    return () => clearInterval(handle);
  }, [running]);

  // `progress` state — random-walk through the plugin count, calling the
  // real `__bootLoader.progress(...)` so the driver's no-regress + creep
  // logic runs as it does in production.
  useEffect(() => {
    if (running !== 'progress') {
      return;
    }
    let loaded = 0;
    const handle = setInterval(() => {
      loaded += Math.abs(Math.random()) * 1.5;
      const fraction = Math.min(1, loaded / STORY_PLUGIN_COUNT);
      window.__bootLoader?.progress(fraction);
      // Range-bearing payload — replaces the current line in place
      // instead of appending one entry per plugin tick.
      window.__bootLoader?.status({
        humanized: 'Loading plugins',
        range: { index: Math.round(loaded), total: STORY_PLUGIN_COUNT },
      });
      if (loaded >= STORY_PLUGIN_COUNT) {
        clearInterval(handle);
        window.__bootLoader?.status({ humanized: 'Starting Composer…' });
        setRunning('done');
      }
    }, STORY_TICK_MS);
    return () => clearInterval(handle);
  }, [running]);

  // Handoff phase — fade the placeholder in/out once the driver hits 100%.
  useEffect(() => {
    if (!withHandoff || running !== 'done') {
      return;
    }
    const handles: ReturnType<typeof setTimeout>[] = [];
    handles.push(setTimeout(() => setStage(1), 200));
    handles.push(setTimeout(() => setStage(2), 2_000));
    return () => handles.forEach(clearTimeout);
  }, [running, withHandoff]);

  const advance = () => {
    if (running === 'creep') {
      setRunning('progress');
    } else {
      setRunning('creep');
      setStage(0);
    }
  };

  return { running, stage, advance };
};

const SimToolbar = ({ running, advance }: { running: SimRunningState; advance: () => void }) => {
  const button =
    running === 'creep'
      ? { icon: 'ph--play--regular', label: 'Start progress' }
      : { icon: 'ph--arrow-counter-clockwise--regular', label: 'Reset' };
  return (
    <Toolbar.Root classNames='relative z-20'>
      <Toolbar.IconButton icon={button.icon} label={button.label} iconOnly onClick={advance} />
      <Toolbar.Text>{running}</Toolbar.Text>
    </Toolbar.Root>
  );
};

const DefaultStory = () => {
  const { running, advance } = useBootLoaderDriver();
  return (
    <>
      <SimToolbar running={running} advance={advance} />
      <BootLoaderHost markSvg={PLACEHOLDER_MARK} />
    </>
  );
};

const meta: Meta<typeof BootLoaderHost> = {
  title: 'sdk/app-framework/vite-plugin/BootLoader',
  component: BootLoaderHost,
  render: DefaultStory,
  decorators: [withTheme({})],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    initialStatus: { control: 'text' },
    markSvg: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<typeof BootLoaderHost>;

export const Default: Story = {};

/**
 * Renders the React `Placeholder` from `@dxos/app-framework/ui` on its own —
 * useful for eyeballing the handoff target the boot loader dismisses to.
 */
export const PlaceholderHandoff: Story = {
  name: 'Placeholder',
  render: () => <Placeholder stage={1} logo={(logoProps) => <Composer {...logoProps} />} />,
};

/**
 * End-to-end handoff sim: the driver ticks 0 → 100% then the host calls
 * `dismiss()` and the underlying `Placeholder` fades the mark in / out,
 * mirroring the production sequence.
 */
export const Handoff: Story = {
  render: () => {
    const { running, stage, advance } = useBootLoaderDriver({ withHandoff: true });
    return (
      <>
        <SimToolbar running={running} advance={advance} />
        <Placeholder stage={stage} logo={(logoProps) => <Composer {...logoProps} />} />
        {stage < 1 && <BootLoaderHost markSvg={PLACEHOLDER_MARK} />}
      </>
    );
  },
};
