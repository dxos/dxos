//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { Fragment, useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
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
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { FeatureKanban } from '#components';
import { Feature, FeatureMapView, Spec } from '#types';

// Not in the components barrel: the canvas engine is large, and the barrel is also loaded by capabilities at boot.
import { FeatureCanvas } from '../../components/FeatureCanvas/index.ts';
import { ObjectAddPicker } from '../../components/ObjectAddPicker/index.ts';
import { FEATURE_COMPANION, SPEC_DOCUMENT_COMPANION } from '../../constants.ts';
import { useFeatureEditing, useFeatureGraph } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';

export type SpecFeaturesProps = {
  role?: string;
  spec: Spec.Spec;
  attendableId?: string;
};

type Point = Spec.Position;

const MODES: { mode: FeatureMapView.Mode; icon: string }[] = [
  { mode: 'canvas', icon: 'ph--graph--regular' },
  { mode: 'kanban', icon: 'ph--kanban--regular' },
];

const nothing = Query.select(Filter.nothing());

/**
 * The features from the map's spec down to `feature`, each the owner of the next one's spec, read through atoms so a
 * rename reaches the trail. Stops at `root`, so a nested spec opened on its own trails from itself.
 */
const useTrail = (root: Spec.Spec, feature: Feature.Feature | undefined): { id: string; name: string }[] => {
  const trailAtom = useMemo(
    () =>
      Atom.make((get) => {
        const trail: { id: string; name: string }[] = [];
        for (let current = feature; current && trail.length < 32;) {
          const { id, name } = get(Obj.atom(current));
          trail.unshift({ id, name });
          const container = Spec.getContainer(current);
          current = container && container.id !== root.id ? Spec.getOwner(container) : undefined;
        }
        return trail;
      }),
    [root, feature],
  );
  return useAtomValue(trailAtom);
};

/**
 * A spec's feature map: one level of it, on a canvas or by status. A click selects a feature and shows it in the
 * plank's feature companion; a double-click zooms into the spec that breaks the feature down, and the trail above zooms
 * back out.
 */
export const SpecFeatures = ({ role, spec, attendableId }: SpecFeaturesProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const { mode, focus } = useViewState(FeatureMapView.aspect, spec.id);
  const { update: updateView } = useViewStateActions(FeatureMapView.aspect, spec.id);
  const db = Obj.getDatabase(spec);

  // The feature zoomed into; a focus that no longer resolves (deleted), or that has moved off this spec's tree, falls
  // back to the top level, so a feature created there lands under the opened spec.
  const [focusFeature] = useQuery(focus ? db : undefined, focus ? Query.select(Filter.id(focus)) : nothing);
  const zoomed =
    Feature.instanceOf(focusFeature) &&
    Spec.getAncestry(Spec.getContainer(focusFeature)).some((ancestor) => ancestor.id === spec.id)
      ? focusFeature
      : undefined;
  const trail = useTrail(spec, zoomed);

  // The level's spec: the map's own, or the one breaking the zoomed feature down (none until a feature is added).
  const zoomedSnapshot = useObject(zoomed)[0];
  const breakdown = useResolveRef(zoomedSnapshot?.spec);
  const level = zoomed ? (Spec.instanceOf(breakdown) ? breakdown : undefined) : spec;
  const [levelSnapshot] = useObject(level);
  // Read through atoms, so a feature added by an agent or renamed on another peer reaches the map.
  const idsAtom = useMemo(
    () =>
      Atom.make((get) => {
        if (!level) {
          return [];
        }
        const members = get(Obj.atomReactive(get(Obj.atom(level)).features)).filter(Feature.instanceOf);
        return members
          .map((member) => get(Obj.atom(member)))
          .sort((left, right) => left.name.localeCompare(right.name))
          .map(({ id }) => id);
      }),
    [level],
  );
  const memberIds = useAtomValue(idsAtom);
  // Keyed by content, so an unchanged set keeps its identity across renders and the graph's subscriptions stay put.
  const idsKey = memberIds.join(',');
  const ids = useMemo(() => (idsKey ? idsKey.split(',') : []), [idsKey]);
  const positions = useMemo(() => ({ ...levelSnapshot?.layout?.positions }), [levelSnapshot]);
  // Neighbours load the features on other specs that this level depends on, which the cards mark rather than draw.
  const graph = useFeatureGraph(db, ids, { neighbours: true });
  const features = useMemo(
    () =>
      ids.flatMap((id) => {
        const feature = graph.lookup(id);
        if (!feature) {
          return [];
        }
        const external = feature.dependsOn
          .filter((dependency) => !ids.includes(dependency))
          .flatMap((dependency) => {
            const target = graph.lookup(dependency);
            return target ? [{ id: target.id, name: target.name }] : [];
          });
        return [{ ...feature, external }];
      }),
    [ids, graph],
  );
  const editing = useFeatureEditing(db, spec);

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
  const handleAdd = useCallback((id: string) => editing.moveFeature(id, zoomed?.id), [editing, zoomed]);

  // The document lives only within its spec, so the spec's toolbar is the way to it.
  const { invokePromise } = Hooks.useOperationInvoker();
  const hasDocument = useObject(spec)[0]?.document !== undefined;
  const handleOpenDocument = useCallback(
    () =>
      void invokePromise(LayoutOperation.UpdateCompanion, {
        subject: Attention.linkedSegment(SPEC_DOCUMENT_COMPANION),
        // Anchored to this plank, which need not be the attended one when its toolbar is clicked.
        anchor: attendableId,
      }),
    [invokePromise, attendableId],
  );

  const menu = useMenuBuilder((): ActionGraphProps => {
    const builder = MenuBuilder.make();
    if (hasDocument) {
      builder.action(
        'open-document',
        {
          label: ['feature-map.open-document.label', { ns: ProjectsNamespace.key }],
          icon: 'ph--file-text--regular',
          testId: 'feature-map.open-document',
        },
        handleOpenDocument,
      );
    }
    return builder
      .group(
        'mode',
        {
          label: ['feature-map.mode.label', { ns: ProjectsNamespace.key }],
          variant: 'toggleGroup',
          selectCardinality: 'single',
          value: mode,
        },
        (group) =>
          MODES.forEach(({ mode, icon }) =>
            group.action(
              mode,
              {
                label: [`feature-map.mode.${mode}.label`, { ns: ProjectsNamespace.key }],
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
          label: ['feature-map.new-feature.label', { ns: ProjectsNamespace.key }],
          icon: 'ph--plus--regular',
          testId: 'feature-map.new-feature',
        },
        handleNew,
      )
      .action(
        'add-feature',
        {
          variant: 'custom',
          label: ['feature-map.add-feature.label', { ns: ProjectsNamespace.key }],
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
  }, [mode, updateView, db, ids, trail, zoomed, editing, handleNew, handleAdd, hasDocument, handleOpenDocument, t]);

  // Only the boxes that moved are written, so a drag touches one entry of the layout rather than all of it.
  const handlePositionsChange = useCallback(
    (next: Record<string, Point>) => {
      if (!level) {
        return;
      }
      const moved = ids.flatMap((id) => {
        const point = next[id];
        const current = positions[id];
        return point && (point.x !== current?.x || point.y !== current?.y) ? [[id, point] as const] : [];
      });
      if (moved.length > 0) {
        Obj.update(level, (level) => {
          level.layout ??= { positions: {} };
          for (const [id, { x, y }] of moved) {
            level.layout.positions[id] = { x, y };
          }
        });
      }
    },
    [level, ids, positions],
  );

  return (
    <Panel.Root role={role}>
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
              onRemove={editing.removeFeature}
            />
          </div>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

export type SpecArticleProps = AppSurface.ObjectArticleProps<Spec.Spec>;

/** Article surface for a {@link Spec.Spec}: its feature map. */
export const SpecArticle = ({ role, subject, attendableId }: SpecArticleProps) => (
  <SpecFeatures role={role} spec={subject} attendableId={attendableId} />
);
