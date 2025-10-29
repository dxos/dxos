//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { Filter, type Obj, Ref, Relation } from '@dxos/echo';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '../meta';

export type RecordMainProps = {
  record: Obj.Any;
};

export const RecordMain = ({ record }: RecordMainProps) => {
  const { t } = useTranslation(meta.id);
  const space = getSpace(record);
  const data = useMemo(() => ({ subject: record }), [record]);

  // TODO(wittjosiah): This is a hack. ECHO needs to have a back reference index to easily query for related objects.
  const objects = useQuery(space, Filter.everything());
  const related = useMemo(() => {
    const getReferencesFromObject = (obj: Obj.Any): Ref.Any[] => {
      return Object.getOwnPropertyNames(obj)
        .map((name) => obj[name as keyof Obj.Any])
        .filter((value) => Ref.isRef(value)) as Ref.Any[];
    };

    const relations = objects.filter((obj) => Relation.isRelation(obj));
    const targetObjects = relations
      .filter((relation) => Relation.getTarget(relation) === record)
      .map((relation) => Relation.getSource(relation));
    const sourceObjects = relations
      .filter((relation) => Relation.getSource(relation) === record)
      .map((relation) => Relation.getTarget(relation));

    const references = getReferencesFromObject(record);
    const referencedObjects = references.map((ref) => ref.target).filter(isNonNullable);
    const referencingObjects = objects.filter((obj) => {
      const refs = getReferencesFromObject(obj);
      return refs.some((ref) => ref.target === record);
    });

    // TODO(burdon): Create sections (or section indicators)?
    return [...referencedObjects, ...referencingObjects, ...targetObjects, ...sourceObjects];
  }, [record, objects]);

  return (
    <StackItem.Content classNames='flex flex-col items-center'>
      <div role='none' className={mx('flex flex-col gap-4 p-6 is-full overflow-y-auto')}>
        <div role='none' className={mx('flex flex-col gap-1 card-min-width card-max-width')}>
          <Surface role='section' data={data} limit={1} />
        </div>

        {/* TODO(wittjosiah): This should maybe be in a separate stack item. */}
        {related.length > 0 && (
          <div role='none' className={mx('flex flex-col gap-1', related.length === 1 ? 'card-max-width' : 'is-full')}>
            <label className='text-description text-sm mbs-2'>{t('related objects label')}</label>
            <Masonry.Root<Obj.Any>
              items={related}
              render={Card}
              intrinsicHeight
              columnCount={related.length === 1 ? 1 : undefined}
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

export default RecordMain;
