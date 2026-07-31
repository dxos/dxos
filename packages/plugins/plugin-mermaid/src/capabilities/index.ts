//
// Copyright 2023 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider] },
  () => import('./markdown-extension'),
);
