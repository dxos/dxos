//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { EID, Filter, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { FeatureBoard } from '#components';
import { meta } from '#meta';
import { Feature, type FeatureMap, FeatureMapView } from '#types';

// Not in the components barrel: the canvas engine is large, and the barrel is also loaded by capabilities at boot.
import { FeatureCanvas } from '../../components/FeatureCanvas/index.ts';
import { ObjectAddPicker } from '../../components/ObjectAddPicker/index.ts';
import { useFeatureEditing, useFeatureGraph, useOpenObject } from '../../hooks/index.ts';

export type FeatureMapArticleProps = AppSurface.ObjectArticleProps<FeatureMap.FeatureMap>;

const MODES: { mode: FeatureMapView.Mode; icon: string }[] = [
  { mode: 'cards', icon: 'ph--cards--regular' },
  { mode: 'canvas', icon: 'ph--graph--regular' },
];

/** Article surface for a {@link FeatureMap.FeatureMap}: its features as cards (the default) or on a canvas. */
export const FeatureMapArticle = ({ role, subject, attendableId }: FeatureMapArticleProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { mode } = useViewState(FeatureMapView.aspect, subject.id);
  const { update: updateView } = useViewStateActions(FeatureMapView.aspect, subject.id);
  const db = Obj.getDatabase(subject);
  const [refs = []] = useObject(subject, 'features');
  // Subscribed, not read off the subject, so a drag by another peer or an agent re-lays out an open canvas.
  const [positions] = useObject(subject, 'positions');
  // The map's refs are the scope: only these features and their relations are queried.
  const ids = useMemo(() => refs.flatMap((ref) => EID.getEntityId(EID.parse(ref.uri)) ?? []), [refs]);
  const graph = useFeatureGraph(db, ids);
  const features = useMemo(() => ids.flatMap((id) => graph.lookup(id) ?? []), [ids, graph]);
  const openObject = useOpenObject(db, attendableId);
  const editing = useFeatureEditing(db, subject);
  const handleOpen = useCallback((id: string) => void openObject(id), [openObject]);
  const handleCreate = useCallback(
    async (name: string) => {
      const id = await editing.createFeature(name);
      if (id) {
        await openObject(id);
      }
    },
    [editing, openObject],
  );

  const menu = useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .group(
          'mode',
          {
            label: ['feature-map.mode.label', { ns: meta.profile.key }],
            variant: 'toggleGroup',
            selectCardinality: 'single',
            value: mode,
          },
          (group) =>
            MODES.forEach(({ mode, icon }) =>
              group.action(
                mode,
                {
                  label: [`feature-map.mode.${mode}.label`, { ns: meta.profile.key }],
                  icon,
                  testId: `projectsPlugin.featureMap.${mode}`,
                },
                () => updateView((prev) => ({ ...prev, mode })),
              ),
            ),
        )
        .separator('gap')
        .action(
          'add-feature',
          {
            variant: 'custom',
            label: ['feature-map.add-feature.label', { ns: meta.profile.key }],
            render: () => (
              <ObjectAddPicker
                db={db}
                filter={Filter.type(Feature.Feature)}
                exclude={ids}
                onSelect={editing.addToMap}
                onCreate={handleCreate}
                trigger={
                  <Button.Root
                    icon='ph--plus--regular'
                    iconOnly
                    label={t('feature-map.add-feature.label')}
                    data-testid='feature-map.add-feature'
                  />
                }
              />
            ),
          },
          () => {},
        )
        .build(),
    [mode, updateView, db, ids, editing, handleCreate, t],
  );

  const handlePositionsChange = useCallback(
    (positions: FeatureMap.FeatureMap['positions']) =>
      Obj.update(subject, (subject) => {
        subject.positions = { ...positions };
      }),
    [subject],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...menu} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body asChild>
        {mode === 'canvas' ? (
          <div className='relative' data-testid='feature-map.canvas'>
            <FeatureCanvas
              features={features}
              positions={positions}
              onPositionsChange={handlePositionsChange}
              onOpen={handleOpen}
              onLink={editing.addDependency}
              onUnlink={editing.removeDependency}
              onRemove={editing.removeFromMap}
            />
          </div>
        ) : (
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport>
              <FeatureBoard
                features={features}
                onOpen={handleOpen}
                onSetStatus={editing.setStatus}
                onRemove={editing.removeFromMap}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};
