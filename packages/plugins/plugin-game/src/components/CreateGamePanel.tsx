//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/Hooks';
import { Obj } from '@dxos/echo';
import type * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { Column, useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';
import { GameCapabilities } from '#types';

export type CreateGamePanelProps = SpaceCapabilities.CreateObjectCustomPanelProps & {
  /** Optional override (primarily for stories/tests). Defaults to GameCapabilities.VariantProvider. */
  variants?: GameCapabilities.GameVariant[];
};

const VariantSelection = Schema.Struct({ variantId: Schema.String });

type VariantSelection = Schema.Schema.Type<typeof VariantSelection>;

/**
 * Two-stage create panel for games:
 *   1. Variant picker (SearchList over contributed `GameCapabilities.GameVariant[]`); picking selects,
 *      Continue (or Save, for a variant with no inputs) advances and Cancel abandons the create.
 *   2. Variant-specific input form (rendered from variant.inputSchema); Cancel returns to the picker.
 *
 * On submit, calls `onCreateObject({ variantId, name, input })` where `input` is the
 * variant-specific form values. Plugin-game's CreateObjectEntry.createObject resolves
 * the variantId, builds the variant state object via variant.createVariant, then wraps
 * it in a Game.
 */
export const CreateGamePanel = ({ target, onCreateObject, onCancel, variants: variantsProp }: CreateGamePanelProps) => {
  const capabilityVariants = useCapabilities(GameCapabilities.VariantProvider);
  const variants = variantsProp ?? capabilityVariants;
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const selected = useMemo(() => variants.find((v) => v.id === selectedId), [variants, selectedId]);

  const handleSelect = useCallback(
    async ({ variantId }: VariantSelection) => {
      const variant = variants.find((v) => v.id === variantId);
      if (!variant) {
        return;
      }
      if (!variant.inputSchema) {
        await onCreateObject({ variantId });
        return;
      }
      setSelectedId(variantId);
    },
    [variants, onCreateObject],
  );

  const handleSubmit = useCallback(
    async (input: Record<string, any>) => {
      if (!selected) {
        return;
      }
      await onCreateObject({ variantId: selected.id, input });
    },
    [selected, onCreateObject],
  );

  const handleBack = useCallback(() => setSelectedId(undefined), []);

  if (!selected) {
    return <VariantPicker variants={variants} onSave={handleSelect} onCancel={onCancel} />;
  }

  const schema = selected.inputSchema ? omitId(selected.inputSchema) : undefined;
  if (!schema) {
    return null;
  }

  return (
    <Form.Root
      autoFocus
      schema={schema}
      defaultValues={{}}
      db={Obj.isObject(target) ? Obj.getDatabase(target) : target}
      onSave={handleSubmit}
      onCancel={handleBack}
      testId='create-game-form'
    >
      {/* Rendered inside the create dialog's Dialog.Body (which owns the gutter Column); use
          Column.Center to align with the dialog title rather than nesting another Column.Root. */}
      <Column.Center>
        <Form.Content>
          <Form.Fields />
          <Form.Actions />
        </Form.Content>
      </Column.Center>
    </Form.Root>
  );
};

type VariantPickerProps = {
  variants: GameCapabilities.GameVariant[];
  onSave: (selection: VariantSelection) => Promise<void>;
  onCancel?: () => void;
};

const VariantPicker = ({ variants, onSave, onCancel }: VariantPickerProps) => {
  const { t } = useTranslation(meta.profile.key);
  const sorted = useMemo(() => [...variants].sort((a, b) => a.label.localeCompare(b.label)), [variants]);
  const { results, handleSearch } = useSearchListResults({
    items: sorted,
    extract: (variant) => variant.label,
  });
  const [selectedId, setSelectedId] = useState<string>();
  // Preselected so Save is ready without a pick; kept among the visible results so a filter never
  // leaves Save acting on a row it hid.
  const variantId = results.some(({ id }) => id === selectedId) ? selectedId : results[0]?.id;
  const values = useMemo(() => ({ variantId }), [variantId]);
  const hasInputs = sorted.find(({ id }) => id === variantId)?.inputSchema !== undefined;

  return (
    <Form.Root schema={VariantSelection} values={values} onSave={onSave} onCancel={onCancel}>
      <Column.Center>
        <Form.Content>
          <SearchList.Root onSearch={handleSearch}>
            <SearchList.Input
              classNames='mb-form-gap'
              autoFocus
              data-testid='create-game-panel.variant-input'
              placeholder={t('create-panel.variant.placeholder')}
            />
            <SearchList.Viewport>
              {results.map((variant) => (
                <SearchList.Item
                  key={variant.id}
                  value={variant.id}
                  label={variant.label}
                  icon={variant.icon ?? 'ph--sword--regular'}
                  checked={variant.id === variantId}
                  onSelect={() => setSelectedId(variant.id)}
                />
              ))}
            </SearchList.Viewport>
          </SearchList.Root>
          <Form.Actions
            submitLabel={hasInputs ? t('create-panel.continue.label') : undefined}
            submitIcon={hasInputs ? 'ph--arrow-right--regular' : undefined}
          />
        </Form.Content>
      </Column.Center>
    </Form.Root>
  );
};
