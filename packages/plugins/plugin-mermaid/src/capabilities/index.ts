//
// Copyright 2023 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import { MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown/types';

export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start },
  () => import('./markdown-extension'),
);
