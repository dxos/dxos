//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Item } from '@dxos/echo-db';
import { ItemID } from '@dxos/echo-protocol';
import { ObjectModel } from '@dxos/object-model';
import { ItemAdapter } from '@dxos/react-client-testing';
import { BoxContainer } from '@dxos/react-components';
import { EchoGraph, EchoGraphModel } from '@dxos/react-echo-graph';

import { EchoBoard, EchoList } from '../../../src';
import { graphStyles } from '../testing';
import { ViewType } from './ViewSelector';

interface ViewContainerProps {
  value: string
  model?: EchoGraphModel,
  items?: Item<ObjectModel>[]
  itemAdapter: ItemAdapter
  selected?: Set<ItemID>
  onCreateItem?: (type: string, title: string, parent?: ItemID) => void
}

export const ViewContainer = ({
  value,
  model,
  items,
  itemAdapter,
  selected,
  onCreateItem
}: ViewContainerProps) => {
  // TODO(burdon): Views lose state when not rendered, but graph has poor performance if other views are updated.
  return (
    <>
      {value === ViewType.List && (
        <BoxContainer expand column>
          <EchoList
            itemAdapter={itemAdapter}
            items={items}
          />
        </BoxContainer>
      )}

      {value === ViewType.Board && (
        <BoxContainer expand>
          <EchoBoard
            itemAdapter={itemAdapter}
            items={items}
            onCreateItem={onCreateItem}
          />
        </BoxContainer>
      )}

      {value === ViewType.Graph && (
        <BoxContainer expand>
          <EchoGraph
            model={model}
            selected={selected}
            itemAdapter={itemAdapter}
            styles={graphStyles}
          />
        </BoxContainer>
      )}
    </>
  );
};
