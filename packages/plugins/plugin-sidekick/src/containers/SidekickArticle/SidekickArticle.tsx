//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { ActionItems, DayAhead, Permissions, ProfileGrid, ProfileSummary } from '#components';
import { meta } from '#meta';
import { type Sidekick } from '#types';

export type SidekickArticleProps = AppSurface.ObjectArticleProps<Sidekick.Profile>;

export const SidekickArticle = ({ role, subject: _sidekick, attendableId: _attendableId }: SidekickArticleProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <Panel.Root role={role} className='dx-document overflow-y-auto'>
      <Panel.Content>
        <Form.Section label={t('day-ahead.title')}>
          <DayAhead />
        </Form.Section>

        <Form.Section label={t('action-items.title')}>
          <ActionItems items={[]} />
        </Form.Section>

        <Form.Section label={t('profiles.title')}>
          <ProfileGrid profiles={[]} />
        </Form.Section>

        <Form.Section label={t('user-profile.title')}>
          <ProfileSummary />
        </Form.Section>

        <Form.Section label={t('permissions.title')}>
          <Permissions entries={[]} />
        </Form.Section>
      </Panel.Content>
    </Panel.Root>
  );
};
