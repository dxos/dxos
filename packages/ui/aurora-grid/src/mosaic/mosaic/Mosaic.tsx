//
// Copyright 2023 DXOS.org
//

import { DragEndEvent, DragOverlay } from '@dnd-kit/core';
import React, { createContext, PropsWithChildren, useCallback, useContext } from 'react';

import { List, useId } from '@dxos/aurora';

import {
  DndProvider,
  useDnd as useMosaicDnd,
  useDragEnd,
  useDragOver,
  useDragStart,
  useHandleRearrangeDragEnd,
} from '../dnd';
import {
  useHandleMigrateDragEnd,
  useHandleMigrateDragOver,
  useHandleMigrateDragStart,
} from '../dnd/hooks/useHandleMigrate';
import { Tile, Stack, Card, TreeItem } from '../tile';
import type { MosaicRootContextValue, MosaicContextValue } from '../types';
import { MosaicRootProps } from '../types';

const MosaicOverlayTile = ({ id }: { id: string }) => {
  const {
    mosaic: {
      tiles: { [id]: activeTile },
    },
    data: { [id]: data },
    Delegator,
  } = useMosaic();
  const Root = activeTile.variant === 'treeitem' ? List : 'div';
  return (
    <Root role='none'>
      <Delegator data={data} tile={activeTile} isOverlay />
    </Root>
  );
};

const MosaicOverlay = () => {
  const { activeId } = useMosaicDnd();
  console.log('[activeId]', activeId);
  return <DragOverlay>{activeId ? <MosaicOverlayTile id={activeId} /> : null}</DragOverlay>;
};

const defaultMosaicContextValue: MosaicContextValue = {
  data: {},
  mosaic: { tiles: {}, relations: {} },
  onMosaicChange: () => {},
  Delegator: () => null,
};

const MosaicContext = createContext<MosaicContextValue>(defaultMosaicContextValue);

const MosaicProviderImpl = ({ children }: PropsWithChildren<{}>) => {
  const handleDragStart = useHandleMigrateDragStart();
  const handleRearrangeDragEnd = useHandleRearrangeDragEnd();
  const handleMigrateDragEnd = useHandleMigrateDragEnd();
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      handleMigrateDragEnd(event, handleRearrangeDragEnd(event));
    },
    [handleRearrangeDragEnd, handleMigrateDragEnd],
  );
  const handleDragOver = useHandleMigrateDragOver();
  useDragStart(handleDragStart, [handleDragStart]);
  useDragEnd(handleDragEnd, [handleDragEnd]);
  useDragOver(handleDragOver, [handleDragOver]);
  return (
    <>
      {children}
      <MosaicOverlay />
    </>
  );
};

const MosaicProvider = ({ children, ...contextValue }: PropsWithChildren<MosaicContextValue>) => {
  return (
    <MosaicContext.Provider value={contextValue}>
      <DndProvider>
        <MosaicProviderImpl>{children}</MosaicProviderImpl>
      </DndProvider>
    </MosaicContext.Provider>
  );
};

const defaultMosaicRootContextValue: MosaicRootContextValue = {
  id: 'never',
};

const MosaicRootContext = createContext<MosaicRootContextValue>(defaultMosaicRootContextValue);

const useMosaic = () => useContext(MosaicContext);
const useMosaicRoot = () => useContext(MosaicRootContext);

const MosaicRoot = ({ children, ...value }: PropsWithChildren<MosaicRootProps>) => {
  const id = useId('mosaic', value.id);
  return <MosaicRootContext.Provider value={{ ...value, id }}>{children}</MosaicRootContext.Provider>;
};

export const Mosaic = {
  Provider: MosaicProvider,
  Root: MosaicRoot,
  Tile,
  Stack,
  Card,
  TreeItem,
};

export { useMosaic, useMosaicRoot, useMosaicDnd };
