//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Filter, type Obj, Ref, Relation } from '@dxos/echo';
import { type Space, getSpace, useQuery } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '../meta';

export const RecordArticle = ({ object }: SurfaceComponentProps) => {
  const { t } = useTranslation(meta.id);
  const space = getSpace(object);
  const data = useMemo(() => ({ subject: object }), [object]);
  const related = useRelatedObjects(space, object, {
    references: true,
    relations: true,
  });
  const singleColumn = related.length === 1;

  return (
    <StackItem.Content>
      <div role='none' className={mx('flex flex-col gap-4 p-4 is-full overflow-y-auto')}>
        <div role='none' className={mx('flex card-min-width card-max-width')}>
          <Surface role='section' data={data} limit={1} />
        </div>

        {related.length > 0 && (
          <div role='none' className={mx('flex flex-col gap-1', singleColumn ? 'card-max-width' : 'is-full')}>
            <label className='mbs-2 text-sm text-description'>{t('related objects label')}</label>
            <Masonry.Root<Obj.Any>
              items={related}
              render={Card}
              columnCount={singleColumn ? 1 : undefined}
              intrinsicHeight
            />
          </div>
        )}
      </div>
    </StackItem.Content>
  );
};

const Card = ({ data: subject }: { data: Obj.Any }) => {
  const data = useMemo(() => ({ subject }), [subject]);
  return <Surface role='card' data={data} limit={1} />;
};

// TODO(wittjosiah): This is a hack. ECHO needs to have a back reference index to easily query for related objects.
const useRelatedObjects = (
  space?: Space,
  record?: Obj.Any,
  options: { references?: boolean; relations?: boolean } = {},
) => {
  const objects = useQuery(space, Filter.everything());
  return useMemo(() => {
    if (!record) {
      return [];
    }

    const related: Obj.Any[] = [];

    // TODO(burdon): Change Person => Organization to relations.
    // TODO(burdon): Filter relation types.
    if (options.references) {
      const getReferences = (obj: Obj.Any): Ref.Any[] => {
        return Object.getOwnPropertyNames(obj)
          .map((name) => obj[name as keyof Obj.Any])
          .filter((value) => Ref.isRef(value)) as Ref.Any[];
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
      const isValidRelation = (obj: Obj.Any) => {
        try {
          return Relation.isRelation(obj) && Relation.getSource(obj) && Relation.getTarget(obj);
        } catch {
          return false;
        }
      };

      const relations = objects.filter((obj) => Relation.isRelation(obj)).filter((obj) => isValidRelation(obj));
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
