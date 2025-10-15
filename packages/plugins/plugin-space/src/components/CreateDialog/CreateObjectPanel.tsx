//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback } from 'react';

import { Type } from '@dxos/echo';
import { type BaseObject, type TypeAnnotation, ViewAnnotation, getTypeAnnotation } from '@dxos/echo/internal';
import { type Space, type SpaceId } from '@dxos/react-client/echo';
import { Icon, toLocalizedString, useDefaultValue, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { SearchList } from '@dxos/react-ui-searchlist';
import { cardDialogOverflow, cardDialogPaddedOverflow, cardDialogSearchListRoot } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';
import { type MaybePromise, isNonNullable } from '@dxos/util';

import { useInputSurfaceLookup } from '../../hooks';
import { meta } from '../../meta';
import { type ObjectForm } from '../../types';
import { getSpaceDisplayName } from '../../util';

export type CreateObjectPanelProps = {
  forms: ObjectForm[];
  spaces: Space[];
  typename?: string;
  target?: Space | DataType.Collection;
  views?: boolean;
  initialFormValues?: Partial<BaseObject>;
  defaultSpaceId?: SpaceId;
  resolve?: (typename: string) => Record<string, any>;
  onTargetChange?: (target: Space) => void;
  onTypenameChange?: (typename: string) => void;
  onCreateObject?: (params: { form: ObjectForm; data?: Record<string, any> }) => MaybePromise<void>;
};

export const CreateObjectPanel = ({
  forms,
  spaces,
  typename,
  target,
  views,
  initialFormValues: _initialFormValues,
  defaultSpaceId,
  resolve,
  onTargetChange,
  onTypenameChange,
  onCreateObject,
}: CreateObjectPanelProps) => {
  const { t } = useTranslation(meta.id);
  const initialFormValues = useDefaultValue(_initialFormValues, () => ({}));
  const form = forms.find((form) => Type.getTypename(form.objectSchema) === typename);
  const options: TypeAnnotation[] = forms
    .filter((form) => {
      if (views == null) {
        return true;
      } else {
        return views === ViewAnnotation.get(form.objectSchema).pipe(Option.getOrElse(() => false));
      }
    })
    .map((form) => getTypeAnnotation(form.objectSchema))
    .filter(isNonNullable)
    .sort((a, b) => {
      const nameA = t('typename label', { ns: a.typename, defaultValue: a.typename });
      const nameB = t('typename label', { ns: b.typename, defaultValue: b.typename });
      return nameA.localeCompare(nameB);
    });

  const handleCreateObject = useCallback(
    async (props: Record<string, any>) => {
      if (!form) {
        return;
      }
      await onCreateObject?.({ form, data: props });
    },
    [onCreateObject, form],
  );

  const handleSetTypename = useCallback(
    async (typename: string) => {
      const form = forms.find((form) => getTypeAnnotation(form.objectSchema)?.typename === typename);
      if (form && !form.formSchema) {
        await onCreateObject?.({ form });
      } else {
        onTypenameChange?.(typename);
      }
    },
    [forms, onCreateObject],
  );

  const inputSurfaceLookup = useInputSurfaceLookup({ target });

  // TODO(wittjosiah): These inputs should be rolled into a `Form` once it supports the necessary variants.
  return !form ? (
    <SelectSchema options={options} resolve={resolve} onChange={handleSetTypename} />
  ) : !target ? (
    <SelectSpace spaces={spaces} defaultSpaceId={defaultSpaceId} onChange={onTargetChange} />
  ) : form.formSchema ? (
    <div role='none' className={cardDialogOverflow}>
      <Form
        autoFocus
        values={initialFormValues}
        schema={form.formSchema}
        testId='create-object-form'
        onSave={handleCreateObject}
        lookupComponent={inputSurfaceLookup}
        outerSpacing='blockStart-0'
      />
    </div>
  ) : null;
};

const SelectSpace = ({
  spaces,
  defaultSpaceId,
  onChange,
}: { onChange?: (space: Space) => void } & Pick<CreateObjectPanelProps, 'spaces' | 'defaultSpaceId'>) => {
  const { t } = useTranslation(meta.id);

  return (
    <SearchList.Root label={t('space input label')} classNames={cardDialogSearchListRoot}>
      <SearchList.Input
        autoFocus
        data-testid='create-object-form.space-input'
        placeholder={t('space input placeholder')}
      />
      <SearchList.Content classNames={[cardDialogOverflow, 'plb-cardSpacingBlock']}>
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
              onSelect={() => onChange?.(space)}
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
  options: TypeAnnotation[];
  onChange: (type: string) => void;
} & Pick<CreateObjectPanelProps, 'resolve'>) => {
  const { t } = useTranslation(meta.id);

  return (
    <SearchList.Root label={t('schema input label')} classNames={cardDialogSearchListRoot}>
      <SearchList.Input
        autoFocus
        data-testid='create-object-form.schema-input'
        placeholder={t('schema input placeholder')}
      />
      <SearchList.Content classNames={cardDialogPaddedOverflow}>
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
