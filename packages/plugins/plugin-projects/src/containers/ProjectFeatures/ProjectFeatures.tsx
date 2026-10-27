//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { Fragment, useCallback, useMemo } from 'react';

import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import type * as Project from '@dxos/compute/Project';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import {
  Attention,
  useSelection,
  useSelectionActions,
  useViewState,
  useViewStateActions,
} from '@dxos/react-ui-attention';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Breadcrumb from '@dxos/react-ui/Breadcrumb';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { FeatureKanban } from '#components';
import { FEATURE_COMPANION, meta } from '#meta';
import { Feature, FeatureMapView } from '#types';

// Not in the components barrel: the canvas engine is large, and the barrel is also loaded by capabilities at boot.
import { FeatureCanvas } from '../../components/FeatureCanvas/index.ts';
import { ObjectAddPicker } from '../../components/ObjectAddPicker/index.ts';
import { useFeatureEditing, useFeatureGraph } from '../../hooks/index.ts';

export type ProjectFeaturesProps = {
  project: Project.Project;
  attendableId?: string;
};

type Point = NonNullable<Feature.Feature['position']>;

const MODES: { mode: FeatureMapView.Mode; icon: string }[] = [
  { mode: 'canvas', icon: 'ph--graph--regular' },
  { mode: 'kanban', icon: 'ph--kanban--regular' },
];

const nothing = Query.select(Filter.nothing());

/** The features from the root down to `feature`, read through atoms so a rename reaches the trail. */
const useTrail = (feature: Feature.Feature | undefined): { id: string; name: string }[] => {
  const trailAtom = useMemo(
    () =>
      Atom.make((get) => {
        const trail: { id: string; name: string }[] = [];
        for (let current = feature; current && trail.length < 32;) {
          const { id, name, parent } = get(Obj.atom(current));
          trail.unshift({ id, name });
          const next = parent && get(Obj.atomReactive(parent));
          current = Feature.instanceOf(next) ? next : undefined;
        }
        return trail;
      }),
    [feature],
  );
  return useAtomValue(trailAtom);
};

/**
 * A project's Features tab: one level of its feature map, on a canvas or by status. A click selects a feature and shows
 * it in the plank's feature companion; a double-click zooms into its subfeatures, and the trail above zooms back out.
 */
export const ProjectFeatures = ({ project, attendableId }: ProjectFeaturesProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { mode, focus } = useViewState(FeatureMapView.aspect, project.id);
  const { update: updateView } = useViewStateActions(FeatureMapView.aspect, project.id);
  const db = Obj.getDatabase(project);

  // The feature zoomed into; a focus that no longer resolves (deleted) falls back to the top level.
  const [focusFeature] = useQuery(focus ? db : undefined, focus ? Query.select(Filter.id(focus)) : nothing);
  const zoomed = Feature.instanceOf(focusFeature) ? focusFeature : undefined;
  const trail = useTrail(zoomed);

  // Queried, not read off the project or parent: membership lives on each feature, so a move by an agent shows up here.
  // Filtered in the query rather than after it, since clearing a feature's `project` or `parent` leaves the set of
  // features unchanged and a filter over that set would never re-run.
  const levelQuery = useMemo(
    () =>
      zoomed
        ? Query.select(Filter.type(Feature.Feature, { parent: Ref.make(zoomed) }))
        : Query.select(Filter.type(Feature.Feature, { project: Ref.make(project) })),
    [zoomed, project],
  );
  const levelFeatures = useQuery(db, levelQuery);
  const members = useMemo(() => [...levelFeatures].sort((a, b) => a.name.localeCompare(b.name)), [levelFeatures]);
  const ids = useMemo(() => members.map((feature) => feature.id), [members]);
  const positions = useMemo(
    () => Object.fromEntries(members.flatMap((feature) => (feature.position ? [[feature.id, feature.position]] : []))),
    [members],
  );
  const graph = useFeatureGraph(db, ids);
  const features = useMemo(() => ids.flatMap((id) => graph.lookup(id) ?? []), [ids, graph]);
  const editing = useFeatureEditing(db, project);

  // The selection is the plank's, so the feature companion follows it without either holding state of its own.
  const selectedId = useSelection(attendableId, 'single');
  const { clear: clearSelection } = useSelectionActions(attendableId);
  const showItem = ToolkitHooks.useShowItem();
  const handleSelect = useCallback(
    (id: string | undefined) => {
      if (!attendableId || id === selectedId) {
        return;
      }
      if (id) {
        void showItem({
          contextId: attendableId,
          selectionId: id,
          companion: Attention.linkedSegment(FEATURE_COMPANION),
        });
      } else {
        clearSelection();
      }
    },
    [attendableId, selectedId, showItem, clearSelection],
  );
  const handleZoom = useCallback(
    (id: string | undefined) => updateView((prev) => ({ ...prev, focus: id })),
    [updateView],
  );

  // A new feature is named in the companion, where its other fields are too.
  const handleNew = useCallback(
    () =>
      void editing.createFeature(t('feature-map.new-feature.name'), zoomed?.id).then((id) => id && handleSelect(id)),
    [editing, zoomed, handleSelect, t],
  );
  const handleAdd = useCallback(
    (id: string) => (zoomed ? editing.setParent(id, zoomed.id) : editing.addToProject(id)),
    [editing, zoomed],
  );

  const menu = useMenuBuilder((): ActionGraphProps => {
    return MenuBuilder.make()
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
              exclude={zoomed ? [...ids, ...trail.map(({ id }) => id)] : ids}
              onSelect={handleAdd}
              onCreate={(name) => editing.createFeature(name, zoomed?.id)}
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
      .build();
  }, [mode, updateView, db, ids, trail, zoomed, editing, handleNew, handleAdd, t]);

  // Only the features whose box moved are written, so a drag touches one object rather than the whole map.
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
        {/* The trail is a second row: the map's level, with every step above it a way back out. */}
        {zoomed && (
          <Toolbar.Root>
            <Button.Root
              variant='ghost'
              icon='ph--arrow-up--regular'
              iconOnly
              label={t('feature-map.zoom-out.label')}
              data-testid='feature-map.zoom-out'
              onClick={() => handleZoom(trail.at(-2)?.id)}
            />
            <Breadcrumb.Root aria-label={t('feature-map.trail.label')} data-testid='feature-map.trail'>
              <Breadcrumb.List>
                <Breadcrumb.Item>
                  <Breadcrumb.Link asChild>
                    <button type='button' onClick={() => handleZoom(undefined)}>
                      {t('feature-map.root.label')}
                    </button>
                  </Breadcrumb.Link>
                </Breadcrumb.Item>
                {trail.map(({ id, name }, index) => (
                  <Fragment key={id}>
                    <Breadcrumb.Separator />
                    <Breadcrumb.Item>
                      {index === trail.length - 1 ? (
                        <Breadcrumb.Current>{name}</Breadcrumb.Current>
                      ) : (
                        <Breadcrumb.Link asChild>
                          <button type='button' onClick={() => handleZoom(id)}>
                            {name}
                          </button>
                        </Breadcrumb.Link>
                      )}
                    </Breadcrumb.Item>
                  </Fragment>
                ))}
              </Breadcrumb.List>
            </Breadcrumb.Root>
          </Toolbar.Root>
        )}
      </Panel.Header>
      <Panel.Body asChild>
        {zoomed && features.length === 0 ? (
          <Status.Empty classNames='h-full'>{t('feature-map.empty.message')}</Status.Empty>
        ) : mode === 'kanban' ? (
          <FeatureKanban
            features={features}
            selectedId={selectedId}
            onSelect={handleSelect}
            onZoom={handleZoom}
            onChange={editing.update}
          />
        ) : (
          <div className='relative' data-testid='feature-map.canvas'>
            {/* Keyed by level, so zooming starts a fresh camera and layout rather than morphing the last level's, and
                by whether the level has loaded, since the canvas fits its camera to the boxes it mounts with. */}
            <FeatureCanvas
              key={`${zoomed?.id ?? 'root'}:${features.length > 0}`}
              features={features}
              positions={positions}
              selectedId={selectedId}
              onPositionsChange={handlePositionsChange}
              onSelect={handleSelect}
              onZoom={handleZoom}
              onLink={editing.addDependency}
              onUnlink={editing.removeDependency}
              onRemove={zoomed ? undefined : editing.removeFromProject}
            />
          </div>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};
