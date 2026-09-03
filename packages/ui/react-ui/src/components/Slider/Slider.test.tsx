//
// Copyright 2026 DXOS.org
//

import { cleanup, render, screen } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { afterEach, describe, test } from 'vitest';

import { ThemeProvider } from '../../primitives/index.ts';
import { defaultTx } from '../../theme/index.ts';
import { Slider } from './Slider.tsx';

describe('Slider', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders one thumb per value with real (non-logical) size utility classes', ({ expect }) => {
    render(<Slider defaultValue={[25, 75]} max={100} step={1} thumbLabels={['Minimum', 'Maximum']} />, {
      wrapper: Wrapper,
    });

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

  test('keeps the thumb rendered (never removed) when disabled', ({ expect }) => {
    render(<Slider defaultValue={[50]} max={100} step={1} disabled aria-label='Value' />, { wrapper: Wrapper });

    // Disabled state is expressed via the root's `opacity-50` (visually muted), not by unmounting
    // the thumb — assert it is still present with its sizing classes intact.
    const thumb = screen.getByRole('slider');
    expect(thumb.className).toMatch(/\bh-\d+\b/);
    expect(thumb.className).toMatch(/\bw-\d+\b/);
  });

  test('gives each thumb an accessible name via thumbLabels', ({ expect }) => {
    render(<Slider defaultValue={[25, 75]} max={100} step={1} thumbLabels={['Minimum', 'Maximum']} />, {
      wrapper: Wrapper,
    });

    // `role="slider"` has no visible text an `Input.Label`'s `htmlFor` can reach; `thumbLabels`
    // is the only way to give it a name exposed to assistive tech.
    expect(screen.getByRole('slider', { name: 'Minimum' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Maximum' })).toBeTruthy();
  });

  test('gives a single thumb an accessible name via a plain aria-label', ({ expect }) => {
    render(<Slider defaultValue={[50]} max={100} step={1} aria-label='Volume' />, { wrapper: Wrapper });

    // Ergonomic shorthand for the common one-thumb case: no need to wrap the label in `thumbLabels`.
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeTruthy();
  });

  test('every rendered thumb, across default and multi-thumb usage, exposes an accessible name', ({ expect }) => {
    const { unmount } = render(<Slider defaultValue={[50]} max={100} step={1} aria-label='Value' />, {
      wrapper: Wrapper,
    });
    for (const thumb of screen.getAllByRole('slider')) {
      expect(thumb.getAttribute('aria-label')).toBeTruthy();
    }
    unmount();

    render(<Slider defaultValue={[25, 75]} max={100} step={1} thumbLabels={['Minimum', 'Maximum']} />, {
      wrapper: Wrapper,
    });
    for (const thumb of screen.getAllByRole('slider')) {
      expect(thumb.getAttribute('aria-label')).toBeTruthy();
    }
  });

  test('throws when thumbLabels covers only some of the rendered thumbs', ({ expect }) => {
    // Matching the invariant's own message, not just "it threw": a bare `toThrow()` would also be
    // satisfied by an unrelated render crash, which is exactly what this guard must not accept.
    expect(() =>
      render(<Slider defaultValue={[25, 75]} max={100} step={1} thumbLabels={['Minimum']} />, { wrapper: Wrapper }),
    ).toThrow('Slider: thumbLabels has 1 entries but 2 thumb(s) are rendered.');
  });

  test('throws when a multi-thumb slider is given no labels at all', ({ expect }) => {
    // The other half of the guard: `aria-label` names only a single thumb, so omitting `thumbLabels`
    // on a two-thumb slider would silently leave one thumb unnamed.
    expect(() =>
      render(<Slider defaultValue={[25, 75]} max={100} step={1} aria-label='Range' />, { wrapper: Wrapper }),
    ).toThrow('Slider: pass thumbLabels (2 entries) or, for a single thumb, aria-label.');
  });
});

// `ThemeProvider`'s default `tx` is a no-op (`() => undefined`) — pass `defaultTx` explicitly so
// `tx('slider.thumb', ...)` actually resolves classes, matching `useThemeContext.test.tsx`'s pattern.
const Wrapper = ({ children }: PropsWithChildren) => <ThemeProvider tx={defaultTx}>{children}</ThemeProvider>;
