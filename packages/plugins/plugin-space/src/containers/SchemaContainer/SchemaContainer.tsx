//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

export const SchemaContainer = ({ space }: AppSurface.SpaceArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const types = useQuerySpaceTypes(space);

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('schema-verbose.label')} description={t('schema.description')}>
            <div
              className={mx([
                'grid md:col-span-2 grid-cols-subgrid gap-trim-sm items-center',
                '*:first:mt-0! *:last:mb-0! px-trim-md py-trim-md',
                'border border-separator rounded-md',
              ])}
            >
              {types.length === 0 && <div className='text-center py-4'>{t('no-schemas-found.message')}</div>}
              {types.map((type) => (
                <div key={type.id}>{Type.getTypename(type)}</div>
              ))}
            </div>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

/**
 * Subscribe to and retrieve all types from a space's registry.
 */
export const useQuerySpaceTypes = (space: Space): Type.AnyEntity[] => {
  const [types, setTypes] = useState<Type.AnyEntity[]>(() => [...space.db.graph.registry.list().filter(Type.isType)]);

  useEffect(() => {
    setTypes([...space.db.graph.registry.list().filter(Type.isType)]);
    return space.db.graph.registry.changed.on(() => {
      setTypes([...space.db.graph.registry.list().filter(Type.isType)]);
    });
  }, [space]);

  return types;
};
