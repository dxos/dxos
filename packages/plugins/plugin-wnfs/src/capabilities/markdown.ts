//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { getSpace } from '@dxos/react-client/echo';

import { image } from '../extensions';

import { WnfsCapabilities } from './capabilities';

export default Capability.makeModule((context) =>
  Capability.contributes(MarkdownCapabilities.Extensions, [
    ({ document }: { document?: any }) => {
      const blockstore = context.getCapability(WnfsCapabilities.Blockstore);
      const instances = context.getCapability(WnfsCapabilities.Instances);

      if (document) {
        const space = getSpace(document);
        return space ? [image({ blockstore, instances, space })] : [];
      }

      return [];
    },
  ]),
);
