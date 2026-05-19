//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { type MarkdownExtensionProvider, MarkdownCapabilities } from '@dxos/plugin-markdown';
import { getSpace } from '@dxos/react-client/echo';

import { image } from '../extensions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const provider: MarkdownExtensionProvider = ({ document, viewMode }) => {
      if (viewMode === 'source') {
        return undefined;
      }

      if (document) {
        const space = getSpace(document);
        return space ? [image({ space })] : undefined;
      }

      return undefined;
    };

    return Capability.contributes(MarkdownCapabilities.Extensions, [provider]);
  }),
);
