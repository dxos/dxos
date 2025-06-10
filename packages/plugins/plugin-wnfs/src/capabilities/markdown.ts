//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginContext } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { getSpace } from '@dxos/react-client/echo';

import { WnfsCapabilities } from './capabilities';
import { image } from '../extensions';

export default (context: PluginContext) =>
  contributes(MarkdownCapabilities.Extensions, [
    ({ document }) => {
      const blockstore = context.getCapability(WnfsCapabilities.Blockstore);
      const instances = context.getCapability(WnfsCapabilities.Instances);

      if (document) {
        const space = getSpace(document);
        return space ? [image({ blockstore, instances, space })] : [];
      }

      return [];
    },
  ]);
