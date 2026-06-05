//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { type SpaceCapabilities } from '@dxos/plugin-space';
import { Column, useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';
import { GameCapabilities, type GameVariant } from '#types';

export type CreateGamePanelProps = SpaceCapabilities.CreateObjectCustomPanelProps & {
  /** Optional override (primarily for stories/tests). Defaults to GameCapabilities.Variant. */
  variants?: GameVariant[];
};

/**
 * Two-stage create panel for games:
 *   1. Variant picker (SearchList over contributed `GameVariant[]`).
 *   2. Variant-specific input form (rendered from variant.inputSchema).
 *
 * On submit, calls `onCreateObject({ variantId, name, input })` where `input` is the
 * variant-specific form values. Plugin-game's CreateObjectEntry.createObject resolves
 * the variantId, builds the variant state object via variant.createVariant, then wraps
 * it in a Game.
 */
export const CreateGamePanel = ({ target, onCreateObject, variants: variantsProp }: CreateGamePanelProps) => {
  const capabilityVariants = useCapabilities(GameCapabilities.Variant);
  const variants = variantsProp ?? capabilityVariants;
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const selected = useMemo(() => variants.find((v) => v.id === selectedId), [variants, selectedId]);

  const handleSelect = useCallback(
    (id: string) => {
      const variant = variants.find((v) => v.id === id);
      if (!variant) {
        return;
      }
      if (!variant.inputSchema) {
        void onCreateObject({ variantId: id });
        return;
      }
      setSelectedId(id);
    },
    [variants, onCreateObject],
  );

  const handleSubmit = useCallback(
    (input: Record<string, any>) => {
      if (!selected) {
        return;
      }
      void onCreateObject({ variantId: selected.id, input });
    },
    [selected, onCreateObject],
  );

  if (!selected) {
    return <VariantPicker variants={variants} onSelect={handleSelect} />;
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
      testId='create-game-form'
    >
      {/* Rendered inside the create dialog's Dialog.Body (which owns the gutter Column); use
          Column.Center to align with the dialog title rather than nesting another Column.Root. */}
      <Column.Center>
        <Form.Content>
          <Form.FieldSet />
          <Form.Submit />
        </Form.Content>
      </Column.Center>
    </Form.Root>
  );
};

type VariantPickerProps = {
  variants: GameVariant[];
  onSelect: (id: string) => void;
};

const VariantPicker = ({ variants, onSelect }: VariantPickerProps) => {
  const { t } = useTranslation(meta.id);
  const sorted = useMemo(() => [...variants].sort((a, b) => a.label.localeCompare(b.label)), [variants]);
  const { results, handleSearch } = useSearchListResults({
    items: sorted,
    extract: (variant) => variant.label,
  });

  return (
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
            onSelect={() => onSelect(variant.id)}
          />
        ))}
      </SearchList.Viewport>
    </SearchList.Root>
  );
};
