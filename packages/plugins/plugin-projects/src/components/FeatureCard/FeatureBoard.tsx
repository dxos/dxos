//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';

import { meta } from '#meta';

import { type FeatureModel, type FeatureStatus, getFeatureRelation, makeFeatureLookup } from './feature.ts';
import { FEATURE_STATUS_STYLE, FeatureCard } from './FeatureCard.tsx';

const STATUSES: FeatureStatus[] = ['failing', 'planned', 'in-progress', 'prototype', 'operational'];

export type FeatureBoardProps = {
  features: readonly FeatureModel[];
  /** Controlled selection; uncontrolled when omitted. */
  selectedId?: string;
  onSelect?: (id: string | undefined) => void;
  /** Each given action is offered in every card's menu. */
  onOpen?: (id: string) => void;
  /** Opens a spec, task or showcase listed on a card. */
  onOpenObject?: (id: string) => void;
  onSetStatus?: (id: string, status: FeatureStatus) => void;
  /** Takes a feature off the map; the feature itself is kept. */
  onRemove?: (id: string) => void;
  /** Make each card's name and description editable in place. */
  onRename?: (id: string, name: string) => void;
  onDescribe?: (id: string, description: string) => void;
  /** The card whose name field is open, as for a feature just created; cleared when it closes. */
  editingId?: string;
  onEditingChange?: (id: string | undefined) => void;
};

/**
 * The cards view of a feature map: one card per feature in map order, under a count per status.
 * Selecting a card labels the features it needs and the features that need it, and fades the rest,
 * so a dependency chain reads without drawing edges.
 */
export const FeatureBoard = ({
  features,
  selectedId: selectedIdProp,
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
  const [selectedIdState, setSelectedIdState] = useState<string>();
  const selectedId = selectedIdProp ?? selectedIdState;
  const lookup = useMemo(() => makeFeatureLookup(features), [features]);
  const selected = selectedId ? lookup(selectedId) : undefined;

  const handleSelect = (id: string | undefined) => {
    const next = id === selectedId ? undefined : id;
    setSelectedIdState(next);
    onSelect?.(next);
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
      {/* An auto-filling track count has no `cols` form, so the template stays a class. */}
      <Layout.Grid gap='md' align='start' classNames='grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]'>
        {features.map((feature) => {
          const relation = getFeatureRelation(feature, selected);
          const faded = selected && feature.id !== selected.id && !relation;
          return (
            <div key={feature.id} className={faded ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
              <FeatureCard
                feature={feature}
                lookup={lookup}
                selected={feature.id === selectedId}
                relation={relation}
                onSelect={(feature) => handleSelect(feature.id)}
                onSelectDependency={handleSelect}
                onOpen={onOpen ? (feature) => onOpen(feature.id) : undefined}
                onOpenObject={onOpenObject}
                onSetStatus={onSetStatus ? (feature, status) => onSetStatus(feature.id, status) : undefined}
                onRemove={onRemove ? (feature) => onRemove(feature.id) : undefined}
                onRename={onRename ? (feature, name) => onRename(feature.id, name) : undefined}
                onDescribe={onDescribe ? (feature, description) => onDescribe(feature.id, description) : undefined}
                editingName={feature.id === editingId}
                onEditingNameChange={(editing) => onEditingChange?.(editing ? feature.id : undefined)}
              />
            </div>
          );
        })}
      </Layout.Grid>
    </Layout.Flex>
  );
};
