//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { Markdown } from '../types';

export default Capability.makeModule(() => {
  const settings = live<Markdown.Settings>({
    defaultViewMode: 'preview',
    toolbar: true,
    numberedHeadings: true,
    folding: true,
    experimental: false,
  });

  return Capability.contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: Markdown.Settings,
    value: settings,
  });
});
