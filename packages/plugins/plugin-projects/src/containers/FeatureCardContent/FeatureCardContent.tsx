//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';

import { type Feature } from '#types';

import { FeatureCard } from '../../components/FeatureCard/index.ts';
import { useFeatureGraph } from '../../hooks/index.ts';

export type FeatureCardContentProps = AppSurface.ObjectCardProps<Feature.Feature>;

/** A feature's card body wherever the app shows an object as a card; the host draws the frame and the name. */
export const FeatureCardContent = ({ subject }: FeatureCardContentProps) => {
  const { lookup } = useFeatureGraph(Obj.getDatabase(subject), [subject.id], { neighbours: true });
  const feature = lookup(subject.id);
  return feature ? (
    <FeatureCard.Provider feature={feature} lookup={lookup}>
      <FeatureCard.Body>
        <FeatureCard.Description />
        <FeatureCard.Tags />
        <FeatureCard.Summary />
      </FeatureCard.Body>
    </FeatureCard.Provider>
  ) : null;
};
