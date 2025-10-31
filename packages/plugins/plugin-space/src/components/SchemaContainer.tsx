//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { ControlPage, ControlSection, controlItemClasses } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';

import { meta } from '../meta';

type SchemaPanelProps = { space: Space };

export const SchemaContainer = ({ space }: SchemaPanelProps) => {
  const { t } = useTranslation(meta.id);
  const schemas = useQuerySpaceSchemas(space);

  // TODO(ZaymonFC): Support deleting Schema (DangerZone section).
  return (
    <StackItem.Content scrollable>
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

/**
 * Subscribe to and retrieve all schemas from a space's schema registry.
 */
export const useQuerySpaceSchemas = (space: Space): Type.Schema[] => {
  const [schemas, setSchemas] = useState<Type.Schema[]>([]);

  useEffect(() => {
    const query = space.db.schemaRegistry.query();
    const initialResults = query.runSync();
    setSchemas(initialResults);

    const unsubscribe = query.subscribe(() => setSchemas(query.results));
    return () => unsubscribe();
  }, [space]);

  return schemas;
};
