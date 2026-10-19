//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
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
  /** Adds an open button to each card. */
  onOpen?: (id: string) => void;
};

/**
 * The cards view of a feature map: one card per feature in map order, under a count per status.
 * Selecting a card labels the features it needs and the features that need it, and fades the rest,
 * so a dependency chain reads without drawing edges.
 */
export const FeatureBoard = ({ features, selectedId: selectedIdProp, onSelect, onOpen }: FeatureBoardProps) => {
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
    <div className='flex flex-col gap-3 p-3 w-full' data-testid='feature-board'>
      <div className='flex flex-wrap gap-1'>
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
      </div>
      <div className='grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3 items-start'>
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
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
