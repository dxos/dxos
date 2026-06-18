//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity, Obj, Type } from '@dxos/echo';
import { Card, Icon, IconButton, Input, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu } from '@dxos/react-ui-menu';
import { mx } from '@dxos/ui-theme';

import { useRelatedObjects } from '#hooks';
import { meta } from '#meta';

export const RecordArticle = ({ role, subject }: AppSurface.ObjectArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Obj.getType fails for database-registered (dynamic) schemas due to DXN mismatch;
  // fall back to typename query which matches TypeSchema.typename.
  const db = Obj.getDatabase(subject);
  const typename = Obj.getTypename(subject);
  const schema =
    Obj.getType(subject) ??
    (typename && db
      ? db.graph.registry
          .list()
          .filter(Type.isType)
          .find((t) => Type.getTypename(t) === typename)
      : undefined);
  const icon =
    schema && Type.getDatabase(schema) != null
      ? 'ph--cube--regular'
      : (Obj.getIcon(subject)?.icon ?? 'ph--circle-dashed--regular');

  const related = useRelatedObjects(db, subject, { references: true, relations: true });
  const singleColumn = related.length === 1;

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-4 space-y-4'>
            <Card.Root classNames='dx-card-max-width'>
              <Card.Header>
                <Card.Block>
                  <Icon icon={icon} />
                </Card.Block>
                <Card.Title>{Obj.getLabel(subject, { fallback: 'typename' })}</Card.Title>
              </Card.Header>
              <Card.Body>
                <Surface.Surface type={AppSurface.Card} data={{ subject }} limit={1} />
              </Card.Body>
            </Card.Root>

            {/* TODO(burdon): Only show label if surface exists? */}
            <div className='flex flex-col gap-form-gap'>
              <Input.Root>
                <Input.Label>{t('related-actions.label')}</Input.Label>
              </Input.Root>
              <Surface.Surface role='prompts' data={{ subject }} limit={1} />
            </div>

            {related.length > 0 && (
              <div
                className={mx('dx-expander flex flex-col gap-form-gap', singleColumn ? 'dx-card-max-width' : 'w-full')}
              >
                <Input.Root>
                  <Input.Label>{t('related-objects.label')}</Input.Label>
                </Input.Root>
                <Masonry.Root Tile={ObjectCard} columns={singleColumn ? 1 : undefined}>
                  <Masonry.Content>
                    <Masonry.Viewport items={related} />
                  </Masonry.Content>
                </Masonry.Root>
              </div>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

const ObjectCard = ({ data: subject, classNames }: { data: Entity.Unknown; classNames?: string }) => {
  const { t } = useTranslation(meta.profile.key);
  const data = useMemo(() => ({ subject }), [subject]);
  const icon = Entity.getIcon(subject)?.icon ?? 'ph--circle-dashed--regular';
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
          <Surface.Surface type={AppSurface.Card} data={data} limit={1} />
        </Card.Body>
      </Card.Root>
    </Menu.Root>
  );
};
