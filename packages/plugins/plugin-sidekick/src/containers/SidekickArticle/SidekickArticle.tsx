//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Column from '@dxos/react-ui/Column';

import { ActionItems, DayAhead, Permissions, ProfileGrid, ProfileSummary } from '#components';
import { Sidekick } from '#types';

export type SidekickArticleProps = AppSurface.ObjectArticleProps<Sidekick.Profile>;

export const SidekickArticle = ({ role, subject: _sidekick, attendableId: _attendableId }: SidekickArticleProps) => {
  return (
    <Column.Root role={role}>
      <Column.Center>
        <DayAhead />
        <ActionItems items={[]} />
        <ProfileGrid profiles={[]} />
        <ProfileSummary />
        <Permissions entries={[]} />
      </Column.Center>
    </Column.Root>
  );
};

SidekickArticle.displayName = 'SidekickArticle';
