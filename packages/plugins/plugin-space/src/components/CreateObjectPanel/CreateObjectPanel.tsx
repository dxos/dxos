//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type Collection, type Database, Obj } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { type SpaceId } from '@dxos/keys';
import { type Space } from '@dxos/react-client/echo';
import { Icon, toLocalizedString, useDefaultValue, useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';
import { Picker } from '@dxos/react-ui-list';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import { getStyles } from '@dxos/ui-theme';
import { type MaybePromise } from '@dxos/util';

import { useInputSurfaceLookup } from '#hooks';
import { meta } from '#meta';
import { type SpaceCapabilities } from '#types';

import { getSpaceDisplayName } from '../../util';

/** Display-ready option for the create object search list. */
export type CreateObjectOption = {
  id: string;
  label: string;
  icon?: string;
  iconHue?: string;
  plugin?: string;
};

export type Metadata = SpaceCapabilities.CreateObjectEntry;

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
      if (metadata && !metadata.inputSchema && !metadata.customPanel) {
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

  // TODO(wittjosiah): Extends and use react-ui-form to handle variants.

  if (!metadata) {
    return <SelectType options={sortedOptions} onChange={handleSelectOption} />;
  }

  if (!target) {
    return <SelectSpace spaces={spaces} defaultSpaceId={defaultSpaceId} onChange={onTargetChange} />;
  }

  if (metadata.customPanel) {
    const CustomPanel = metadata.customPanel;
    return (
      <CustomPanel
        target={target}
        initialFormValues={initialFormValues}
        onCreateObject={(data) => handleCreateObject(data)}
      />
    );
  }

  if (metadata.inputSchema) {
    return (
      <div className='[.dx-column-root_&]:col-span-full [.dx-column-root_&]:grid [.dx-column-root_&]:grid-cols-subgrid'>
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
      </div>
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
      <SearchList.Input
        classNames='mb-form-gap'
        autoFocus
        data-testid='create-object-form.schema-input'
        placeholder={t('schema-input.placeholder')}
      />
      <SearchList.Viewport>
        {results.map((option) => (
          <Picker.Item
            key={option.id}
            value={option.id}
            onSelect={() => onChange(option.id)}
            classNames='flex gap-3 items-center px-2 py-2 rounded-xs'
          >
            <Icon
              icon={option.icon ?? 'ph--circle-dashed--regular'}
              size={8}
              classNames={getIconHueStyles(option.iconHue)}
            />
            <div className='flex flex-col min-w-0 grow gap-0.5'>
              <span className='truncate'>{option.label}</span>
              {option.plugin && (
                <span className='truncate text-description text-xs'>
                  {t('plugin-subtitle.label', { plugin: option.plugin })}
                </span>
              )}
            </div>
          </Picker.Item>
        ))}
      </SearchList.Viewport>
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
      <SearchList.Input
        classNames='mb-form-gap'
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
    </SearchList.Root>
  );
};

const getIconHueStyles = (iconHue?: string): string | undefined => {
  const styles = iconHue ? getStyles(iconHue) : undefined;
  return styles?.foreground;
};
