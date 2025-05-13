//
// Copyright 2025 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { type EchoSchema } from '@dxos/echo-schema';
import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { controlItemClasses, ControlPage, ControlSection } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';

import { SPACE_PLUGIN } from '../meta';

type SchemaPanelProps = { space: Space };

// TODO(ZaymonFC):
//   - Support deleting Schema. This should tie in to some sort of
//     'DangerZone™️' / 'Are you really sure?' / 'this might have consequences' component.

/**
 * Subscribe to and retrieve all schemas from a space's schema registry.
 */
export const useQuerySpaceSchemas = (space: Space): EchoSchema[] => {
  const [schemas, setSchemas] = useState<EchoSchema[]>([]);

  useEffect(() => {
    const query = space.db.schemaRegistry.query();
    const initialResults = query.runSync();
    setSchemas(initialResults);

    const unsubscribe = query.subscribe(() => setSchemas(query.results));
    return () => unsubscribe();
  }, [space]);

  return schemas;
};

export const SchemaContainer = ({ space }: SchemaPanelProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const schemas = useQuerySpaceSchemas(space);

  return (
    <StackItem.Content classNames='block overflow-y-auto'>
      <ControlPage>
        <ControlSection title={t('schema verbose label')} description={t('schema description')}>
          <div role='none' className={controlItemClasses}>
            {schemas.length === 0 && <div className='text-center plb-4'>{t('no schemas found message')}</div>}
            {schemas.map((schema) => (
              <div key={schema.id}>
                <div>{schema.typename}</div>
              </div>
            ))}
          </div>
        </ControlSection>
      </ControlPage>
    </StackItem.Content>
  );
};
