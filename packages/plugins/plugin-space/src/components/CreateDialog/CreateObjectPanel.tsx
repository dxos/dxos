//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type MetadataResolver } from '@dxos/app-framework';
import { type AbstractTypedObject, getObjectAnnotation, S } from '@dxos/echo-schema';
import { type SpaceId, type Space, isSpace } from '@dxos/react-client/echo';
import { Icon, IconButton, Input, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Form, InputHeader } from '@dxos/react-ui-form';
import { SearchList } from '@dxos/react-ui-searchlist';
import { nonNullable, type MaybePromise } from '@dxos/util';

import { SPACE_PLUGIN } from '../../meta';
import { type CollectionType } from '../../types';
import { getSpaceDisplayName } from '../../util';

export type CreateObjectPanelProps = {
  schemas: AbstractTypedObject[];
  spaces: Space[];
  typename?: string;
  target?: Space | CollectionType;
  name?: string;
  defaultSpaceId?: SpaceId;
  resolve?: MetadataResolver;
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
  defaultSpaceId,
  resolve,
  onCreateObject,
}: CreateObjectPanelProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const [typename, setTypename] = useState<string | undefined>(initialTypename);
  const [target, setTarget] = useState<Space | CollectionType | undefined>(initialTarget);
  const schema = schemas.find((schema) => getObjectAnnotation(schema)?.typename === typename);
  const options = schemas.map(getObjectAnnotation).filter(nonNullable);

  const handleClearSchema = useCallback(() => setTypename(undefined), []);
  const handleClearTarget = useCallback(() => setTarget(undefined), []);

  const handleCreateObject = useCallback(
    async ({ name }: { name?: string }) => {
      if (!schema || !target) {
        return;
      }

      await onCreateObject?.({ schema, target, name });
    },
    [onCreateObject, schema, target],
  );

  // TODO(wittjosiah): All of these inputs should be rolled into a `Form` once it supports the necessary variants.
  const schemaInput = (
    <SearchList.Root label={t('schema input label')} classNames='flex flex-col grow overflow-hidden my-2 px-2'>
      <SearchList.Input
        autoFocus
        data-testid='create-object-form.schema-input'
        placeholder={t('schema input placeholder')}
        classNames='px-1 my-2'
      />
      <SearchList.Content classNames='max-bs-[24rem] overflow-auto'>
        {options.map((option) => (
          <SearchList.Item
            key={option.typename}
            value={t('typename label', { ns: option.typename, defaultValue: option.typename })}
            onSelect={() => setTypename(option.typename)}
            classNames='flex items-center gap-2'
          >
            <span className='flex gap-2 items-center grow truncate'>
              <Icon icon={resolve?.(option.typename).icon ?? 'ph--placeholder--regular'} size={5} />
              {t('typename label', { ns: option.typename, defaultValue: option.typename })}
            </span>
          </SearchList.Item>
        ))}
      </SearchList.Content>
    </SearchList.Root>
  );

  const spaceInput = (
    <SearchList.Root label={t('space input label')} classNames='flex flex-col grow overflow-hidden my-2 px-2'>
      <SearchList.Input
        autoFocus
        data-testid='create-object-form.space-input'
        placeholder={t('space input placeholder')}
        classNames='px-1 my-2'
      />
      <SearchList.Content classNames='max-bs-[24rem] overflow-auto'>
        {spaces.map((space) => (
          <SearchList.Item
            key={space.id}
            value={toLocalizedString(getSpaceDisplayName(space, { personal: space.id === defaultSpaceId }), t)}
            onSelect={() => setTarget(space)}
            classNames='flex items-center gap-2'
          >
            <span className='grow truncate'>
              {toLocalizedString(getSpaceDisplayName(space, { personal: space.id === defaultSpaceId }), t)}
            </span>
          </SearchList.Item>
        ))}
      </SearchList.Content>
    </SearchList.Root>
  );

  const form = (
    <Form
      autoFocus
      values={{ name: initialName }}
      schema={S.Struct({ name: S.optional(S.String) })}
      testId='create-object-form'
      onSave={handleCreateObject}
    />
  );

  return (
    <div role='form' className='flex flex-col gap-2'>
      {target && (
        <div role='none' className='px-2'>
          <Input.Root>
            <InputHeader>
              <Input.Label>
                {t(isSpace(target) ? 'creating in space label' : 'creating in collection label')}
              </Input.Label>
            </InputHeader>
            <div role='none' className='flex gap-2'>
              <Input.TextInput
                disabled
                value={
                  isSpace(target)
                    ? toLocalizedString(getSpaceDisplayName(target, { personal: target.id === defaultSpaceId }), t)
                    : target.name || t('unnamed collection label')
                }
              />
              <IconButton iconOnly icon='ph--x--regular' label={t('clear input label')} onClick={handleClearTarget} />
            </div>
          </Input.Root>
        </div>
      )}
      {schema && (
        <div role='none' className='px-2'>
          <Input.Root>
            <InputHeader>
              <Input.Label>{t('creating object type label')}</Input.Label>
            </InputHeader>
            <div role='none' className='flex gap-2'>
              <Input.TextInput
                disabled
                value={t('typename label', { ns: schema.typename, defaultValue: schema.typename })}
              />
              <IconButton iconOnly icon='ph--x--regular' label={t('clear input label')} onClick={handleClearSchema} />
            </div>
          </Input.Root>
        </div>
      )}
      {!schema ? schemaInput : !target ? spaceInput : form}
    </div>
  );
};
