//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type AbstractTypedObject, getObjectAnnotation } from '@dxos/echo-schema';
import { type SpaceId, type Space, isSpace } from '@dxos/react-client/echo';
import { IconButton, Input, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormInput } from '@dxos/react-ui-form';
import { SearchList } from '@dxos/react-ui-searchlist';
import { nonNullable, type MaybePromise } from '@dxos/util';

import { SPACE_PLUGIN } from '../../meta';
import { CollectionType } from '../../types';
import { getSpaceDisplayName } from '../../util';

export type CreateObjectPanelProps = {
  schemas: AbstractTypedObject[];
  spaces: Space[];
  typename?: string;
  target?: Space | CollectionType;
  name?: string;
  namesCache?: Record<string, string>;
  defaultSpaceId?: SpaceId;
  onCreateObject?: (params: {
    schema: AbstractTypedObject;
    target: Space | CollectionType;
    name?: string;
  }) => MaybePromise<void>;
};

export const CreateObjectPanel = ({
  schemas,
  spaces,
  typename: initialTypename,
  target: initialTarget,
  name: initialName,
  namesCache,
  defaultSpaceId,
  onCreateObject,
}: CreateObjectPanelProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const [typename, setTypename] = useState<string | undefined>(initialTypename);
  const [target, setTarget] = useState<Space | CollectionType | undefined>(initialTarget);
  const [name, setName] = useState<string | undefined>(initialName);
  const schema = schemas.find((schema) => getObjectAnnotation(schema)?.typename === typename);
  const options = schemas.map(getObjectAnnotation).filter(nonNullable);

  const handleCreateObject = useCallback(async () => {
    if (!schema || !target) {
      return;
    }

    await onCreateObject?.({ schema, target, name });
  }, [onCreateObject, schema, target, name]);

  const schemaInput = (
    <SearchList.Root label={t('schema input label')} classNames='flex flex-col grow overflow-hidden my-2'>
      <SearchList.Input autoFocus placeholder={t('schema input placeholder')} classNames='px-1 my-2' />
      <SearchList.Content classNames='max-bs-[24rem] overflow-auto'>
        {options.map((option) => (
          <SearchList.Item
            key={option.typename}
            value={option.typename}
            onSelect={() => setTypename(option.typename)}
            classNames='flex items-center gap-2'
          >
            <span className='grow truncate'>{option.typename}</span>
          </SearchList.Item>
        ))}
      </SearchList.Content>
    </SearchList.Root>
  );

  const spaceInput = (
    <SearchList.Root label={t('space input label')} classNames='flex flex-col grow overflow-hidden my-2'>
      <SearchList.Input autoFocus placeholder={t('space input placeholder')} classNames='px-1 my-2' />
      <SearchList.Content classNames='max-bs-[24rem] overflow-auto'>
        {spaces.map((space) => (
          <SearchList.Item
            key={space.id}
            value={space.id}
            onSelect={() => setTarget(space)}
            classNames='flex items-center gap-2'
          >
            <span className='grow truncate'>
              {toLocalizedString(getSpaceDisplayName(space, { namesCache, personal: space.id === defaultSpaceId }), t)}
            </span>
          </SearchList.Item>
        ))}
      </SearchList.Content>
    </SearchList.Root>
  );

  // TODO(wittjosiah): This should use form based on schema ideally, but some fields would need to be able to be annotated for omition.
  const nameInput = (
    <>
      <DeprecatedFormInput label={t('name label')}>
        <Input.TextInput
          autoFocus
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
          disabled={!target || !schema}
        />
      </div>
    </>
  );

  return (
    <div role='form' className='flex flex-col'>
      {schema && <div>Type: {schema.typename}</div>}
      {isSpace(target) && (
        <div>
          Target:
          {toLocalizedString(getSpaceDisplayName(target, { namesCache, personal: target.id === defaultSpaceId }), t)}
        </div>
      )}
      {target instanceof CollectionType && <div>Target: {target.name}</div>}
      {!schema ? schemaInput : !target ? spaceInput : nameInput}
    </div>
  );
};
