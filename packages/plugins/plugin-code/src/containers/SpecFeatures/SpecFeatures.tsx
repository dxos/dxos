//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type * as Spec from '@dxos/compute/Spec';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Status from '@dxos/react-ui/Status';

import { FeatureKanban } from '#components';

import { useFeatureEditing, useSpecFeatures, useZoomFeature } from '../../hooks/index.ts';
import { CodeNamespace } from '../../namespace.ts';
import { useFeatureSelection } from './spec-map-actions.ts';

export type SpecMapProps = {
  spec: Spec.Spec;
  attendableId?: string;
  /** Opens the spec breaking a feature down, which a feature without one gets first: a double-click on its card. */
  onZoom: (spec: Spec.Spec) => void;
};

/**
 * The `feat` blocks of `spec`'s text on a board by status. A click selects a feature and shows it in the plank's
 * feature companion.
 */
export const SpecMap = ({ spec, attendableId, onZoom }: SpecMapProps) => {
  const { t } = UiHooks.useTranslation(CodeNamespace.key);
  const { features, lookup } = useSpecFeatures(spec);
  const editing = useFeatureEditing(spec);
  const { selectedId, select } = useFeatureSelection(attendableId);

  const zoomFeature = useZoomFeature(spec, onZoom);
  const handleZoom = useCallback(
    (key: string | undefined) => {
      const feature = key ? lookup(key) : undefined;
      feature && void zoomFeature(feature);
    },
    [lookup, zoomFeature],
  );

  if (features.length === 0) {
    return <Status.Empty classNames='h-full'>{t('feature-map.empty.message')}</Status.Empty>;
  }

  return (
    <FeatureKanban
      features={features}
      selectedId={selectedId}
      onSelect={select}
      onZoom={handleZoom}
      onChange={editing.update}
    />
  );
};
