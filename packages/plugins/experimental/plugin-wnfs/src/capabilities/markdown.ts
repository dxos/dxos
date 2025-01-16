//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginsContext } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { getSpace } from '@dxos/react-client/echo';

import { WnfsCapabilities } from './capabilities';
import { image as imageExtension } from '../extensions';

export default (context: PluginsContext) =>
  contributes(MarkdownCapabilities.Extensions, [
    ({ document }) => {
      const blockstore = context.requestCapability(WnfsCapabilities.Blockstore);
      if (!blockstore) {
        throw new Error('Blockstore is not ready yet');
      }

      if (document) {
        const space = getSpace(document);
        return space ? [imageExtension({ blockstore, space })] : [];
      }

      return [];
    },
  ]);
