//
// Copyright 2023 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider] },
  () => import('./markdown-extension'),
);
