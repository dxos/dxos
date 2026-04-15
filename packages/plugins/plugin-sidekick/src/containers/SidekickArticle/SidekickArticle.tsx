//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Column } from '@dxos/react-ui';

import { ActionItems, DayAhead, Permissions, ProfileGrid, ProfileSummary } from '#components';
import { type Sidekick } from '#types';

export type SidekickArticleProps = AppSurface.ObjectArticleProps<Sidekick.Profile>;

export const SidekickArticle = ({ role, subject: _sidekick, attendableId: _attendableId }: SidekickArticleProps) => {
  return (
    <Column.Root role={role}>
      <Column.Viewport>
        <DayAhead />
        <ActionItems items={[]} />
        <ProfileGrid profiles={[]} />
        <ProfileSummary />
        <Permissions entries={[]} />
      </Column.Viewport>
    </Column.Root>
  );
};
