//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { type Collection, type Database, Obj, type Type } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { type Space } from '@dxos/react-client/echo';
import { Icon, toLocalizedString, useDefaultValue, useTranslation } from '@dxos/react-ui';
import { Form, ObjectForm, omitId } from '@dxos/react-ui-form';
import { Picker } from '@dxos/react-ui-list';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import { getStyles } from '@dxos/ui-theme';
import { type MaybePromise } from '@dxos/util';

import { useInputSurfaceLookup } from '#hooks';
import { meta } from '#meta';
import { SpaceCapabilities } from '#types';

import { getSpaceDisplayName } from '../../util';

/** Display-ready option for the create object search list. */
export type CreateObjectOption = {
  id: string;
  label: string;
  icon?: string;
  iconHue?: string;
  /** Plugin name shown as "{{plugin}} Plugin" subtitle. */
  plugin?: string;
  /** Generic subtitle shown when plugin is not set. */
  description?: string;
};

export type Metadata = SpaceCapabilities.CreateObjectEntry;

export type CreateObjectPanelProps = {
  options: CreateObjectOption[];
  spaces: Space[];
  typename?: string;
  target?: Database.Database | Collection.Collection;
  /** Whether the object is built from the form's values on submit (`draft`) or already exists (`live`). */
  mode?: 'draft' | 'live';
  initialFormValues?: Partial<AnyProperties>;
  /**
   * Form schema, overriding the create entry's `inputSchema` (draft) or the object's own schema
   * (live). Typically a projection of the type, e.g. `Type.getSchema(T).pipe(Schema.pick(...))`.
   */
  schema?: Schema.Codec<any, any>;
  /**
   * The live object being edited, once the dialog has added it to the database. Its presence is what
   * switches the panel from building a draft on submit to writing through to a real object.
   */
  object?: Obj.Unknown;
  /** The live object's type; required alongside `object`. */
  type?: Type.AnyEntity;
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
  mode = 'draft',
  initialFormValues: initialFormValuesProp,
  schema,
  object,
  type,
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
      // A live create always has a form to show — the object's own — so only a draft can skip
      // straight to creating from an entry that declares no inputs.
      if (mode !== 'live' && metadata && !metadata.inputSchema && !metadata.customPanel && !schema) {
        await onCreateObject?.({ metadata });
      } else {
        onTypenameChange?.(id);
      }
    },
    [mode, schema, resolve, onCreateObject, onTypenameChange],
  );

  const inputSchema = useMemo(() => {
    const base = schema ?? (metadata && typeof metadata === 'object' ? metadata.inputSchema : undefined);
    return base ? omitId(base) : undefined;
  }, [schema, metadata]);
  const inputSurfaceLookup = useInputSurfaceLookup({ target });

  // TODO(wittjosiah): Extends and use react-ui-form to handle variants.

  // The live object edits in place, so the type is settled and the submit lives in the dialog's
  // action bar rather than in the form.
  if (object && type) {
    return <ObjectForm object={object} type={type} schema={schema} showTags={false} />;
  }

  // The type picker belongs to the case where no type has been chosen. Gating it on the entry
  // instead would also catch a dialog opened *for* a type whose plugin is still activating, and
  // flash the full list of every creatable type into a dialog already titled after one of them.
  if (!typename) {
    return <SelectType options={sortedOptions} onChange={handleSelectOption} />;
  }

  // A live create is driven by the type entity rather than a registered create entry, so only a
  // draft waits on one; until it resolves there is nothing correct to draw.
  if (mode !== 'live' && !metadata) {
    return null;
  }

  if (!target) {
    return <SelectSpace spaces={spaces} onChange={onTargetChange} />;
  }

  // Live: both pickers are answered and the dialog is adding the object; it arrives next render.
  if (!metadata) {
    return null;
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

  if (inputSchema) {
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
  const { t } = useTranslation(meta.profile.key);

  const { results, handleSearch } = useSearchListResults({
    items: options,
    // Match the type label as well as the contributing plugin name / description so a plugin
    // name (e.g. "Blogger") surfaces the types it contributes.
    extract: (option) => [option.label, option.plugin, option.description].filter(Boolean).join(' '),
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
            // Keyed by typename, since the label is localized and, for database types, user-authored.
            data-testid={`create-object-form.type.${option.id}`}
          >
            <Icon
              icon={option.icon ?? 'ph--circle-dashed--regular'}
              size={8}
              classNames={getIconHueStyles(option.iconHue)}
            />
            <div className='flex flex-col min-w-0 grow gap-0.5'>
              <span className='truncate'>{option.label}</span>
              {(option.plugin || option.description) && (
                <span className='truncate text-description text-xs'>
                  {option.plugin ? t('plugin-subtitle.label', { plugin: option.plugin }) : option.description}
                </span>
              )}
            </div>
          </Picker.Item>
        ))}
      </SearchList.Viewport>
    </SearchList.Root>
  );
};

type SelectSpaceProps = Pick<CreateObjectPanelProps, 'spaces'> & {
  onChange?: (db: Database.Database) => void;
};

const SelectSpace = ({ spaces, onChange }: SelectSpaceProps) => {
  const { t } = useTranslation(meta.profile.key);

  const sortedSpaces = useMemo(
    () =>
      [...spaces].sort((a, b) => {
        const labelA = toLocalizedString(getSpaceDisplayName(a), t);
        const labelB = toLocalizedString(getSpaceDisplayName(b), t);
        return labelA.localeCompare(labelB);
      }),
    [spaces, t],
  );

  const { results, handleSearch } = useSearchListResults({
    items: sortedSpaces,
    extract: (space) => toLocalizedString(getSpaceDisplayName(space), t),
  });

  // TODO(burdon): Change to Masonry.
  return (
    <SearchList.Root onSearch={handleSearch}>
      <SearchList.Input
        classNames='mb-form-gap'
        autoFocus
        data-testid='create-object-form.space-input'
        placeholder={t('space-input.placeholder')}
      />
      <SearchList.Viewport>
        {results.map((space) => (
          <SearchList.Item
            key={space.id}
            value={space.id}
            label={toLocalizedString(getSpaceDisplayName(space), t)}
            onSelect={() => onChange?.(space.db)}
          />
        ))}
      </SearchList.Viewport>
    </SearchList.Root>
  );
};

const getIconHueStyles = (iconHue?: string): string | undefined => {
  const styles = iconHue ? getStyles(iconHue) : undefined;
  return styles?.text;
};
