//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type SpaceCapabilities } from '@dxos/plugin-space';
import { useTranslation } from '@dxos/react-ui';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';
import { type DrawingVariant, IllustratorCapabilities } from '#types';

export type CreateDrawingPanelProps = SpaceCapabilities.CreateObjectCustomPanelProps & {
  /** Optional override (primarily for stories/tests). Defaults to IllustratorCapabilities.VariantProvider. */
  variants?: DrawingVariant[];
};

/**
 * Variant picker for drawings (SearchList over contributed `DrawingVariant[]`).
 * On select, calls `onCreateObject({ variantId })`; plugin-illustrator's
 * CreateObjectEntry.createObject resolves the variantId, builds the canvas via
 * variant.createCanvas, then wraps it in a Drawing.
 */
export const CreateDrawingPanel = ({ onCreateObject, variants: variantsProp }: CreateDrawingPanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const capabilityVariants = useCapabilities(IllustratorCapabilities.VariantProvider);
  const variants = variantsProp ?? capabilityVariants;
  const sorted = useMemo(() => [...variants].sort((a, b) => a.label.localeCompare(b.label)), [variants]);
  const { results, handleSearch } = useSearchListResults({
    items: sorted,
    extract: (variant) => variant.label,
  });

  const handleSelect = useCallback(
    (id: string) => {
      const variant = variants.find((entry) => entry.id === id);
      if (!variant) {
        return;
      }
      void onCreateObject({ variantId: id });
    },
    [variants, onCreateObject],
  );

  return (
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
            onSelect={() => handleSelect(variant.id)}
          />
        ))}
      </SearchList.Viewport>
    </SearchList.Root>
  );
};
