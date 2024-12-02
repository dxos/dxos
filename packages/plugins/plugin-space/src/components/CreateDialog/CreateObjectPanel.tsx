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

import { TypeSelector } from './TypeSelector';
import { SPACE_PLUGIN } from '../../meta';
import { CollectionType } from '../../types';
import { getSpaceDisplayName } from '../../util';

export type CreateObjectPanelProps = {
  schemas: AbstractTypedObject[];
  spaces: Space[];
  typename?: string;
  target?: Space | CollectionType;
  name?: string;
  // TODO(burdon): ???
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
  // TODO(burdon): Need icons from meta/registry.
  const types = schemas.map(getObjectAnnotation).filter(nonNullable);

  const handleCreateObject = useCallback(async () => {
    if (!schema || !target) {
      return;
    }

    await onCreateObject?.({ schema, target, name });
  }, [onCreateObject, schema, target, name]);

  const getContent = (schema: AbstractTypedObject | undefined, target: Space | CollectionType | undefined) => {
    // Select collection.
    if (!schema) {
      return (
        <SearchList.Root label={t('schema input label')} classNames='flex flex-col grow overflow-hidden'>
          <SearchList.Input autoFocus placeholder={t('schema input placeholder')} classNames='px-1 my-2' />
          <SearchList.Content>
            <TypeSelector types={types} onSelect={setTypename} />
          </SearchList.Content>
        </SearchList.Root>
      );
    }

    // Show spaces.
    if (!target) {
      <SearchList.Root label={t('space input label')} classNames='flex flex-col grow overflow-hidden'>
        <SearchList.Input autoFocus placeholder={t('space input placeholder')} classNames='px-1 my-2' />
        <SearchList.Content>
          {spaces.map((space) => (
            <SearchList.Item
              key={space.id}
              value={space.id}
              onSelect={() => setTarget(space)}
              classNames='flex items-center gap-2'
            >
              <span className='grow truncate'>
                {toLocalizedString(
                  getSpaceDisplayName(space, { namesCache, personal: space.id === defaultSpaceId }),
                  t,
                )}
              </span>
            </SearchList.Item>
          ))}
        </SearchList.Content>
      </SearchList.Root>;
    }

    // Select spaces.
    return (
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
  };

  const content = getContent(schema, target);

  return (
    <div role='form' className='flex flex-col'>
      {schema && <h2>{schema.typename}</h2>}
      {isSpace(target) && (
        <h2>
          {toLocalizedString(getSpaceDisplayName(target, { namesCache, personal: target.id === defaultSpaceId }), t)}
        </h2>
      )}
      {target instanceof CollectionType && <h2>{target.name}</h2>}
      {content}
    </div>
  );
};
