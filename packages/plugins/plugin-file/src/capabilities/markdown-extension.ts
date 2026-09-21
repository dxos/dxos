//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Obj } from '@dxos/echo';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';

import { image } from '../extensions/index.ts';

// Browser-only: the `image` editor extension mounts a React tree into the CodeMirror widget via
// `react-dom/client`.
export const Markdown = Capability.makeModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start, environments: [] },
  () =>
    Effect.sync(() => {
      const provider: MarkdownCapabilities.MarkdownExtensionProvider = ({ document, viewMode }) => {
        if (viewMode === 'source') {
          return undefined;
        }

        if (document) {
          const db = Obj.getDatabase(document);
          if (!db) {
            return undefined;
          }
          return [image({ db })];
        }

        return undefined;
      };

      return Capability.contribute(MarkdownCapabilities.ExtensionProvider, [provider]);
    }),
);
