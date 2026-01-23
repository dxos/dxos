//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { getSpace } from '@dxos/react-client/echo';

import { image } from '../../extensions';
import { WnfsCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    return Capability.contributes(MarkdownCapabilities.Extensions, [
      ({ document }: { document?: any }) => {
        const blockstore = capabilities.get(WnfsCapabilities.Blockstore);
        const instances = capabilities.get(WnfsCapabilities.Instances);

        if (document) {
          const space = getSpace(document);
          return space ? [image({ blockstore, instances, space })] : [];
        }

        return [];
      },
    ]);
  }),
);
