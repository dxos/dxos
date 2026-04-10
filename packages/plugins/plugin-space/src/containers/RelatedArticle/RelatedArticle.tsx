//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useObjectMenuItems, type AppSurface } from '@dxos/app-toolkit/ui';
import { Annotation, Entity, Obj } from '@dxos/echo';
import { Card, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu } from '@dxos/react-ui-menu';

import { useRelatedObjects } from '#hooks';
import { meta } from '#meta';

// TODO(burdon): Companion type.
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
          <Masonry.Content classNames='p-2' centered items={items} />
        </Panel.Content>
      </Panel.Root>
    </Masonry.Root>
  );
};

/** Masonry tile renderer for a related entity. */
const ObjectCard = ({ data: subject, classNames }: { data: Entity.Unknown; classNames?: string }) => {
  const { t } = useTranslation(meta.id);
  const data = useMemo(() => ({ subject }), [subject]);
  const icon = Function.pipe(
    Obj.getSchema(subject),
    Option.fromNullable,
    Option.flatMap(Annotation.IconAnnotation.get),
    Option.map(({ icon }) => icon),
    Option.getOrElse(() => 'ph--placeholder--regular'),
  );

  // TODO(burdon): BUG: Includes item itself.
  const menuItems = useObjectMenuItems(subject);

  return (
    <Menu.Root>
      <Card.Root classNames={classNames}>
        <Card.Toolbar>
          <Card.Icon icon={icon} />
          <Card.Title>{Entity.getLabel(subject)}</Card.Title>
          <Menu.Trigger asChild disabled={!menuItems?.length}>
            <Toolbar.IconButton iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label={t('more-actions.label')} />
          </Menu.Trigger>
          <Menu.Content items={menuItems} />
        </Card.Toolbar>
        <Card.Content>
          <Surface.Surface role='card--content' data={data} limit={1} />
        </Card.Content>
      </Card.Root>
    </Menu.Root>
  );
};
