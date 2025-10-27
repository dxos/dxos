//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { Filter, type Obj, Ref } from '@dxos/echo';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { StackItem } from '@dxos/react-ui-stack';
import { isNonNullable } from '@dxos/util';

import { meta } from '../meta';

const getReferencesFromObject = (obj: Obj.Any): Ref.Any[] => {
  return Object.getOwnPropertyNames(obj)
    .map((name) => obj[name as keyof Obj.Any])
    .filter((value) => Ref.isRef(value)) as Ref.Any[];
};

const Card = ({ data: subject }: { data: Obj.Any }) => {
  const data = useMemo(() => ({ subject }), [subject]);
  return <Surface role='card' data={data} limit={1} />;
};

export const RecordMain = ({ record }: { record: Obj.Any }) => {
  const { t } = useTranslation(meta.id);
  const space = getSpace(record);
  const data = useMemo(() => ({ subject: record }), [record]);

  // TODO(wittjosiah): This is a hack. ECHO needs to have a back reference index to easily query for related objects.
  const objects = useQuery(space, Filter.everything());
  const related = useMemo(() => {
    // TODO(wittjosiah): Support links via relations as well.
    // const relations = objects.filter((obj) => Relation.isRelation(obj));
    // const targetObjects = relations
    //   .filter((relation) => Relation.getSource(relation) === record)
    //   .map((relation) => Relation.getTarget(relation));
    // const sourceObjects = relations
    //   .filter((relation) => Relation.getTarget(relation) === record)
    //   .map((relation) => Relation.getSource(relation));

    const references = getReferencesFromObject(record);
    const referencedObjects = references.map((ref) => ref.target).filter(isNonNullable);
    const referencingObjects = objects.filter((obj) => {
      const refs = getReferencesFromObject(obj);
      return refs.some((ref) => ref.target === record);
    });

    return [...referencedObjects, ...referencingObjects];
  }, [record, objects]);

  return (
    <StackItem.Content classNames='container-max-width' scrollable>
      <div role='none' className='flex flex-col gap-4 p-2'>
        <Surface role='section' data={data} limit={1} />
        {/* TODO(wittjosiah): This should maybe be in a separate stack item. */}
        {related.length > 0 && (
          <div className='flex flex-col gap-1 p-2'>
            <label className='text-description text-sm'>{t('related objects label')}</label>
            <Masonry.Root<Obj.Any> items={related} render={Card} intrinsicHeight />
          </div>
        )}
      </div>
    </StackItem.Content>
  );
};

export default RecordMain;
