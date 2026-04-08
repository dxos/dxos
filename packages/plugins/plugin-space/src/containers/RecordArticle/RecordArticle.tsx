//
// Copyright 2023 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit';
import { useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Annotation, Entity, Obj } from '@dxos/echo';
import { Card, Input, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu } from '@dxos/react-ui-menu';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { useRelatedObjects } from '#hooks';

export const RecordArticle = ({ role, subject }: AppSurface.ObjectProps) => {
  const { t } = useTranslation(meta.id);
  const db = Obj.getDatabase(subject);
  const related = useRelatedObjects(db, subject, { references: true, relations: true });
  const singleColumn = related.length === 1;

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-4 gap-4'>
            <ObjectCard data={subject} classNames='dx-card-max-width' />

            {/* TODO(burdon): Prompts and related should both be surfaces. */}
            <div role='none' className='flex flex-col gap-form-gap'>
              <Input.Root>
                <Input.Label>{t('related-actions.label')}</Input.Label>
              </Input.Root>

              <Surface.Surface role='prompts' data={{ subject }} limit={1} />
            </div>

            {related.length > 0 && (
              <div
                role='none'
                className={mx('dx-expander flex flex-col gap-form-gap', singleColumn ? 'dx-card-max-width' : 'w-full')}
              >
                <Input.Root>
                  <Input.Label>{t('related-objects.label')}</Input.Label>
                </Input.Root>
                <Masonry.Root Tile={ObjectCard} columns={singleColumn ? 1 : undefined}>
                  <Masonry.Content items={related} />
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
