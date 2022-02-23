//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Item } from '@dxos/echo-db';
import { ItemID } from '@dxos/echo-protocol';
import { ObjectModel } from '@dxos/object-model';

import { BoxContainer, EchoBoard, EchoGraph, EchoGraphModel, EchoList, ItemAdapter } from '../../../src';
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
  return (
    <>
      <BoxContainer
        expand sx={{
          display: value !== ViewType.List ? 'none' : undefined
        }}>
        <EchoList
          itemAdapter={itemAdapter}
          items={items}
        />
      </BoxContainer>
      <BoxContainer
        expand sx={{
          display: value !== ViewType.Board ? 'none' : undefined
        }}>
        <EchoBoard
          itemAdapter={itemAdapter}
          items={items}
          onCreateItem={onCreateItem}
        />
      </BoxContainer>
      <BoxContainer
        expand sx={{
          display: value !== ViewType.Graph ? 'none' : undefined
        }}>
        <EchoGraph
          itemAdapter={itemAdapter}
          model={model}
          selected={selected}
          styles={graphStyles}
        />
      </BoxContainer>
    </>
  );
};
