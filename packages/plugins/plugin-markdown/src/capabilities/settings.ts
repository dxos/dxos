//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework/next';
import { create } from '@dxos/live-object';

import { MARKDOWN_PLUGIN } from '../meta';
import { type MarkdownSettingsProps, MarkdownSettingsSchema } from '../types';

export default () => {
  const settings = create<MarkdownSettingsProps>({
    defaultViewMode: 'preview',
    toolbar: true,
    numberedHeadings: true,
    folding: true,
    experimental: false,
  });

  return contributes(Capabilities.Settings, {
    schema: MarkdownSettingsSchema,
    prefix: MARKDOWN_PLUGIN,
    value: settings,
  });
};
