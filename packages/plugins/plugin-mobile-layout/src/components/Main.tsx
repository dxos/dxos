//
// Copyright 2025 DXOS.org
//

import React, { Activity, useMemo } from 'react';

import { useCapability } from '@dxos/app-framework';
import { useAppGraph } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework';
import { useNode } from '@dxos/plugin-graph';
import { Main as NaturalMain } from '@dxos/react-ui';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';

import { MobileLayoutState } from '../capabilities';

import { ContentError } from './ContentError';
import { ContentLoading } from './ContentLoading';
import { Home } from './Home';
import { NavHeader } from './NavHeader';

export const Main = () => {
  const layout = useCapability(MobileLayoutState);
  const id = layout.active ?? layout.workspace;
  const { graph } = useAppGraph();
  const node = useNode(graph, id);

  const placeholder = useMemo(() => <ContentLoading />, []);

  const { variant } = parseEntryId(id);
  const data = useMemo(
    () =>
      node && {
        attendableId: id,
        subject: node.data,
        properties: node.properties,
        variant,
        popoverAnchorId: layout.popoverAnchorId,
      },
    [node, node?.data, node?.properties, layout.popoverAnchorId, variant],
  );

  // TODO(wittjosiah): Content probably needs a header with title and back button.
  return (
    <NaturalMain.Root>
      <Activity mode={id === 'default' ? 'visible' : 'hidden'}>
        <Home />
      </Activity>
      <Activity mode={id !== 'default' ? 'visible' : 'hidden'}>
        <NavHeader node={node} />
        <Surface key={id} role='article' data={data} limit={1} fallback={ContentError} placeholder={placeholder} />
      </Activity>
    </NaturalMain.Root>
  );
};

// TODO(wittjosiah): Factor out. Copied from deck plugin.
const parseEntryId = (entryId: string) => {
  const [id, variant] = entryId.split(ATTENDABLE_PATH_SEPARATOR);
  return { id, variant };
};
