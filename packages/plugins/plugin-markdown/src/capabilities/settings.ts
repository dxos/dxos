//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { type MarkdownSettingsProps, MarkdownSettingsSchema } from '../types';

export default () => {
  const settings = live<MarkdownSettingsProps>({
    defaultViewMode: 'preview',
    toolbar: true,
    numberedHeadings: true,
    folding: true,
    experimental: false,
  });

  return contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: MarkdownSettingsSchema,
    value: settings,
  });
};
