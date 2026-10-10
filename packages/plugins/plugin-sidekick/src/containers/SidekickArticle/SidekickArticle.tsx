//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Layout from '@dxos/react-ui/Layout';

import { ActionItems, DayAhead, Permissions, ProfileGrid, ProfileSummary } from '#components';
import { Sidekick } from '#types';

export type SidekickArticleProps = AppSurface.ObjectArticleProps<Sidekick.Profile>;

export const SidekickArticle = ({ role, subject: _sidekick, attendableId: _attendableId }: SidekickArticleProps) => {
  return (
    <Layout.Container role={role} gutter='lg'>
      <div>
        <DayAhead />
        <ActionItems items={[]} />
        <ProfileGrid profiles={[]} />
        <ProfileSummary />
        <Permissions entries={[]} />
      </div>
    </Layout.Container>
  );
};

SidekickArticle.displayName = 'SidekickArticle';
