//
// Copyright 2026 DXOS.org
//

import type { ComponentType } from 'react';

import type * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

/**
 * Node build of the create-Connection panel: absent.
 *
 * `CreateObject` declares `environments: ['node']`, so `create-object.ts` is loaded outside a DOM
 * and must not reach React. Importing the panel directly would drag it in — a `type`-only import of
 * `ComponentType` does not. The browser build (`create-panel.browser.ts`) supplies the real
 * component; the create entry simply has no custom panel here, which is correct, since nothing
 * headless renders one.
 */
export const CreateConnectionPanel: ComponentType<SpaceCapabilities.CreateObjectCustomPanelProps> | undefined =
  undefined;
