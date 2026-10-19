//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Tag from '@dxos/react-ui/Tag';

import { meta } from '#meta';

import { type FeatureModel, type FeatureStage, getFeatureRelation, makeFeatureLookup } from './feature.ts';
import { FEATURE_STAGE_STYLE, FeatureCard } from './FeatureCard.tsx';

const STAGES: FeatureStage[] = ['planned', 'preview', 'stable'];

export type FeatureMapProps = {
  features: readonly FeatureModel[];
  /** Controlled selection; uncontrolled when omitted. */
  selectedId?: string;
  onSelect?: (id: string | undefined) => void;
};

/**
 * Features grouped into one column per spec, in the order given. Selecting a card labels the
 * features it needs and the features that need it, and fades the rest, so a dependency chain
 * reads across plugins without drawing edges.
 */
export const FeatureMap = ({ features, selectedId: selectedIdProp, onSelect }: FeatureMapProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [selectedIdState, setSelectedIdState] = useState<string>();
  const selectedId = selectedIdProp ?? selectedIdState;
  const lookup = useMemo(() => makeFeatureLookup(features), [features]);
  const selected = selectedId ? lookup(selectedId) : undefined;

  const columns = useMemo(() => {
    const bySpec = new Map<string, FeatureModel[]>();
    for (const feature of features) {
      bySpec.set(feature.specKey, [...(bySpec.get(feature.specKey) ?? []), feature]);
    }
    return [...bySpec.values()];
  }, [features]);

  const handleSelect = (id: string | undefined) => {
    const next = id === selectedId ? undefined : id;
    setSelectedIdState(next);
    onSelect?.(next);
  };

  return (
    <div
      className='grid grid-flow-col auto-cols-[minmax(17rem,1fr)] gap-3 overflow-x-auto p-3'
      data-testid='feature-map'
    >
      {columns.map((column) => (
        <section key={column[0].specKey} className='flex flex-col gap-2' aria-label={column[0].specName}>
          <header className='flex flex-col gap-1 px-1'>
            <h2 className='text-sm font-medium'>{column[0].specName}</h2>
            <div className='flex gap-1'>
              {STAGES.map((stage) => {
                const count = column.filter((feature) => feature.stage === stage).length;
                return (
                  count > 0 && (
                    <Tag.Tag key={stage} hue={FEATURE_STAGE_STYLE[stage].hue}>
                      <Icon.Icon icon={FEATURE_STAGE_STYLE[stage].icon} size='xs' />
                      {t('feature-map.stage-count.label', { count, stage: t(`feature-stage.${stage}.label`) })}
                    </Tag.Tag>
                  )
                );
              })}
            </div>
          </header>
          {column.map((feature) => {
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
                />
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
};
