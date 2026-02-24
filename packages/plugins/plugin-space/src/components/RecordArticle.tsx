//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Database, Entity, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Layout, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Card as MosaicCard } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '../meta';

export const RecordArticle = ({ role, subject }: SurfaceComponentProps) => {
  const { t } = useTranslation(meta.id);
  const db = Obj.getDatabase(subject);
  const data = useMemo(() => ({ subject }), [subject]);
  const related = useRelatedObjects(db, subject, {
    references: true,
    relations: true,
  });
  const singleColumn = related.length === 1;

  return (
    <Layout.Main role={role}>
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport classNames={mx('p-4 gap-4')}>
          <div role='none' className={mx('flex w-full card-max-width')}>
            <Surface.Surface role='section' data={data} limit={1} />
          </div>

          {related.length > 0 && (
            <div role='none' className={mx('flex flex-col gap-1', singleColumn ? 'card-max-width' : 'w-full')}>
              <label className='mt-2 text-sm text-description'>{t('related objects label')}</label>
              <Masonry.Root<Entity.Unknown>
                items={related}
                render={Card}
                columnCount={singleColumn ? 1 : undefined}
                intrinsicHeight
              />
            </div>
          )}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Layout.Main>
  );
};

const Card = ({ data: subject }: { data: Entity.Unknown }) => {
  const data = useMemo(() => ({ subject }), [subject]);
  return (
    <MosaicCard.Root>
      <MosaicCard.Toolbar>
        <span />
        <MosaicCard.Title>{Entity.getLabel(subject)}</MosaicCard.Title>
      </MosaicCard.Toolbar>
      <Surface.Surface role='card--content' data={data} limit={1} />
    </MosaicCard.Root>
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

    return related;
  }, [record, objects]);
};

export default RecordArticle;
