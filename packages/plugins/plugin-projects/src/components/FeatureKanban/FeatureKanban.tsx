//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { type DndContainerHandler } from '@dxos/react-ui-dnd';
import { Board, type BoardModel, Mosaic, type MosaicTileProps, useBoard } from '@dxos/react-ui-mosaic';
import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';

import {
  FeatureCard,
  type FeatureLookup,
  type FeatureModel,
  type FeatureStatus,
  makeFeatureLookup,
} from '../FeatureCard/index.ts';

/** Column order follows a feature's lifecycle; failing sits last, beside the operational features that regressed. */
export const FEATURE_KANBAN_STATUSES: readonly FeatureStatus[] = [
  'planned',
  'in-progress',
  'prototype',
  'operational',
  'failing',
];

export type FeatureKanbanProps = {
  features: readonly FeatureModel[];
  /** Called when a card is dropped on another column; the card moves once the feature's status changes. */
  onSetStatus?: (id: string, status: FeatureStatus) => void;
  onOpen?: (id: string) => void;
  onOpenObject?: (id: string) => void;
  onRemove?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  onDescribe?: (id: string, description: string) => void;
  editingId?: string;
  onEditingChange?: (id: string | undefined) => void;
};

type FeatureKanbanContextValue = Omit<FeatureKanbanProps, 'features'> & { lookup: FeatureLookup };

/** Mosaic tiles get only their item, so the board's callbacks reach the cards through context. */
const FeatureKanbanContext = createContext<FeatureKanbanContextValue>({ lookup: () => undefined });

const isFeatureModel = (value: unknown): value is FeatureModel =>
  typeof value === 'object' && value !== null && 'id' in value && 'status' in value && 'dependsOn' in value;

const FeatureKanbanCard = ({ data: feature, location, draggable }: MosaicTileProps<FeatureModel>) => {
  const { lookup, onOpen, onOpenObject, onSetStatus, onRemove, onRename, onDescribe, editingId, onEditingChange } =
    useContext(FeatureKanbanContext);
  const editing = onEditingChange ? feature.id === editingId : undefined;
  return (
    // The whole card is the drag source; while its fields are open the pointer must select text instead.
    <Mosaic.Tile
      id={feature.id}
      data={feature}
      location={location}
      draggable={draggable && !editing}
      data-testid='feature-kanban.card'
    >
      <FeatureCard
        feature={feature}
        lookup={lookup}
        showDependencies={false}
        onOpen={onOpen ? (feature) => onOpen(feature.id) : undefined}
        onOpenObject={onOpenObject}
        onSetStatus={onSetStatus ? (feature, status) => onSetStatus(feature.id, status) : undefined}
        onRemove={onRemove ? (feature) => onRemove(feature.id) : undefined}
        onRename={onRename ? (feature, name) => onRename(feature.id, name) : undefined}
        onDescribe={onDescribe ? (feature, description) => onDescribe(feature.id, description) : undefined}
        editing={editing}
        onEditingChange={(editing) => onEditingChange?.(editing ? feature.id : undefined)}
      />
    </Mosaic.Tile>
  );
};

const FeatureKanbanColumn = ({ data: status, location }: MosaicTileProps<FeatureStatus>) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { model } = useBoard<FeatureStatus, FeatureModel>('FeatureKanban.Column');
  const { onSetStatus } = useContext(FeatureKanbanContext);
  const count = useAtomValue(model.items(status)).length;

  // Order within a column is not stored, so only a drop on another column means anything.
  const eventHandler = useMemo<DndContainerHandler<FeatureModel>>(
    () => ({
      id: `feature-kanban-${status}`,
      canDrop: ({ source }) => !!onSetStatus && isFeatureModel(source.data) && source.data.status !== status,
      onTake: ({ source }, cb) => {
        void cb(source.data);
      },
      onDrop: ({ source }) => {
        if (isFeatureModel(source.data) && source.data.status !== status) {
          onSetStatus?.(source.data.id, status);
        }
      },
    }),
    [status, onSetStatus],
  );

  return (
    <Board.Column.Root
      data={status}
      location={location}
      draggable={false}
      classNames='grid grid-rows-[var(--dx-rail-action)_1fr]'
      // The column root keeps its own `board-column` test id, so the status names the column.
      data-status={status}
    >
      <Board.Column.Header
        label={t('feature-board.status-count.label', { count, status: t(`feature-status.${status}.label`) })}
      />
      <Board.Column.Body data={status} eventHandler={eventHandler} Tile={FeatureKanbanCard} />
    </Board.Column.Root>
  );
};

/**
 * The Kanban view of a project's features: a column per status, each feature's card in its status column.
 * Dragging a card to another column sets the feature's status.
 */
export const FeatureKanban = ({ features, ...props }: FeatureKanbanProps) => {
  const registry = useContext(RegistryContext);
  // Stable atoms fed from props, so a status change moves one card rather than rebuilding the board.
  const [featuresAtom] = useState(() => Atom.make<readonly FeatureModel[]>(features));
  useEffect(() => registry.set(featuresAtom, features), [registry, featuresAtom, features]);

  const model = useMemo<BoardModel<FeatureStatus, FeatureModel>>(() => {
    const columns = Atom.make<readonly FeatureStatus[]>(FEATURE_KANBAN_STATUSES);
    const items = Atom.family((status: FeatureStatus) =>
      Atom.make((get) => get(featuresAtom).filter((feature) => feature.status === status)),
    );
    return {
      getColumnId: (status) => status,
      getItemId: (feature) => feature.id,
      isColumn: (value): value is FeatureStatus => FEATURE_KANBAN_STATUSES.some((status) => status === value),
      isItem: isFeatureModel,
      columns,
      items,
      getColumns: () => [...registry.get(columns)],
      getItems: (status) => registry.get(items(status)),
    };
  }, [registry, featuresAtom]);

  const lookup = useMemo(() => makeFeatureLookup(features), [features]);
  const columnHandler = useMemo<DndContainerHandler<FeatureStatus>>(
    () => ({ id: 'feature-kanban-columns', canDrop: () => false }),
    [],
  );

  return (
    <FeatureKanbanContext.Provider value={{ ...props, lookup }}>
      <Board.Root model={model}>
        <Board.Content
          classNames='px-2'
          eventHandler={columnHandler}
          Tile={FeatureKanbanColumn}
          data-testid='feature-kanban'
        />
      </Board.Root>
    </FeatureKanbanContext.Provider>
  );
};
