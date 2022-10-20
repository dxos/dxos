//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { ItemID } from '@dxos/protocols';
import { ItemAdapter } from '@dxos/react-client-testing';
import { BoxContainer } from '@dxos/react-components';
import { EchoGraph, EchoGraphModel } from '@dxos/react-echo-graph';

import { EchoBoard } from '../EchoBoard';
import { EchoList } from '../EchoList';
import { graphStyles } from '../Theme';
import { ViewType } from './ViewSelector';

interface ViewContainerProps {
  value: string
  model?: EchoGraphModel
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
}: ViewContainerProps) => (
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
