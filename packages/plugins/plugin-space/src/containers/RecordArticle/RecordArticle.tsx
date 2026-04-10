//
// Copyright 2023 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Annotation, Obj } from '@dxos/echo';
import { Card, Input, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export const RecordArticle = ({ role, subject }: AppSurface.ObjectArticleProps) => {
  const { t } = useTranslation(meta.id);
  const icon = Function.pipe(
    Obj.getSchema(subject),
    Option.fromNullable,
    Option.flatMap(Annotation.IconAnnotation.get),
    Option.map(({ icon }) => icon),
    Option.getOrElse(() => 'ph--placeholder--regular'),
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-4 gap-4'>
            <Card.Root classNames='dx-card-max-width'>
              <Card.Toolbar>
                <Card.Icon icon={icon} />
                <Card.Title>{Obj.getLabel(subject)}</Card.Title>
              </Card.Toolbar>
              <Card.Content>
                <Surface.Surface role='card--content' data={{ subject }} limit={1} />
              </Card.Content>
            </Card.Root>

            {/* TODO(burdon): Prompts and related should both be surfaces. */}
            <div role='none' className='flex flex-col gap-form-gap'>
              <Input.Root>
                <Input.Label>{t('related-actions.label')}</Input.Label>
              </Input.Root>

              <Surface.Surface role='prompts' data={{ subject }} limit={1} />
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
