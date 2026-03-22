//
// Copyright 2023 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Annotation, type Database, Entity, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu } from '@dxos/react-ui-menu';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';

export const RecordArticle = ({ role, subject }: SurfaceComponentProps) => {
  const { t } = useTranslation(meta.id);
  const db = Obj.getDatabase(subject);
  const related = useRelatedObjects(db, subject, {
    references: true,
    relations: true,
  });
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

            <div role='none' className='flex flex-col gap-2'>
              <label className='mt-2 text-sm text-description'>{t('related actions label')}</label>
              <Surface.Surface role='magic' data={{ subject }} limit={1} />
            </div>

            {related.length > 0 && (
              <Masonry.Root Tile={ObjectCard} columnCount={singleColumn ? 1 : undefined}>
                <label className='mt-2 shrink-0 text-sm text-description'>{t('related objects label')}</label>
                <Masonry.Content items={related} />
              </Masonry.Root>
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

// TODO(wittjosiah): This is a hack. ECHO needs to have a back reference index to easily query for related objects.
const useRelatedObjects = (
  db?: Database.Database,
  record?: Obj.Unknown,
  options: { references?: boolean; relations?: boolean } = {},
) => {
  const objects = useQuery(db, Filter.everything());
  return useMemo(() => {
    if (!record) {
      return [];
    }

    const related: Entity.Unknown[] = [];

    // TODO(burdon): Change Person => Organization to relations.
    if (options.references) {
      const getReferences = (obj: Entity.Unknown): Ref.Unknown[] => {
        return Object.getOwnPropertyNames(obj)
          .map((name) => obj[name as keyof Obj.Unknown])
          .filter((value) => Ref.isRef(value)) as Ref.Unknown[];
      };

      const references = getReferences(record);
      const referenceTargets = references.map((ref) => ref.target).filter(isNonNullable);
      const referenceSources = objects.filter((obj) => {
        const refs = getReferences(obj);
        return refs.some((ref) => ref.target === record);
      });

      related.push(...referenceTargets, ...referenceSources);
    }

    if (options.relations) {
      // TODO(dmaretskyi): Workaround until https://github.com/dxos/dxos/pull/10100 lands.
      const isValidRelation = (obj: Relation.Unknown) => {
        try {
          return Relation.isRelation(obj) && Relation.getSource(obj) && Relation.getTarget(obj);
        } catch {
          return false;
        }
      };

      const relations = objects.filter(Relation.isRelation).filter((obj) => isValidRelation(obj));
      const targetObjects = relations
        .filter((relation) => Relation.getTarget(relation) === record)
        .map((relation) => Relation.getSource(relation));
      const sourceObjects = relations
        .filter((relation) => Relation.getSource(relation) === record)
        .map((relation) => Relation.getTarget(relation));

      related.push(...targetObjects, ...sourceObjects);
    }

    return (
      Array.from(new Set(related))
        // TODO(burdon): Hack to filter out chat objects.
        .filter((obj) => Entity.getTypename(obj) !== 'org.dxos.type.assistant.chat')
    );
  }, [record, objects]);
};
