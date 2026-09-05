//
// Copyright 2026 DXOS.org
//

import { cleanup, render, screen } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { afterEach, describe, test } from 'vitest';

import { ThemeProvider } from '../../primitives';
import { defaultTx } from '../../theme';
import { Toolbar } from './Toolbar';

/**
 * `Toolbar.Root` resolves its role as `role ?? 'toolbar'`, so a `role` key spread as `undefined`
 * must not strip it — that once silently removed the role from every toolbar in the app (roving
 * focus and assistive tech both key off it). These pin the three cases.
 */
describe('Toolbar.Root', () => {
  afterEach(() => {
    cleanup();
  });

  test('keeps the default role when the caller passes none', async ({ expect }) => {
    render(
      <Toolbar.Root>
        <Toolbar.Button>Action</Toolbar.Button>
      </Toolbar.Root>,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('toolbar')).toBeDefined();
  });

  test('forwards an explicit role', async ({ expect }) => {
    render(<Toolbar.Root role='menubar' />, { wrapper: Wrapper });

    expect(screen.getByRole('menubar')).toBeDefined();
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  test("forwards role='' rather than falling back to the default", async ({ expect }) => {
    render(<Toolbar.Root role='' />, { wrapper: Wrapper });

    expect(screen.queryByRole('toolbar')).toBeNull();
  });
});

const Wrapper = ({ children }: PropsWithChildren) => <ThemeProvider tx={defaultTx}>{children}</ThemeProvider>;
