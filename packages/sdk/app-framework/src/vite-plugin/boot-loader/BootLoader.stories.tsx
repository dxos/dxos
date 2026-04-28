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
   * Inline SVG markup. Use `fill="currentColor"` on the paths so the mark
   * inherits the loader's text colour.
   */
  markSvg?: string;
  /**
   * Optional progress fraction in [0, 1]. When set, switches the bar from
   * the default indeterminate slide animation to a determinate fill.
   */
  progress?: number;
};

const BootLoader = ({ status = 'Loading…', markSvg, progress }: BootLoaderProps) => {
  const determinate = typeof progress === 'number' && progress >= 0;
  const clamped = determinate ? Math.max(0, Math.min(1, progress!)) : 0;
  return (
    <>
      <style>{css}</style>
      <div id='boot-loader' role='status' aria-live='polite' aria-label='Initializing'>
        {markSvg ? <div id='boot-loader-mark' dangerouslySetInnerHTML={{ __html: markSvg }} /> : null}
        <div
          id='boot-loader-bar'
          {...(determinate
            ? {
                'data-determinate': '',
                style: { ['--boot-loader-bar-progress' as string]: String(clamped * 100) },
              }
            : {})}
        />
        <div id='boot-loader-status'>{status}</div>
      </div>
    </>
  );
};

// Stand-in mark — keeps storybook self-contained (the production app pipes in
// `packages/ui/brand/assets/icons/composer-icon-monochrome.svg` from
// vite.config.ts via the plugin's `markSvg` option).
const PLACEHOLDER_MARK = `
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5" />
    <path d="M8 12h8 M12 8v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
`;

const PHASES = ['Loading…', 'Loading framework…', 'Reading configuration…', 'Starting services…', 'Loading plugins…'];

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
  // Walk progress 0 → 1 over 6 s, mirroring composer's plugin counter.
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const total = 59;
    let loaded = 0;
    const handle = setInterval(() => {
      loaded += 1;
      setProgress(loaded / total);
      if (loaded >= total) {
        clearInterval(handle);
      }
    }, 100);
    return () => clearInterval(handle);
  }, []);
  const status = progress >= 1 ? 'Almost ready…' : `Loading plugins (${Math.round(progress * 59)}/59)…`;
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
 * `window.__bootLoader.status(...)`. Useful for verifying that the progress
 * bar's vertical position is stable across status changes — `#boot-loader-status`
 * has a fixed height so the line-box can't reflow the flex column.
 */
export const Cycling: Story = {
  render: () => <CyclingStory />,
};

/**
 * Determinate progress bar driven by `__bootLoader.progress(fraction)`.
 * Mirrors composer-app's behaviour during the `getPlugins` phase — the bar
 * fills 0 → 100% as plugin chunks resolve.
 */
export const Determinate: Story = {
  render: () => <DeterminateStory />,
};
