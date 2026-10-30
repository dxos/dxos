//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Spec from '@dxos/compute/Spec';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';

import { Feature } from '#types';

import { useFeatureEditing } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import { useLevelIds } from '../SpecFeatures/spec-map-actions.ts';

export type AddFeatureDialogProps = {
  /** The map the feature moves onto, unless `parentId` names the feature to break down instead. */
  spec: Spec.Spec;
  parentId?: string;
  /** Not offered besides the map's own features: the features above it. */
  exclude?: readonly string[];
};

/** Picks a feature from elsewhere in the space and moves it onto a spec's map. */
export const AddFeatureDialog = ({ spec, parentId, exclude }: AddFeatureDialogProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = Obj.getDatabase(spec);
  const editing = useFeatureEditing(db, spec);
  const ids = useLevelIds(parentId ? undefined : spec);
  const features = useQuery(db, Filter.type(Feature.Feature));
  const candidates = useMemo(() => {
    const excluded = new Set([...ids, ...(exclude ?? []), ...(parentId ? [parentId] : [])]);
    return features
      .filter((feature) => !excluded.has(feature.id))
      .sort((left, right) => label(left).localeCompare(label(right)));
  }, [features, ids, exclude, parentId]);
  const { results, handleSearch } = useSearchListResults({ items: candidates, extract: label });

  const handleSelect = useCallback(
    (feature: Feature.Feature) => {
      editing.moveFeature(feature.id, parentId);
      void invokePromise(LayoutOperation.UpdateDialog, { state: false });
    },
    [editing, parentId, invokePromise],
  );

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('add-feature-dialog.title')}</Dialog.Title>
        <Dialog.CloseTrigger asChild>
          <SystemButton.Close />
        </Dialog.CloseTrigger>
      </Dialog.Header>
      <Dialog.Body>
        <SearchList.Root onSearch={handleSearch}>
          <SearchList.Input
            autoFocus
            data-testid='add-feature-dialog.input'
            placeholder={t('add-feature-dialog.placeholder')}
          />
          <SearchList.Viewport padding={false}>
            {results.map((feature) => (
              <SearchList.Item
                key={feature.id}
                value={feature.id}
                label={label(feature)}
                icon='ph--puzzle-piece--regular'
                onSelect={() => handleSelect(feature)}
              />
            ))}
          </SearchList.Viewport>
          {candidates.length === 0 && (
            <p className='p-form-padding text-fg-muted' data-testid='add-feature-dialog.empty'>
              {t('add-feature-dialog.empty.message')}
            </p>
          )}
        </SearchList.Root>
      </Dialog.Body>
    </Dialog.Content>
  );
};

AddFeatureDialog.displayName = 'AddFeatureDialog';

const label = (feature: Feature.Feature): string => feature.name;
