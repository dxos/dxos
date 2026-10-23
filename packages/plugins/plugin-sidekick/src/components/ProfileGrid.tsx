//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Masonry } from '@dxos/react-ui-masonry';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';

import { meta } from '#meta';

import { Section } from './Section.tsx';

export type ProfileCardData = {
  id: string;
  name: string;
  tag?: string;
  updatedCount?: number;
};

export type ProfileGridProps = {
  profiles: ProfileCardData[];
  onSelect?: (profileId: string) => void;
};

/** The profiles as a masonry of cards. */
export const ProfileGrid = ({ profiles, onSelect }: ProfileGridProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const itemProps = useCallback(
    (id: string) => (onSelect ? { onActivate: () => onSelect(id) } : undefined),
    [onSelect],
  );

  return (
    <Section title={t('profiles.title')}>
      {profiles.length === 0 ? (
        <p className='text-sm text-fg-muted italic'>{t('no-profiles.label')}</p>
      ) : (
        <Masonry.Root Tile={ProfileTile} centered={false}>
          {/* The sidekick article's viewport scrolls the cards with the other sections. */}
          <Masonry.Viewport items={profiles} getId={(profile) => profile.id} itemProps={itemProps} scroll={false} />
        </Masonry.Root>
      )}
    </Section>
  );
};

const ProfileTile = ({ data: profile }: { data: ProfileCardData }) => (
  <Card.Root>
    <Card.Header>
      <Layout.Block>
        <Icon.Icon icon='ph--user--regular' />
      </Layout.Block>
      <Card.Title truncate>{profile.name}</Card.Title>
    </Card.Header>
    {profile.tag && <Card.Row icon='ph--tag--regular'>{profile.tag}</Card.Row>}
    {(profile.updatedCount ?? 0) > 0 && <Card.Row icon='ph--star--regular'>{profile.updatedCount} new</Card.Row>}
  </Card.Root>
);
