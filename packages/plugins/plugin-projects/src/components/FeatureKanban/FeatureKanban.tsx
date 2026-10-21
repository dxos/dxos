//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { type DndContainerHandler } from '@dxos/react-ui-dnd';
import { Board, type BoardModel, Mosaic, type MosaicTileProps, useBoard } from '@dxos/react-ui-mosaic';
import * as Focus from '@dxos/react-ui/Focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Util from '@dxos/react-ui/Util';

import { meta } from '#meta';

import {
  FeatureCard,
  type FeatureChanges,
  type FeatureLookup,
  type FeatureModel,
  type FeatureStatus,
  type FeatureTarget,
  cardOpenHandlers,
  makeFeatureLookup,
} from '../FeatureCard/index.ts';

/** Mosaic tiles get only their item, so the board's callbacks reach the cards through context. */
const FeatureKanbanContext = createContext<FeatureKanbanContextValue>({ lookup: () => undefined });

const isFeatureModel = (value: unknown): value is FeatureModel =>
  typeof value === 'object' && value !== null && 'id' in value && 'status' in value && 'dependsOn' in value;

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
  onOpen?: (target: FeatureTarget) => void;
  onRemove?: (id: string) => void;
  /** Also called with a status when a card is dropped on another column; the card moves once the feature changes. */
  onChange?: (id: string, changes: FeatureChanges) => void;
  editingId?: string;
  onEditingChange?: (id: string | undefined) => void;
};

type FeatureKanbanContextValue = Omit<FeatureKanbanProps, 'features'> & { lookup: FeatureLookup };

const FeatureKanbanCard = ({ data: feature, location, draggable }: MosaicTileProps<FeatureModel>) => {
  const { lookup, onOpen, onRemove, onChange, editingId, onEditingChange } = useContext(FeatureKanbanContext);
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
      {/* The tile is the board's arrow-key item; the card is its content. */}
      <Focus.Item asChild data-focus-click>
        <FeatureCard.Root
          editing={editing}
          feature={feature}
          lookup={lookup}
          // Safari does not focus a clicked element that is not a control, and the ring marks where arrows continue.
          onClick={(event) => event.currentTarget.focus()}
          {...cardOpenHandlers(onOpen && (() => onOpen({ type: 'object', id: feature.id })), { disabled: editing })}
          onOpen={onOpen}
          onChange={onChange ? (feature, changes) => onChange(feature.id, changes) : undefined}
          onEditingChange={(editing) => onEditingChange?.(editing ? feature.id : undefined)}
        >
          <FeatureCard.Header>
            <FeatureCard.Status />
            <FeatureCard.Title />
            <FeatureCard.Save />
            <FeatureCard.Menu onRemove={onRemove ? (feature) => onRemove(feature.id) : undefined} />
          </FeatureCard.Header>
          <FeatureCard.Body>
            <FeatureCard.Description />
            <FeatureCard.Tags />
            <FeatureCard.SubfeatureCount />
            <FeatureCard.TaskCount />
            <FeatureCard.ShowcaseLead />
          </FeatureCard.Body>
        </FeatureCard.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
};

const FeatureKanbanColumn = ({ data: status, location }: MosaicTileProps<FeatureStatus>) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { model } = useBoard<FeatureStatus, FeatureModel>('FeatureKanban.Column');
  const { onChange } = useContext(FeatureKanbanContext);
  const count = useAtomValue(model.items(status)).length;

  // Order within a column is not stored, so only a drop on another column means anything.
  const eventHandler = useMemo<DndContainerHandler<FeatureModel>>(
    () => ({
      id: `feature-kanban-${status}`,
      canDrop: ({ source }) => !!onChange && isFeatureModel(source.data) && source.data.status !== status,
      onTake: ({ source }, cb) => {
        void cb(source.data);
      },
      onDrop: ({ source }) => {
        if (isFeatureModel(source.data) && source.data.status !== status) {
          onChange?.(source.data.id, { status });
        }
      },
    }),
    [status, onChange],
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
// Composable, so a host's slot (the Features tab's `Panel.Body asChild`) styles the board itself.
export const FeatureKanban = Util.composable<HTMLDivElement, FeatureKanbanProps>(
  ({ features, onOpen, onRemove, onChange, editingId, onEditingChange, ...props }, forwardedRef) => {
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
      <FeatureKanbanContext.Provider
        value={{
          lookup,
          onOpen,
          onRemove,
          onChange,
          editingId,
          onEditingChange,
        }}
      >
        <Board.Root model={model} navigation='grid'>
          <Board.Content
            {...Util.composableProps(props)}
            eventHandler={columnHandler}
            Tile={FeatureKanbanColumn}
            data-testid='feature-kanban'
            ref={forwardedRef}
          />
        </Board.Root>
      </FeatureKanbanContext.Provider>
    );
  },
);

FeatureKanban.displayName = 'FeatureKanban';
