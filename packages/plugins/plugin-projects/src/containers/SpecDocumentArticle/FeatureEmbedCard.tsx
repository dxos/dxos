//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Database, Filter, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as UiHooks from '@dxos/react-ui/Hooks';
import { type ObjectLinkProps } from '@dxos/ui-editor';

import { Feature, FeatureEmbed } from '#types';

import { FeatureCard } from '../../components/FeatureCard/index.ts';
import { useFeatureGraph } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import { useFeatureSelection } from '../SpecFeatures/spec-map-actions.ts';

export type FeatureEmbedCardProps = ObjectLinkProps & {
  db?: Database.Database;
  attendableId?: string;
};

/** A feature embedded in a spec document, drawn as its card; a click selects it, which shows it in the companion. */
export const FeatureEmbedCard = ({ eid, label, db, attendableId }: FeatureEmbedCardProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const id = FeatureEmbed.entityId(eid);
  const [object] = useQuery(db, Query.select(Filter.id(id)));
  const feature = Feature.instanceOf(object) ? object : undefined;
  const { lookup } = useFeatureGraph(db, feature ? [feature.id] : [], { neighbours: true });
  const model = feature && lookup(feature.id);
  const { selectedId, select } = useFeatureSelection(attendableId);

  if (!model) {
    return (
      <div className='p-2 text-fg-muted' data-testid='feature-embed.missing'>
        {t('feature-embed.missing.message', { label })}
      </div>
    );
  }

  return (
    <div
      className='py-1'
      data-testid='feature-embed'
      data-feature={model.id}
      data-selected={selectedId === model.id || undefined}
    >
      <FeatureCard.Root feature={model} lookup={lookup} classNames='cursor-pointer' onClick={() => select(model.id)}>
        <FeatureCard.Header>
          <FeatureCard.Status />
          <FeatureCard.Title />
          <FeatureCard.Marks />
        </FeatureCard.Header>
        <FeatureCard.Body>
          <FeatureCard.Description />
          <FeatureCard.Requirements />
        </FeatureCard.Body>
      </FeatureCard.Root>
    </div>
  );
};
