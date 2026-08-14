//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { getSpace } from '@dxos/react-client/echo';

import { image } from '../extensions';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const provider: MarkdownCapabilities.MarkdownExtensionProvider = ({ document, viewMode }) => {
      if (viewMode === 'source') {
        return undefined;
      }

      if (document) {
        const space = getSpace(document);
        if (!space) {
          return undefined;
        }
        return [image({ space })];
      }

      return undefined;
    };

    return Capability.contribute(MarkdownCapabilities.ExtensionProvider, [provider]);
  }),
);
