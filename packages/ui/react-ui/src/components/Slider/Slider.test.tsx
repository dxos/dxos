//
// Copyright 2026 DXOS.org
//

import { cleanup, render, screen } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { ThemeProvider } from '../../primitives';
import { defaultTx } from '../../theme';
import { Slider } from './Slider';

// `ThemeProvider`'s default `tx` is a no-op (`() => undefined`) — pass `defaultTx` explicitly so
// `tx('slider.thumb', ...)` actually resolves classes, matching `useThemeContext.test.tsx`'s pattern.
const Wrapper = ({ children }: PropsWithChildren) => <ThemeProvider tx={defaultTx}>{children}</ThemeProvider>;

describe('Slider', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders one thumb per value with real (non-logical) size utility classes', () => {
    render(<Slider defaultValue={[25, 75]} max={100} step={1} />, { wrapper: Wrapper });

    const thumbs = screen.getAllByRole('slider');
    expect(thumbs).toHaveLength(2);

    // Regression guard for the invisible-thumb bug: `is-4`/`bs-4` are not real Tailwind utilities
    // in this repo's config (no logical inline-/block-size plugin is configured), so they generated
    // no CSS and the thumb collapsed to zero size. happy-dom has no layout engine, so a computed
    // `getBoundingClientRect`/`getComputedStyle` size assertion cannot fail meaningfully here (it
    // would pass or fail independent of the actual applied CSS) — asserting the class list carries
    // real (non-logical) sizing utilities, and never the invalid `is-*`/`bs-*` ones, is the
    // strongest check available in this environment. Matches any size value, not a specific one.
    for (const thumb of thumbs) {
      expect(thumb.className).toMatch(/\bh-\d+\b/);
      expect(thumb.className).toMatch(/\bw-\d+\b/);
      expect(thumb.className).not.toMatch(/\bis-\d+\b/);
      expect(thumb.className).not.toMatch(/\bbs-\d+\b/);
    }
  });

  test('keeps the thumb rendered (never removed) when disabled', () => {
    render(<Slider defaultValue={[50]} max={100} step={1} disabled />, { wrapper: Wrapper });

    // Disabled state is expressed via the root's `opacity-50` (visually muted), not by unmounting
    // the thumb — assert it is still present with its sizing classes intact.
    const thumb = screen.getByRole('slider');
    expect(thumb.className).toMatch(/\bh-\d+\b/);
    expect(thumb.className).toMatch(/\bw-\d+\b/);
  });

  test('gives each thumb an accessible name via thumbLabels', () => {
    render(<Slider defaultValue={[25, 75]} max={100} step={1} thumbLabels={['Minimum', 'Maximum']} />, {
      wrapper: Wrapper,
    });

    // `role="slider"` has no visible text an `Input.Label`'s `htmlFor` can reach; `thumbLabels`
    // is the only way to give it a name exposed to assistive tech.
    expect(screen.getByRole('slider', { name: 'Minimum' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Maximum' })).toBeTruthy();
  });
});
