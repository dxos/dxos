//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';
import { IllustratorCapabilities } from '#types';

export type CreateDrawingPanelProps = SpaceCapabilities.CreateObjectCustomPanelProps & {
  /** Optional override (primarily for stories/tests). Defaults to IllustratorCapabilities.VariantProvider. */
  variants?: IllustratorCapabilities.DrawingVariant[];
};

const VariantSelection = Schema.Struct({ variantId: Schema.String });

type VariantSelection = Schema.Schema.Type<typeof VariantSelection>;

/**
 * Variant picker for drawings (SearchList over contributed `IllustratorCapabilities.DrawingVariant[]`).
 * Picking a variant selects it (the first is selected initially); Save calls `onCreateObject({ variantId })`,
 * which plugin-illustrator's CreateObjectEntry.createObject resolves to build the canvas via
 * variant.createCanvas, then wraps it in a Drawing.
 */
export const CreateDrawingPanel = ({ onCreateObject, onCancel, variants: variantsProp }: CreateDrawingPanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const capabilityVariants = Hooks.useCapabilities(IllustratorCapabilities.VariantProvider);
  const variants = variantsProp ?? capabilityVariants;
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

  // Returned so the form's `saving` guard keeps Save disabled until creation settles.
  const handleSave = useCallback(
    async ({ variantId }: VariantSelection) => onCreateObject({ variantId }),
    [onCreateObject],
  );

  return (
    <Form.Root schema={VariantSelection} values={values} onSave={handleSave} onCancel={onCancel}>
      <Form.Content>
        <SearchList.Root onSearch={handleSearch}>
          <SearchList.Input
            classNames='mb-form-gap'
            autoFocus
            data-testid='create-drawing-panel.variant-input'
            placeholder={t('create-panel.variant.placeholder')}
          />
          <SearchList.Viewport>
            {results.map((variant) => (
              <SearchList.Item
                key={variant.id}
                value={variant.id}
                label={variant.label}
                icon={variant.icon ?? 'ph--compass-tool--regular'}
                checked={variant.id === variantId}
                onSelect={() => setSelectedId(variant.id)}
              />
            ))}
          </SearchList.Viewport>
        </SearchList.Root>
        <Form.Actions />
      </Form.Content>
    </Form.Root>
  );
};
