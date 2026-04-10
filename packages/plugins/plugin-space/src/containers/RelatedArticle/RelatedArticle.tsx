//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useObjectMenuItems, type AppSurface } from '@dxos/app-toolkit/ui';
import { Annotation, Entity, Obj } from '@dxos/echo';
import { Card, Panel, Toolbar } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu } from '@dxos/react-ui-menu';

import { useRelatedObjects } from '#hooks';

export type RelatedArticleProps = Pick<AppSurface.ObjectArticleProps<Obj.Unknown, {}, Obj.Unknown>, 'role' | 'companionTo'>;

export const RelatedArticle = ({ role, companionTo }: RelatedArticleProps) => {
  const db = Obj.getDatabase(companionTo);
  const related = useRelatedObjects(db, companionTo, { references: true, relations: true });
  const singleColumn = related.length === 1;

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content>
        {related.length > 0 && (
          <Masonry.Root Tile={ObjectCard} columns={singleColumn ? 1 : undefined}>
            <Masonry.Content items={related} />
          </Masonry.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

const ObjectCard = ({ data: subject, classNames }: { data: Entity.Unknown; classNames?: string }) => {
  const objectMenuItems = useObjectMenuItems(subject);
  const data = useMemo(() => ({ subject }), [subject]);
  const icon = Function.pipe(
    Obj.getSchema(subject),
    Option.fromNullable,
    Option.flatMap(Annotation.IconAnnotation.get),
    Option.map(({ icon }) => icon),
    Option.getOrElse(() => 'ph--placeholder--regular'),
  );

  return (
    <Menu.Root>
      <Card.Root classNames={classNames}>
        <Card.Toolbar>
          <Card.Icon icon={icon} />
          <Card.Title>{Entity.getLabel(subject)}</Card.Title>
          <Menu.Trigger asChild disabled={!objectMenuItems?.length}>
            <Toolbar.IconButton iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Actions' />
          </Menu.Trigger>
          <Menu.Content items={objectMenuItems} />
        </Card.Toolbar>
        <Card.Content>
          <Surface.Surface role='card--content' data={data} limit={1} />
        </Card.Content>
      </Card.Root>
    </Menu.Root>
  );
};
