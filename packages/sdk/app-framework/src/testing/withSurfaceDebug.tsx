//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React from 'react';

import { Surface } from '../ui';

/**
 * Storybook decorator that enables the surface debug overlays (`<dx-surface>` wrappers + boundary
 * badges) for the wrapped story. The flag is a `window` singleton, so it is (re)applied on every
 * render — enabling it on decorated stories and clearing it otherwise, so the setting never leaks
 * between stories. Prefer this over the `.storybook/preview` flag when the story must also render
 * under the aggregate root Storybook, which does not load a per-package preview.
 */
export const withSurfaceDebug =
  (enabled = true): Decorator =>
  (Story) => {
    Surface.setDebug(enabled);
    return <Story />;
  };
