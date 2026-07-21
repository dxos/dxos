//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity, Obj } from '@dxos/echo';
import { Card, Icon, IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu } from '@dxos/react-ui-menu';

import { useRelatedObjects } from '#hooks';
import { meta } from '#meta';

export type RelatedArticleProps = Pick<
  AppSurface.ObjectArticleProps<Obj.Unknown, {}, Obj.Unknown>,
  'role' | 'companionTo'
>;

export const RelatedArticle = ({ role, companionTo }: RelatedArticleProps) => {
  const db = Obj.getDatabase(companionTo);
  const items = useRelatedObjects(db, companionTo, { references: true, relations: true });

  return (
    <Masonry.Root Tile={ObjectCard}>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <Toolbar.Root />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Masonry.Content centered>
            <Masonry.Viewport items={items} />
          </Masonry.Content>
        </Panel.Content>
      </Panel.Root>
    </Masonry.Root>
  );
};

/** Masonry tile renderer for a related entity. */
const ObjectCard = ({ data: subject, classNames }: { data: Entity.Unknown; classNames?: string }) => {
  const { t } = useTranslation(meta.profile.key);
  const data = useMemo(() => ({ subject }), [subject]);
  const icon = Entity.getIcon(subject)?.icon ?? 'ph--circle-dashed--regular';

  // TODO(burdon): BUG: Includes item itself.
  const menuItems = useObjectMenuItems(subject);

  return (
    <Menu.Root>
      <Card.Root classNames={classNames}>
        <Card.Header>
          <Card.Block>
            <Icon icon={icon} />
          </Card.Block>
          <Card.Title>{Entity.getLabel(subject, { fallback: 'typename' })}</Card.Title>
          <Card.Block end>
            <Menu.Trigger asChild disabled={!menuItems?.length}>
              <IconButton
                iconOnly
                variant='ghost'
                icon='ph--dots-three-vertical--regular'
                label={t('more-actions.label')}
              />
            </Menu.Trigger>
            <Menu.Content items={menuItems} />
          </Card.Block>
        </Card.Header>
        <Card.Body>
          <Surface.Surface type={AppSurface.CardContent} data={data} limit={1} />
        </Card.Body>
      </Card.Root>
    </Menu.Root>
  );
};

RelatedArticle.displayName = 'RelatedArticle';
