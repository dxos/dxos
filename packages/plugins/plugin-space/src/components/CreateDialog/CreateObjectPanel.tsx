//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Surface, isSurfaceAvailable, usePluginManager } from '@dxos/app-framework';
import { type TypedObject, getObjectAnnotation, S } from '@dxos/echo-schema';
import { type SpaceId, type Space, isSpace } from '@dxos/react-client/echo';
import { Icon, IconButton, Input, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Form, InputHeader, type InputProps } from '@dxos/react-ui-form';
import { SearchList } from '@dxos/react-ui-searchlist';
import { nonNullable, type MaybePromise } from '@dxos/util';

import { SPACE_PLUGIN } from '../../meta';
import { type CollectionType } from '../../types';
import { getSpaceDisplayName } from '../../util';

export type CreateObjectPanelProps = {
  schemas: TypedObject[];
  spaces: Space[];
  typename?: string;
  target?: Space | CollectionType;
  name?: string;
  defaultSpaceId?: SpaceId;
  resolve?: (typename: string) => Record<string, any>;
  onCreateObject?: (params: {
    schema: TypedObject;
    target: Space | CollectionType;
    data: Record<string, any>;
  }) => MaybePromise<void>;
};

// TODO(ZaymonFC): Move this if you find yourself needing it elsewhere.
/**
 * Creates a surface input component based on plugin context.
 * @param baseData Additional data that will be merged with form data and passed to the surface.
 * This allows providing more context to the surface than what's available from the form itself.
 */
const useInputSurfaceLookup = (baseData?: Record<string, any>) => {
  const pluginManager = usePluginManager();

  return useCallback(
    ({ prop, schema, inputProps }: { prop: string; schema: S.Schema<any>; inputProps: InputProps }) => {
      const composedData = { prop, schema, ...baseData };

      if (!isSurfaceAvailable(pluginManager.context, { role: 'form-input', data: composedData })) {
        return undefined;
      }

      return <Surface role='form-input' data={composedData} {...inputProps} />;
    },
    [pluginManager, baseData],
  );
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
  const options = schemas
    .map(getObjectAnnotation)
    .filter(nonNullable)
    .sort((a, b) => {
      const aName = t('typename label', { ns: a.typename, defaultValue: a.typename });
      const bName = t('typename label', { ns: b.typename, defaultValue: b.typename });
      return aName.localeCompare(bName);
    });

  const handleClearSchema = useCallback(() => setTypename(undefined), []);
  const handleClearTarget = useCallback(() => setTarget(undefined), []);

  const handleCreateObject = useCallback(
    async (props: Record<string, any>) => {
      if (!schema || !target) {
        return;
      }
      await onCreateObject?.({ schema, target, data: props });
    },
    [onCreateObject, schema, target],
  );

  const metadata = useMemo(() => {
    if (!typename) {
      return;
    }
    return resolve?.(typename);
  }, [resolve, typename]);

  // TODO(wittjosiah): All of these inputs should be rolled into a `Form` once it supports the necessary variants.
  const schemaInput = (
    <SearchList.Root label={t('schema input label')} classNames='flex flex-col grow overflow-hidden'>
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
    <SearchList.Root label={t('space input label')} classNames='flex flex-col grow overflow-hidden'>
      <SearchList.Input
        autoFocus
        data-testid='create-object-form.space-input'
        placeholder={t('space input placeholder')}
        classNames='px-1 my-2'
      />
      <SearchList.Content classNames='max-bs-[24rem] overflow-auto'>
        {spaces
          .sort((a, b) => {
            const aName = toLocalizedString(getSpaceDisplayName(a, { personal: a.id === defaultSpaceId }), t);
            const bName = toLocalizedString(getSpaceDisplayName(b, { personal: b.id === defaultSpaceId }), t);
            return aName.localeCompare(bName);
          })
          .map((space) => (
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

  const inputSurfaceLookup = useInputSurfaceLookup({ target });

  const form = useMemo(() => {
    // TODO(ZaymonFC): Move this default object creation schema somewhere?
    const schema = (metadata?.creationSchema ?? S.Struct({ name: S.optional(S.String) })) as S.Schema<any>;

    return (
      <Form
        autoFocus
        values={{ name: initialName }}
        schema={schema}
        testId='create-object-form'
        onSave={handleCreateObject}
        lookupComponent={inputSurfaceLookup}
      />
    );
  }, [initialName, handleCreateObject, metadata]);

  return (
    <div role='form' className='flex flex-col gap-2'>
      {target && (
        <div role='none'>
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
        <div role='none'>
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
