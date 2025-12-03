//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { type AnyProperties, type TypeAnnotation, getTypeAnnotation } from '@dxos/echo/internal';
import { type Space, type SpaceId } from '@dxos/react-client/echo';
import { Icon, toLocalizedString, useDefaultValue, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { SearchList } from '@dxos/react-ui-searchlist';
import { cardDialogOverflow, cardDialogPaddedOverflow, cardDialogSearchListRoot } from '@dxos/react-ui-stack';
import { type Collection, ViewAnnotation } from '@dxos/schema';
import { type MaybePromise, isNonNullable } from '@dxos/util';

import { useInputSurfaceLookup } from '../../hooks';
import { meta } from '../../meta';
import { type CreateObjectIntent } from '../../types';
import { getSpaceDisplayName } from '../../util';

export type Metadata = {
  createObjectIntent: CreateObjectIntent;
  inputSchema?: Schema.Schema.AnyNoContext;
  addToCollectionOnCreate?: boolean;
  icon?: string;
};

export type CreateObjectPanelProps = {
  schemas: Schema.Schema.AnyNoContext[];
  spaces: Space[];
  typename?: string;
  target?: Space | Collection.Collection;
  views?: boolean;
  initialFormValues?: Partial<AnyProperties>;
  defaultSpaceId?: SpaceId;
  resolve?: (typename: string) => Metadata | undefined;
  onTargetChange?: (target: Space) => void;
  onTypenameChange?: (typename: string) => void;
  onCreateObject?: (params: { metadata: Metadata; data?: Record<string, any> }) => MaybePromise<void>;
};

export const CreateObjectPanel = ({
  schemas,
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
  const metadata = typename && resolve?.(typename);
  const options: TypeAnnotation[] = schemas
    .filter((schema) => {
      if (views == null) {
        return true;
      } else {
        return views === ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false));
      }
    })
    .map((schema) => getTypeAnnotation(schema))
    .filter(isNonNullable)
    .sort((a, b) => {
      const nameA = t('typename label', { ns: a.typename, defaultValue: a.typename });
      const nameB = t('typename label', { ns: b.typename, defaultValue: b.typename });
      return nameA.localeCompare(nameB);
    });

  const handleCreateObject = useCallback(
    async (props: Record<string, any>) => {
      if (!metadata) {
        return;
      }
      await onCreateObject?.({ metadata, data: props });
    },
    [onCreateObject, metadata],
  );

  const handleSetTypename = useCallback(
    async (typename: string) => {
      const metadata = resolve?.(typename);
      if (metadata && !metadata.inputSchema) {
        await onCreateObject?.({ metadata });
      } else {
        onTypenameChange?.(typename);
      }
    },
    [resolve, onCreateObject],
  );

  const inputSurfaceLookup = useInputSurfaceLookup({ target });

  // TODO(wittjosiah): These inputs should be rolled into a `Form` once it supports the necessary variants.
  return !metadata ? (
    <SelectSchema options={options} resolve={resolve} onChange={handleSetTypename} />
  ) : !target ? (
    <SelectSpace spaces={spaces} defaultSpaceId={defaultSpaceId} onChange={onTargetChange} />
  ) : metadata.inputSchema ? (
    <Form.Root
      testId='create-object-form'
      autoFocus
      fieldProvider={inputSurfaceLookup}
      schema={metadata.inputSchema}
      values={initialFormValues}
      onSave={handleCreateObject}
    >
      <Form.Content>
        <Form.FieldSet />
        <Form.Submit />
      </Form.Content>
    </Form.Root>
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
              <Icon icon={resolve?.(option.typename)?.icon ?? 'ph--placeholder--regular'} size={5} />
              {t('typename label', { ns: option.typename, defaultValue: option.typename })}
            </span>
          </SearchList.Item>
        ))}
      </SearchList.Content>
    </SearchList.Root>
  );
};
