//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../../meta';
import { Markdown, MarkdownCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: Markdown.Settings,
      defaultValue: () => ({
        defaultViewMode: 'preview' as const,
        toolbar: true,
        numberedHeadings: true,
        folding: true,
        experimental: false,
      }),
    });

    return [
      Capability.contributes(MarkdownCapabilities.Settings, settingsAtom),
      Capability.contributes(Common.Capability.Settings, {
        prefix: meta.id,
        schema: Markdown.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
