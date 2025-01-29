//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginsContext } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { getSpace } from '@dxos/react-client/echo';

import { WnfsCapabilities } from './capabilities';
import { image } from '../extensions';

export default (context: PluginsContext) =>
  contributes(MarkdownCapabilities.Extensions, [
    ({ document }) => {
      const blockstore = context.requestCapability(WnfsCapabilities.Blockstore);
      const instances = context.requestCapability(WnfsCapabilities.Instances);

      if (document) {
        const space = getSpace(document);
        return space ? [image({ blockstore, instances, space })] : [];
      }

      return [];
    },
  ]);
