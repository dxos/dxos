//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { Markdown, MarkdownCapabilities } from '#types';

export const MarkdownSettings = AppCapability.settings(
  () =>
    Effect.sync(() => {
      const settingsAtom = createKvsStore({
        key: meta.profile.key,
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
          prefix: meta.profile.key,
          schema: Markdown.Settings,
          atom: settingsAtom,
        }),
      ];
    }),
  {
    provides: [MarkdownCapabilities.Settings],
  },
);
