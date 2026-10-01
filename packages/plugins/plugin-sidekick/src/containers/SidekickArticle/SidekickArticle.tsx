//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Next } from '@dxos/react-ui/next';

import { ActionItems, DayAhead, Permissions, ProfileGrid, ProfileSummary } from '#components';
import { Sidekick } from '#types';

export type SidekickArticleProps = AppSurface.ObjectArticleProps<Sidekick.Profile>;

export const SidekickArticle = ({ role, subject: _sidekick, attendableId: _attendableId }: SidekickArticleProps) => {
  return (
    <Next.Container role={role} gutter='lg'>
      <div>
        <DayAhead />
        <ActionItems items={[]} />
        <ProfileGrid profiles={[]} />
        <ProfileSummary />
        <Permissions entries={[]} />
      </div>
    </Next.Container>
  );
};

SidekickArticle.displayName = 'SidekickArticle';
