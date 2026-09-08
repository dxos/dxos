//
// Copyright 2026 DXOS.org
//

import { act } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, test, vi } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { render } from '@dxos/app-framework/testing-react';
import { Toast } from '@dxos/react-ui';

import { ThemePlugin } from '#plugin';

// jsdom does not implement window.matchMedia, which the theme reads for the system preference.
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

describe('ThemePlugin ReactContext', () => {
  test('a toast with a close button renders under the app providers', async ({ expect }) => {
    await using harness = await createTestApp({
      plugins: [ProcessManagerPlugin(), ThemePlugin({})],
    });

    // Toasts render in the viewport rather than where their roots sit, so the viewport's place in the
    // provider tree decides whether the close button, a tooltip trigger, finds its provider.
    const result = render(
      harness,
      <Toast.Root open duration={Infinity}>
        <Toast.Title onClose={() => {}}>Deleted</Toast.Title>
      </Toast.Root>,
    );
    await act(async () => {});

    const toast = await result.findByText('Deleted');
    const root = toast.closest('[data-scope="toast"][data-part="root"]');
    expect(root).not.toBeNull();
    expect(root?.querySelector('button')).not.toBeNull();
  });
});
