//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { type DndContainerHandler } from '@dxos/react-ui-dnd';
import { useListSelection } from '@dxos/react-ui-list';
import { Board, type BoardModel, Mosaic, type MosaicTileProps, useBoard } from '@dxos/react-ui-mosaic';
import * as Focus from '@dxos/react-ui/Focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Util from '@dxos/react-ui/Util';

import { meta } from '#meta';

import {
  FEATURE_STATUSES,
  FeatureCard,
  type FeatureChanges,
  type FeatureLookup,
  type FeatureModel,
  type FeatureStatus,
  cardOpenHandlers,
  getFeatureRelation,
  makeFeatureLookup,
} from '../FeatureCard/index.ts';

/** Mosaic tiles get only their item, so the board's callbacks reach the cards through context. */
const FeatureKanbanContext = createContext<FeatureKanbanContextValue>({ lookup: () => undefined });

const isFeatureModel = (value: unknown): value is FeatureModel =>
  typeof value === 'object' && value !== null && 'id' in value && 'status' in value && 'dependsOn' in value;

export type FeatureKanbanProps = {
  features: readonly FeatureModel[];
  /** Double-clicking a card zooms the map into the feature, to its subfeatures. */
  onZoom?: (id: string) => void;
  /** Called with a status when a card is dropped on another column; the card moves once the feature changes. */
  onChange?: (id: string, changes: FeatureChanges) => void;
  /** Controlled selection; uncontrolled when omitted. */
  selectedId?: string;
  /** The card selected when the board opens, as for a link to one feature. */
  defaultSelectedId?: string;
  onSelect?: (id: string | undefined) => void;
};

type FeatureKanbanContextValue = Omit<FeatureKanbanProps, 'features' | 'defaultSelectedId' | 'onSelect'> & {
  lookup: FeatureLookup;
  clearSelection?: () => void;
};

const FeatureKanbanCard = ({ data: feature, location, draggable, binding }: MosaicTileProps<FeatureModel>) => {
  const { lookup, selectedId, clearSelection, onZoom } = useContext(FeatureKanbanContext);
  const selected = selectedId ? lookup(selectedId) : undefined;
  const relation = getFeatureRelation(feature, selected);
  const faded = selected && feature.id !== selected.id && !relation;
  const { 'aria-selected': _, onClick, onKeyDown, ...selection } = Focus.bindItem(binding);
  return (
    // The whole card is the drag source.
    <Mosaic.Tile
      id={feature.id}
      data={feature}
      location={location}
      draggable={draggable}
      classNames={faded ? 'opacity-40 transition-opacity' : 'transition-opacity'}
      data-testid='feature-kanban.card'
    >
      {/* The card is the board's arrow-key item, selected as the board's `itemProps` say. */}
      <Focus.Item asChild data-focus-click selected={binding?.['aria-selected']}>
        <FeatureCard.Root
          feature={feature}
          lookup={lookup}
          relation={relation}
          {...selection}
          onKeyDown={(event) => {
            onKeyDown(event);
            if (event.key === 'Escape') {
              clearSelection?.();
            }
          }}
          onClick={(event) => {
            // Safari does not focus a clicked element that is not a control, and the ring marks where arrows continue.
            event.currentTarget.focus();
            onClick(event);
          }}
          {...cardOpenHandlers(onZoom && (() => onZoom(feature.id)))}
        >
          <FeatureCard.Header>
            <FeatureCard.Status />
            <FeatureCard.Title />
            <FeatureCard.Marks />
          </FeatureCard.Header>
          <FeatureCard.Body>
            <FeatureCard.Description />
            <FeatureCard.Summary />
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
 * The Kanban view of one level of a project's features: a column per status, each feature's card in its status column.
 * Dragging a card to another column sets the feature's status; double-clicking one zooms into its subfeatures.
 */
// Composable, so a host's slot (the spec map's `Panel.Body asChild`) styles the board itself.
export const FeatureKanban = Util.composable<HTMLDivElement, FeatureKanbanProps>(
  ({ features, onZoom, onChange, selectedId: selectedIdProp, defaultSelectedId, onSelect, ...props }, forwardedRef) => {
    const [selectedIdState, setSelectedIdState] = useState<string | undefined>(defaultSelectedId);
    const selectedId = selectedIdProp ?? selectedIdState;
    const handleSelect = (id: string | undefined) => {
      setSelectedIdState(id);
      onSelect?.(id);
    };
    // Single-select: the selected card follows the arrow keys; Escape clears it.
    const { bind, clear } = useListSelection({ mode: 'single', value: selectedId, onValueChange: handleSelect });
    const registry = useContext(RegistryContext);
    // Stable atoms fed from props, so a status change moves one card rather than rebuilding the board.
    const [featuresAtom] = useState(() => Atom.make<readonly FeatureModel[]>(features));
    useEffect(() => registry.set(featuresAtom, features), [registry, featuresAtom, features]);

    const model = useMemo<BoardModel<FeatureStatus, FeatureModel>>(() => {
      const columns = Atom.make<readonly FeatureStatus[]>(FEATURE_STATUSES);
      const items = Atom.family((status: FeatureStatus) =>
        Atom.make((get) => get(featuresAtom).filter((feature) => feature.status === status)),
      );
      return {
        getColumnId: (status) => status,
        getItemId: (feature) => feature.id,
        isColumn: (value): value is FeatureStatus => FEATURE_STATUSES.some((status) => status === value),
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
          selectedId,
          clearSelection: clear,
          onZoom,
          onChange,
        }}
      >
        <Board.Root model={model} navigation='grid' itemProps={(id) => bind(id).rowProps}>
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
