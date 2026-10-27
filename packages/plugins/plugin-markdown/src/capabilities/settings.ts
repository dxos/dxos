//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { Markdown, MarkdownCapabilities } from '#types';

import { MarkdownNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
      key: MarkdownNamespace.key,
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
      Capability.contribute(MarkdownCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: MarkdownNamespace.key,
        schema: Markdown.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
