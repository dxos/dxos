//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { Markdown } from '../types';

export default defineCapabilityModule(() => {
  const settings = live<Markdown.Settings>({
    defaultViewMode: 'preview',
    toolbar: true,
    numberedHeadings: true,
    folding: true,
    experimental: false,
  });

  return contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: Markdown.Settings,
    value: settings,
  });
});
