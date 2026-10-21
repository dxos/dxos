//
// Copyright 2026 DXOS.org
//

import React, { createContext, useContext, useMemo, useState } from 'react';

import { Masonry } from '@dxos/react-ui-masonry';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';

import { meta } from '#meta';

import {
  FEATURE_STATUS_STYLE,
  FeatureCard,
  type FeatureLookup,
  type FeatureModel,
  type FeatureStatus,
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
  /** Each given action is offered in every card's menu. */
  onOpen?: (id: string) => void;
  /** Opens a spec, task or showcase listed on a card. */
  onOpenObject?: (id: string) => void;
  onSetStatus?: (id: string, status: FeatureStatus) => void;
  /** Takes a feature off its project; the feature itself is kept. */
  onRemove?: (id: string) => void;
  /** Make each card's name and description editable in place. */
  onRename?: (id: string, name: string) => void;
  onDescribe?: (id: string, description: string) => void;
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
const FeatureTileContext = createContext<FeatureTileContextValue>({ lookup: () => undefined, onSelect: () => {} });

const FeatureTile = ({ data: feature }: { data: FeatureModel }) => {
  const {
    lookup,
    selectedId,
    onSelect,
    onOpen,
    onOpenObject,
    onSetStatus,
    onRemove,
    onRename,
    onDescribe,
    editingId,
    onEditingChange,
  } = useContext(FeatureTileContext);
  const selected = selectedId ? lookup(selectedId) : undefined;
  const relation = getFeatureRelation(feature, selected);
  const faded = selected && feature.id !== selected.id && !relation;
  return (
    <div className={faded ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
      <FeatureCard
        feature={feature}
        lookup={lookup}
        selected={feature.id === selectedId}
        markSelected={false}
        relation={relation}
        onSelectDependency={onSelect}
        onOpen={onOpen ? (feature) => onOpen(feature.id) : undefined}
        onOpenObject={onOpenObject}
        onSetStatus={onSetStatus ? (feature, status) => onSetStatus(feature.id, status) : undefined}
        onRemove={onRemove ? (feature) => onRemove(feature.id) : undefined}
        onRename={onRename ? (feature, name) => onRename(feature.id, name) : undefined}
        onDescribe={onDescribe ? (feature, description) => onDescribe(feature.id, description) : undefined}
        // Controlled only for a host that tracks it; otherwise the edit button's toggle would be overridden.
        editing={onEditingChange ? feature.id === editingId : undefined}
        onEditingChange={(editing) => onEditingChange?.(editing ? feature.id : undefined)}
      />
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
  onOpenObject,
  onSetStatus,
  onRemove,
  onRename,
  onDescribe,
  editingId,
  onEditingChange,
}: FeatureBoardProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [selectedIdState, setSelectedIdState] = useState<string | undefined>(defaultSelectedId);
  const selectedId = selectedIdProp ?? selectedIdState;
  const lookup = useMemo(() => makeFeatureLookup(features), [features]);

  const handleSelect = (id: string | undefined) => {
    const next = id === selectedId ? undefined : id;
    setSelectedIdState(next);
    onSelect?.(next);
  };
  const selectedIds = useMemo(() => new Set(selectedId ? [selectedId] : []), [selectedId]);
  const tileContext: FeatureTileContextValue = {
    lookup,
    selectedId,
    onSelect: handleSelect,
    onOpen,
    onOpenObject,
    onSetStatus,
    onRemove,
    onRename,
    onDescribe,
    editingId,
    onEditingChange,
  };

  return (
    <Layout.Flex column gap='md' classNames='p-3 w-full' data-testid='feature-board'>
      <Layout.Flex wrap gap='xs'>
        {STATUSES.map((status) => {
          const count = features.filter((feature) => feature.status === status).length;
          return (
            count > 0 && (
              <Tag.Tag key={status} hue={FEATURE_STATUS_STYLE[status].hue}>
                <Icon.Icon icon={FEATURE_STATUS_STYLE[status].icon} size='xs' />
                {t('feature-board.status-count.label', { count, status: t(`feature-status.${status}.label`) })}
              </Tag.Tag>
            )
          );
        })}
      </Layout.Flex>
      {/* The host scrolls the counts and the cards together, so the grid takes no scroll container of its own. */}
      <FeatureTileContext.Provider value={tileContext}>
        <Masonry.Root Tile={FeatureTile} minColumnWidth={17}>
          <Masonry.Viewport
            items={features}
            getId={(feature) => feature.id}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            scroll={false}
          />
        </Masonry.Root>
      </FeatureTileContext.Provider>
    </Layout.Flex>
  );
};
