//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../../meta';
import { Markdown } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settings = live<Markdown.Settings>({
      defaultViewMode: 'preview',
      toolbar: true,
      numberedHeadings: true,
      folding: true,
      experimental: false,
    });

    return Capability.contributes(Common.Capability.Settings, {
      prefix: meta.id,
      schema: Markdown.Settings,
      value: settings,
    });
  }),
);
