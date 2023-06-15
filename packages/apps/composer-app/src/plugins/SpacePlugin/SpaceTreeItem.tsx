//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/aurora';
import { SpaceState } from '@dxos/client';
import { useMulticastObservable } from '@dxos/react-async';
import { Space, observer } from '@dxos/react-client';
import { GraphNode } from '@dxos/react-surface';

import { getSpaceDisplayName } from './getSpaceDisplayName';

export const SpaceTreeItem = observer(({ data: item }: { data: GraphNode<Space> }) => {
  const space = item.data!;
  const { t } = useTranslation('composer');
  const spaceSate = useMulticastObservable(space.state);
  const disabled = spaceSate !== SpaceState.READY;
  const spaceDisplayName = getSpaceDisplayName(t, space, disabled);

  return <>{spaceDisplayName}</>;
});
