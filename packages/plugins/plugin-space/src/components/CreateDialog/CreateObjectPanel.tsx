//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type AbstractTypedObject, getObjectAnnotation } from '@dxos/echo-schema';
import { type SpaceId, type Space } from '@dxos/react-client/echo';
import { IconButton, Input, Select, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormInput } from '@dxos/react-ui-form';
import { nonNullable, type MaybePromise } from '@dxos/util';

import { SPACE_PLUGIN } from '../../meta';
import { getSpaceDisplayName } from '../../util';

export type CreateObjectPanel = {
  schemas: AbstractTypedObject[];
  spaces: Space[];
  typename?: string;
  spaceId?: SpaceId;
  name?: string;
  namesCache?: Record<string, string>;
  defaultSpaceId?: SpaceId;
  onCreateObject?: (params: { schema: AbstractTypedObject; space: Space; name?: string }) => MaybePromise<void>;
};

// TODO(wittjosiah): This should use form based on schema ideally, but some fields would need to be able to be annotated for omition.
// TODO(wittjosiah): This panel should be extensible with Surface.
// TODO(wittjosiah): This panel should be re-used in the c11y sidebar object settings.
export const CreateObjectPanel = ({
  schemas,
  spaces,
  typename: initialTypename,
  spaceId: initialSpaceId,
  name: initialName,
  namesCache,
  defaultSpaceId,
  onCreateObject,
}: CreateObjectPanel) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const [typename, setTypename] = useState<string | undefined>(initialTypename);
  const [spaceId, setSpaceId] = useState<SpaceId | undefined>(initialSpaceId);
  const [name, setName] = useState<string | undefined>(initialName);
  const schema = schemas.find((schema) => getObjectAnnotation(schema)?.typename === typename);
  const options = schemas.map(getObjectAnnotation).filter(nonNullable);
  const space = spaces.find((space) => space.id === spaceId);

  // TODO(wittjosiah): Allow space selector and schema selector to be optional if pre-selected.
  //  If creating in a space or collection, hide the space selector.
  //  If creating from top level direct create actions, hide the schema selector.
  //  Considering doing selects as search lists which when submitted build up the chosen options.
  const handleCreateObject = useCallback(async () => {
    if (!schema || !space) {
      return;
    }

    await onCreateObject?.({ schema, space, name });
  }, [onCreateObject, schema, space, name]);

  return (
    <div role='form' className='flex flex-col'>
      <DeprecatedFormInput label={t('typename label')}>
        <Select.Root value={typename} onValueChange={setTypename}>
          <Select.TriggerButton placeholder={t('typename placeholder')} />
          <Select.Portal>
            <Select.Content>
              <Select.ScrollUpButton />
              <Select.Viewport>
                {options.map((option) => (
                  <Select.Option key={option.typename} value={option.typename}>
                    {option.typename}
                  </Select.Option>
                ))}
              </Select.Viewport>
              <Select.ScrollDownButton />
              <Select.Arrow />
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </DeprecatedFormInput>
      <DeprecatedFormInput label={t('space label')}>
        <Select.Root value={spaceId} onValueChange={setSpaceId as any}>
          <Select.TriggerButton placeholder={t('space placeholder')} />
          <Select.Portal>
            <Select.Content>
              <Select.ScrollUpButton />
              <Select.Viewport>
                {spaces.map((space) => (
                  <Select.Option key={space.id} value={space.id}>
                    {toLocalizedString(
                      getSpaceDisplayName(space, { namesCache, personal: space.id === defaultSpaceId }),
                      t,
                    )}
                  </Select.Option>
                ))}
              </Select.Viewport>
              <Select.ScrollDownButton />
              <Select.Arrow />
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </DeprecatedFormInput>
      <DeprecatedFormInput label={t('name label')}>
        <Input.TextInput
          placeholder={t('unnamed object label')}
          value={name ?? ''}
          onChange={(event) => setName(event.target.value)}
        />
      </DeprecatedFormInput>

      <div className='flex p-2 justify-center'>
        <IconButton
          icon='ph--plus--regular'
          label={t('create object label')}
          onClick={handleCreateObject}
          disabled={!space || !schema}
        />
      </div>
    </div>
  );
};
