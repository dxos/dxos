//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Surface, isSurfaceAvailable, usePluginManager } from '@dxos/app-framework';
import { getObjectAnnotation, type ObjectAnnotation, type S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type SpaceId, type Space } from '@dxos/react-client/echo';
import { Icon, type ThemedClassName, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Form, type InputProps } from '@dxos/react-ui-form';
import { SearchList } from '@dxos/react-ui-searchlist';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable, type MaybePromise } from '@dxos/util';

import { SPACE_PLUGIN } from '../../meta';
import { type ObjectForm, type CollectionType } from '../../types';
import { getSpaceDisplayName } from '../../util';

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

export type CreateObjectPanelProps = ThemedClassName<{
  forms: ObjectForm[];
  spaces: Space[];
  typename?: string;
  target?: Space | CollectionType;
  name?: string;
  defaultSpaceId?: SpaceId;
  resolve?: (typename: string) => Record<string, any>;
  onCreateObject?: (params: {
    form: ObjectForm;
    target: Space | CollectionType;
    data?: Record<string, any>;
  }) => MaybePromise<void>;
}>;

export const CreateObjectPanel = ({
  classNames,
  forms,
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
  const form = forms.find((form) => getObjectAnnotation(form.objectSchema)?.typename === typename);
  const options: ObjectAnnotation[] = forms
    .map((form) => getObjectAnnotation(form.objectSchema))
    .filter(isNonNullable)
    .sort((a, b) => {
      const nameA = t('typename label', { ns: a.typename, defaultValue: a.typename });
      const nameB = t('typename label', { ns: b.typename, defaultValue: b.typename });
      return nameA.localeCompare(nameB);
    });

  const handleCreateObject = useCallback(
    async (props: Record<string, any>) => {
      if (!form || !target) {
        return;
      }
      await onCreateObject?.({ form, target, data: props });
    },
    [onCreateObject, form, target],
  );

  const handleSetTypename = useCallback(
    async (typename: string) => {
      invariant(target, 'target is required');
      const form = forms.find((form) => getObjectAnnotation(form.objectSchema)?.typename === typename);
      if (form && !form.formSchema) {
        await onCreateObject?.({ form, target });
      } else {
        setTypename(typename);
      }
    },
    [forms, onCreateObject, target],
  );

  const inputSurfaceLookup = useInputSurfaceLookup({ target });

  // TODO(wittjosiah): These inputs should be rolled into a `Form` once it supports the necessary variants.
  return (
    <div role='form' className={mx('flex flex-col gap-2', classNames)}>
      {!form ? (
        <SelectSchema options={options} resolve={resolve} onChange={handleSetTypename} />
      ) : !target ? (
        <SelectSpace spaces={spaces} defaultSpaceId={defaultSpaceId} onChange={setTarget} />
      ) : form.formSchema ? (
        <Form
          classNames='!p-0'
          autoFocus
          values={{ name: initialName }}
          schema={form.formSchema}
          testId='create-object-form'
          onSave={handleCreateObject}
          lookupComponent={inputSurfaceLookup}
        />
      ) : undefined}
    </div>
  );
};

const SelectSpace = ({
  spaces,
  defaultSpaceId,
  onChange,
}: { onChange: (space: Space) => void } & Pick<CreateObjectPanelProps, 'spaces' | 'defaultSpaceId'>) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
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
              onSelect={() => onChange(space)}
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
};

const SelectSchema = ({
  options,
  resolve,
  onChange,
}: {
  options: ObjectAnnotation[];
  onChange: (type: string) => void;
} & Pick<CreateObjectPanelProps, 'resolve'>) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
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
            onSelect={() => onChange(option.typename)}
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
};
