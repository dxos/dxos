//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Obj } from '@dxos/echo';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';

import { image } from '../extensions';

export default Capability.makeModule(() =>
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
