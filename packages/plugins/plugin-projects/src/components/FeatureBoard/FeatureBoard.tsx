//
// Copyright 2026 DXOS.org
//

import React, { createContext, useContext, useMemo, useState } from 'react';

import { useListSelection } from '@dxos/react-ui-list';
import { Masonry } from '@dxos/react-ui-masonry';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';

import { meta } from '#meta';

import {
  FEATURE_STATUS_STYLE,
  FeatureCard,
  type FeatureChanges,
  type FeatureLookup,
  type FeatureModel,
  type FeatureStatus,
  type FeatureTarget,
  cardOpenHandlers,
  getFeatureRelation,
  makeFeatureLookup,
} from '../FeatureCard/index.ts';

const STATUSES: FeatureStatus[] = ['failing', 'planned', 'in-progress', 'prototype', 'operational'];

export type FeatureBoardProps = {
  features: readonly FeatureModel[];
  /** Controlled selection; uncontrolled when omitted. */
  selectedId?: string;
  /** The card selected when the board opens, as for a link to one feature; the user can then select others. */
  defaultSelectedId?: string;
  onSelect?: (id: string | undefined) => void;
  /** Opens a feature, or something a card lists. */
  onOpen?: (target: FeatureTarget) => void;
  /** Takes a feature off its project; the feature itself is kept. */
  onRemove?: (id: string) => void;
  /** Make each card's name and description editable in place. */
  onChange?: (id: string, changes: FeatureChanges) => void;
  /** The card whose name field is open, as for a feature just created; cleared when it closes. */
  editingId?: string;
  onEditingChange?: (id: string | undefined) => void;
};

type FeatureTileContextValue = Omit<FeatureBoardProps, 'features' | 'selectedId' | 'defaultSelectedId' | 'onSelect'> & {
  lookup: FeatureLookup;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
};

/** Masonry tiles get only their item, so the board's selection and edits reach them through context. */
const FeatureTileContext = createContext<FeatureTileContextValue>({
  lookup: () => undefined,
  onSelect: () => {},
});

const FeatureTile = ({ data: feature }: { data: FeatureModel }) => {
  const { lookup, selectedId, onSelect, onOpen, onRemove, onChange, editingId, onEditingChange } =
    useContext(FeatureTileContext);
  const selected = selectedId ? lookup(selectedId) : undefined;
  const relation = getFeatureRelation(feature, selected);
  const faded = selected && feature.id !== selected.id && !relation;
  // Controlled only for a host that tracks it; otherwise the edit button's toggle would be overridden.
  const editing = onEditingChange ? feature.id === editingId : undefined;
  return (
    // Masonry's tile is the arrow-key item and holds the selection; the card is its content, and only opens.
    <div
      className={faded ? 'opacity-40 transition-opacity' : 'transition-opacity'}
      {...cardOpenHandlers(onOpen && (() => onOpen({ type: 'object', id: feature.id })), { disabled: editing })}
    >
      {/* Not `selected`: a selected card would show more and grow, and the masonry reflow on every arrow key. */}
      <FeatureCard.Root
        feature={feature}
        lookup={lookup}
        relation={relation}
        onOpen={onOpen}
        onChange={onChange ? (feature, changes) => onChange(feature.id, changes) : undefined}
        editing={editing}
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
          <FeatureCard.DependencyCount />
        </FeatureCard.Body>
      </FeatureCard.Root>
    </div>
  );
};

/**
 * The cards view of a project's features: one card per feature, under a count per status.
 * Selecting a card labels the features it needs and the features that need it, and fades the rest,
 * so a dependency chain reads without drawing edges.
 */
export const FeatureBoard = ({
  features,
  selectedId: selectedIdProp,
  defaultSelectedId,
  onSelect,
  onOpen,
  onRemove,
  onChange,
  editingId,
  onEditingChange,
}: FeatureBoardProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [selectedIdState, setSelectedIdState] = useState<string | undefined>(defaultSelectedId);
  const selectedId = selectedIdProp ?? selectedIdState;
  const lookup = useMemo(() => makeFeatureLookup(features), [features]);
  const [query, setQuery] = useState('');
  // No status pressed shows every status.
  const [statuses, setStatuses] = useState<ReadonlySet<FeatureStatus>>(new Set());
  const toggleStatus = (status: FeatureStatus, pressed: boolean) =>
    setStatuses((current) => {
      const next = new Set(current);
      if (pressed) {
        next.add(status);
      } else {
        next.delete(status);
      }
      return next;
    });
  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    return features.filter(
      (feature) =>
        (statuses.size === 0 || statuses.has(feature.status)) &&
        (!text || `${feature.name} ${feature.description ?? ''}`.toLowerCase().includes(text)),
    );
  }, [features, query, statuses]);

  const handleSelect = (id: string | undefined) => {
    setSelectedIdState(id);
    onSelect?.(id);
  };
  // Single-select: the selected card follows the arrow keys, as in any list; Escape clears it.
  const { bind, clear } = useListSelection({ mode: 'single', value: selectedId, onValueChange: handleSelect });
  const tileContext: FeatureTileContextValue = {
    lookup,
    selectedId,
    onSelect: handleSelect,
    onOpen,
    onRemove,
    onChange,
    editingId,
    onEditingChange,
  };

  return (
    <Layout.Flex column gap='md' classNames='p-3 w-full' data-testid='feature-board'>
      {/* The status counts are the filter's toggles, so each says how many cards it adds. */}
      <Layout.Flex wrap gap='xs' classNames='items-center'>
        <Input.Root
          placeholder={t('feature-board.filter.placeholder')}
          aria-label={t('feature-board.filter.placeholder')}
          value={query}
          classNames='max-w-64'
          data-testid='feature-board.filter'
          onChange={(event) => setQuery(event.target.value)}
        />
        {STATUSES.map((status) => {
          const count = features.filter((feature) => feature.status === status).length;
          return (
            count > 0 && (
              <Button.Toggle
                key={status}
                variant='ghost'
                icon={FEATURE_STATUS_STYLE[status].icon}
                label={t('feature-board.status-count.label', { count, status: t(`feature-status.${status}.label`) })}
                pressed={statuses.has(status)}
                onPressedChange={(pressed) => toggleStatus(status, pressed)}
                data-testid={`feature-board.status.${status}`}
              />
            )
          );
        })}
      </Layout.Flex>
      {/* The host scrolls the counts and the cards together, so the grid takes no scroll container of its own. */}
      {/* Escape clears the selection, from whichever tile holds focus. */}
      <div onKeyDown={(event) => event.key === 'Escape' && clear()}>
        <FeatureTileContext.Provider value={tileContext}>
          <Masonry.Root Tile={FeatureTile} minColumnWidth={17}>
            <Masonry.Viewport
              items={shown}
              getId={(feature) => feature.id}
              itemProps={(id) => bind(id).rowProps}
              scroll={false}
            />
          </Masonry.Root>
        </FeatureTileContext.Provider>
      </div>
    </Layout.Flex>
  );
};
