//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';
import { mx } from '@dxos/ui-theme';

import { meta } from '../meta';

type SchemaPanelProps = { space: Space };

const itemClasses = mx([
  'container-max-width grid md:col-span-2 grid-cols-subgrid gap-trim-sm items-center',
  '*:first:!mt-0 *:last:!mb-0 px-trim-md py-trim-md',
  'border border-separator rounded-md',
]);

export const SchemaContainer = ({ space }: SchemaPanelProps) => {
  const { t } = useTranslation(meta.id);
  const schemas = useQuerySpaceSchemas(space);

  return (
    <Settings.Root>
      <Settings.Section title={t('schema verbose label')} description={t('schema description')}>
        <div role='none' className={itemClasses}>
          {schemas.length === 0 && <div className='text-center py-4'>{t('no schemas found message')}</div>}
          {schemas.map((schema) => (
            <div role='none' key={schema.id}>
              {schema.typename}
            </div>
          ))}
        </div>
      </Settings.Section>
    </Settings.Root>
  );
};

/**
 * Subscribe to and retrieve all schemas from a space's schema registry.
 */
export const useQuerySpaceSchemas = (space: Space): Type.RuntimeType[] => {
  const [schemas, setSchemas] = useState<Type.RuntimeType[]>([]);

  useEffect(() => {
    const query = space.db.schemaRegistry.query();
    const initialResults = query.runSync();
    setSchemas(initialResults);

    const unsubscribe = query.subscribe(() => setSchemas(query.results));
    return () => unsubscribe();
  }, [space]);

  return schemas;
};
