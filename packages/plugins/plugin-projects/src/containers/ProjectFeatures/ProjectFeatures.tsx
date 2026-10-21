//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import type * as Project from '@dxos/compute/Project';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { FeatureBoard, FeatureKanban } from '#components';
import { meta } from '#meta';
import { Feature, FeatureMapView } from '#types';

// Not in the components barrel: the canvas engine is large, and the barrel is also loaded by capabilities at boot.
import { FeatureCanvas } from '../../components/FeatureCanvas/index.ts';
import { ObjectAddPicker } from '../../components/ObjectAddPicker/index.ts';
import { useFeatureEditing, useFeatureGraph, useOpenObject, useOpenSpec } from '../../hooks/index.ts';

export type ProjectFeaturesProps = {
  project: Project.Project;
  attendableId?: string;
};

type Point = NonNullable<Feature.Feature['position']>;

const MODES: { mode: FeatureMapView.Mode; icon: string }[] = [
  { mode: 'cards', icon: 'ph--cards--regular' },
  { mode: 'canvas', icon: 'ph--graph--regular' },
  { mode: 'kanban', icon: 'ph--kanban--regular' },
];

/** A project's Features tab: the features that belong to it, as cards (the default), on a canvas, or by status. */
export const ProjectFeatures = ({ project, attendableId }: ProjectFeaturesProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { mode } = useViewState(FeatureMapView.aspect, project.id);
  const { update: updateView } = useViewStateActions(FeatureMapView.aspect, project.id);
  const db = Obj.getDatabase(project);
  // Queried, not read off the project: membership lives on each feature, so a move by an agent shows up here. Filtered
  // in the query rather than after it, since clearing a feature's `project` leaves the set of features unchanged and a
  // filter over that set would never re-run.
  const projectFeatures = useQuery(db, Filter.type(Feature.Feature, { project: Ref.make(project) }));
  const members = useMemo(() => [...projectFeatures].sort((a, b) => a.name.localeCompare(b.name)), [projectFeatures]);
  const ids = useMemo(() => members.map((feature) => feature.id), [members]);
  const positions = useMemo(
    () => Object.fromEntries(members.flatMap((feature) => (feature.position ? [[feature.id, feature.position]] : []))),
    [members],
  );
  const graph = useFeatureGraph(db, ids);
  const features = useMemo(() => ids.flatMap((id) => graph.lookup(id) ?? []), [ids, graph]);
  const openObject = useOpenObject(db, attendableId);
  const openSpec = useOpenSpec();
  const editing = useFeatureEditing(db, project);
  const handleOpen = useCallback((id: string) => void openObject(id), [openObject]);
  // The card whose name field is open: a feature created from the toolbar is named in place on the map.
  const [editingId, setEditingId] = useState<string>();
  const handleNew = useCallback(() => void editing.createFeature('').then((id) => id && setEditingId(id)), [editing]);

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
          'new-feature',
          {
            label: ['feature-map.new-feature.label', { ns: meta.profile.key }],
            icon: 'ph--plus--regular',
            testId: 'feature-map.new-feature',
          },
          handleNew,
        )
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
                onSelect={editing.addToProject}
                onCreate={editing.createFeature}
                trigger={
                  <Button.Root
                    icon='ph--list-plus--regular'
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
    [mode, updateView, db, ids, editing, handleNew, t],
  );

  // Only the features whose box moved are written, so a drag touches one object rather than the whole project.
  const handlePositionsChange = useCallback(
    (next: Record<string, Point>) =>
      members.forEach((feature) => {
        const point = next[feature.id];
        if (point && (point.x !== feature.position?.x || point.y !== feature.position?.y)) {
          Obj.update(feature, (feature) => {
            feature.position = { x: point.x, y: point.y };
          });
        }
      }),
    [members],
  );

  return (
    <Panel.Root>
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
              onRemove={editing.removeFromProject}
              onRename={editing.rename}
              onDescribe={editing.describe}
              editingId={editingId}
              onEditingChange={setEditingId}
            />
          </div>
        ) : mode === 'kanban' ? (
          <FeatureKanban
            features={features}
            onSetStatus={editing.setStatus}
            onOpen={handleOpen}
            onOpenObject={handleOpen}
            openSpec={openSpec}
            onRemove={editing.removeFromProject}
            onRename={editing.rename}
            onDescribe={editing.describe}
            editingId={editingId}
            onEditingChange={setEditingId}
          />
        ) : (
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport>
              <FeatureBoard
                features={features}
                onOpen={handleOpen}
                onOpenObject={handleOpen}
                openSpec={openSpec}
                onSetStatus={editing.setStatus}
                onRemove={editing.removeFromProject}
                onRename={editing.rename}
                onDescribe={editing.describe}
                editingId={editingId}
                onEditingChange={setEditingId}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};
