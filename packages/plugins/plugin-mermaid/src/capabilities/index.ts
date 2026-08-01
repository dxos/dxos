//
// Copyright 2023 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./markdown-extension'),
);
