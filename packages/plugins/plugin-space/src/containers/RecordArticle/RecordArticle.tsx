//
// Copyright 2023 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Annotation, Obj, Type } from '@dxos/echo';
import { Card, Input, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export const RecordArticle = ({ role, subject }: AppSurface.ObjectArticleProps) => {
  const { t } = useTranslation(meta.id);
  // Obj.getType fails for database-registered (dynamic) schemas due to DXN mismatch;
  // fall back to typename query which matches TypeSchema.typename.
  const db = Obj.getDatabase(subject);
  const typename = Obj.getTypename(subject);
  const schema =
    Obj.getType(subject) ?? (typename && db ? db.graph.registry.types.find((t) => Type.getTypename(t) === typename) : undefined);
  const icon =
    schema && Type.getDatabase(schema) != null
      ? 'ph--cube--regular'
      : Function.pipe(
          Option.fromNullable(schema),
          Option.map(Type.getSchema),
          Option.flatMap(Annotation.IconAnnotation.get),
          Option.map(({ icon }) => icon),
          Option.getOrElse(() => 'ph--circle-dashed--regular'),
        );

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
                <Card.Icon icon={icon} />
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
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
