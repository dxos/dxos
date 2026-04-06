//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { type Database, Obj } from '@dxos/echo';
import { type Collection } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { type Space, type SpaceId } from '@dxos/react-client/echo';
import { toLocalizedString, useDefaultValue, useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import { type MaybePromise } from '@dxos/util';

import { useInputSurfaceLookup } from '../../hooks';
import { meta } from '../../meta';
import { type CreateObject } from '#types';
import { getSpaceDisplayName } from '../../util';

/** Display-ready option for the create object search list. */
export type CreateObjectOption = {
  id: string;
  label: string;
  icon?: string;
};

export type Metadata = {
  createObject: CreateObject;
  inputSchema?: Schema.Schema.AnyNoContext;
  icon?: string;
};

export type CreateObjectPanelProps = {
  options: CreateObjectOption[];
  spaces: Space[];
  typename?: string;
  target?: Database.Database | Collection.Collection;
  initialFormValues?: Partial<AnyProperties>;
  defaultSpaceId?: SpaceId;
  resolve?: (typename: string) => Metadata | undefined;
  onTargetChange?: (target: Database.Database) => void;
  onTypenameChange?: (typename: string) => void;
  onCreateObject?: (params: { metadata: Metadata; data?: Record<string, any> }) => MaybePromise<void>;
};

export const CreateObjectPanel = ({
  options,
  spaces,
  typename,
  target,
  initialFormValues: initialFormValuesProp,
  defaultSpaceId,
  resolve,
  onTargetChange,
  onTypenameChange,
  onCreateObject,
}: CreateObjectPanelProps) => {
  const initialFormValues = useDefaultValue(initialFormValuesProp, () => ({}));
  const metadata = typename && resolve?.(typename);

  const sortedOptions = useMemo(() => [...options].sort((a, b) => a.label.localeCompare(b.label)), [options]);

  const handleCreateObject = useCallback(
    async (props: Record<string, any>) => {
      if (!metadata) {
        return;
      }
      await onCreateObject?.({ metadata, data: props });
    },
    [onCreateObject, metadata],
  );

  const handleSelectOption = useCallback(
    async (id: string) => {
      const metadata = resolve?.(id);
      if (metadata && !metadata.inputSchema) {
        await onCreateObject?.({ metadata });
      } else {
        onTypenameChange?.(id);
      }
    },
    [resolve, onCreateObject],
  );

  const inputSchema = useMemo(
    () => (metadata && typeof metadata === 'object' && metadata.inputSchema ? omitId(metadata.inputSchema) : undefined),
    [metadata],
  );
  const inputSurfaceLookup = useInputSurfaceLookup({ target });

  // TODO(wittjosiah): These inputs should be rolled into a `Form` once it supports the necessary variants.
  if (!metadata) {
    return <SelectType options={sortedOptions} onChange={handleSelectOption} />;
  }

  // TODO(burdon): Remove.
  if (!target) {
    return <SelectSpace spaces={spaces} defaultSpaceId={defaultSpaceId} onChange={onTargetChange} />;
  }

  if (metadata.inputSchema) {
    return (
      <Form.Root
        autoFocus
        schema={inputSchema}
        defaultValues={initialFormValues}
        fieldProvider={inputSurfaceLookup}
        db={Obj.isObject(target) ? Obj.getDatabase(target) : target}
        onSave={handleCreateObject}
        testId='create-object-form'
      >
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
            <Form.Submit />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    );
  }

  return null;
};

CreateObjectPanel.displayName = 'CreateObjectPanel';

type SelectTypeProps = Pick<CreateObjectPanelProps, 'options'> & {
  onChange: (id: string) => void;
};

const SelectType = ({ options, onChange }: SelectTypeProps) => {
  const { t } = useTranslation(meta.id);

  const { results, handleSearch } = useSearchListResults({
    items: options,
    extract: (option) => option.label,
  });

  return (
    <SearchList.Root onSearch={handleSearch}>
      <SearchList.Content classNames='gap-form-gap'>
        <SearchList.Input
          autoFocus
          data-testid='create-object-form.schema-input'
          placeholder={t('schema-input.placeholder')}
        />
        <SearchList.Viewport>
          {results.map((option) => (
            <SearchList.Item
              key={option.id}
              value={option.id}
              label={option.label}
              icon={option.icon ?? 'ph--placeholder--regular'}
              onSelect={() => onChange(option.id)}
            />
          ))}
        </SearchList.Viewport>
      </SearchList.Content>
    </SearchList.Root>
  );
};

type SelectSpaceProps = Pick<CreateObjectPanelProps, 'spaces' | 'defaultSpaceId'> & {
  onChange?: (db: Database.Database) => void;
};

const SelectSpace = ({ spaces, defaultSpaceId, onChange }: SelectSpaceProps) => {
  const { t } = useTranslation(meta.id);

  const sortedSpaces = useMemo(
    () =>
      [...spaces].sort((a, b) => {
        const labelA = toLocalizedString(
          getSpaceDisplayName(a, {
            personal: a.id === defaultSpaceId,
          }),
          t,
        );
        const labelB = toLocalizedString(
          getSpaceDisplayName(b, {
            personal: b.id === defaultSpaceId,
          }),
          t,
        );
        return labelA.localeCompare(labelB);
      }),
    [spaces, defaultSpaceId, t],
  );

  const { results, handleSearch } = useSearchListResults({
    items: sortedSpaces,
    extract: (space) =>
      toLocalizedString(
        getSpaceDisplayName(space, {
          personal: space.id === defaultSpaceId,
        }),
        t,
      ),
  });

  return (
    <SearchList.Root onSearch={handleSearch}>
      <SearchList.Content>
        <SearchList.Input
          autoFocus
          data-testid='create-object-form.space-input'
          placeholder={t('space-input.placeholder')}
        />
        <SearchList.Viewport>
          {results.map((space) => {
            return (
              <SearchList.Item
                key={space.id}
                value={space.id}
                label={toLocalizedString(getSpaceDisplayName(space, { personal: space.id === defaultSpaceId }), t)}
                onSelect={() => onChange?.(space.db)}
              />
            );
          })}
        </SearchList.Viewport>
      </SearchList.Content>
    </SearchList.Root>
  );
};
