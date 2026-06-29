//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { MarkdownCapabilities, type MarkdownExtensionProvider } from '@dxos/plugin-markdown/types';
import { getSpace } from '@dxos/react-client/echo';

import { FileCapabilities } from '#types';

import { image } from '../extensions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const provider: MarkdownExtensionProvider = ({ document, viewMode }) => {
      if (viewMode === 'source') {
        return undefined;
      }

      if (document) {
        const space = getSpace(document);
        if (!space) {
          return undefined;
        }
        const resolvers = capabilities.getAll(FileCapabilities.UrlResolver);
        return [image({ space, resolvers })];
      }

      return undefined;
    };

    return Capability.contributes(MarkdownCapabilities.ExtensionProvider, [provider]);
  }),
);
