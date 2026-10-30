//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import React, { Fragment, useCallback, useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Spec from '@dxos/compute/Spec';
import { Annotation, Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Breadcrumb from '@dxos/react-ui/Breadcrumb';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { FeatureKanban } from '#components';
import { Feature, FeatureMap, FeatureMapView } from '#types';

// Not in the components barrel: the canvas engine is large, and the barrel is also loaded by capabilities at boot.
import { FeatureCanvas } from '../../components/FeatureCanvas/index.ts';
import { useFeatureEditing, useFeatureGraph } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import { useAddFeature, useFeatureSelection, useLevelIds, useSpecMapActions } from './spec-map-actions.ts';

type Point = FeatureMap.Position;

const nothing = Query.select(Filter.nothing());

export type SpecMapProps = {
  spec: Spec.Spec;
  mode: FeatureMapView.Mode;
  attendableId?: string;
  /** Not offered when adding an existing feature, besides the map's own features: the features above it. */
  exclude?: readonly string[];
  /** Opens the level breaking the feature down: a double-click on its card. */
  onZoom: (id: string) => void;
};

/**
 * One level of a feature map — the features on `spec`, on a canvas or by status — or the spec's `.mdl` text. A
 * click selects a feature and shows it in the plank's feature companion.
 */
export const SpecMap = ({ spec, mode, attendableId, exclude, onZoom }: SpecMapProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const db = Obj.getDatabase(spec);
  const ids = useLevelIds(spec);
  const layout = useAtomValue(useMemo(() => Annotation.atom(spec, FeatureMap.LayoutAnnotation), [spec]));
  const positions = useMemo(() => ({ ...Option.getOrUndefined(layout)?.positions }), [layout]);
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
  const { selectedId, select } = useFeatureSelection(attendableId);
  const { createAt, addAt } = useAddFeature({ db, spec, attendableId, exclude });
  const handleZoom = useCallback((id: string | undefined) => id && onZoom(id), [onZoom]);

  // Only the boxes that moved are written, so a drag touches one entry of the layout rather than all of it.
  const handlePositionsChange = useCallback(
    (next: Record<string, Point>) => {
      const moved = ids.flatMap((id) => {
        const point = next[id];
        const current = positions[id];
        return point && (point.x !== current?.x || point.y !== current?.y) ? [[id, point] as const] : [];
      });
      for (const [id, { x, y }] of moved) {
        FeatureMap.setPosition(spec, id, { x, y });
      }
    },
    [spec, ids, positions],
  );

  if (mode === 'document') {
    // A section rather than an article: the spec's own page (plugin-code's, when enabled) is for opening it.
    return (
      <div className='grid min-h-0 h-full' data-testid='feature-map.document'>
        <Surface.Surface
          type={AppSurface.Section}
          data={{ subject: spec, attendableId: attendableId ?? spec.id }}
          limit={1}
        />
      </div>
    );
  }

  // The canvas shows even when empty: its empty cells are where features are added.
  if (mode === 'kanban' && ids.length === 0) {
    return <Status.Empty classNames='h-full'>{t('feature-map.empty.message')}</Status.Empty>;
  }

  return mode === 'kanban' ? (
    <FeatureKanban
      features={features}
      selectedId={selectedId}
      onSelect={select}
      onZoom={handleZoom}
      onChange={editing.update}
    />
  ) : (
    <div className='relative h-full' data-testid='feature-map.canvas'>
      {/* Keyed by level, so a new level starts a fresh camera and layout rather than morphing the last one's, and by
          whether the level has loaded, since the canvas fits its camera to the boxes it mounts with. */}
      <FeatureCanvas
        key={`${spec.id}:${features.length > 0}`}
        features={features}
        positions={positions}
        selectedId={selectedId}
        onPositionsChange={handlePositionsChange}
        onSelect={select}
        onZoom={handleZoom}
        onLink={editing.addDependency}
        onUnlink={editing.removeDependency}
        onRemove={editing.removeFeature}
        onCreate={(position) => void createAt(position)}
        onAdd={addAt}
      />
    </div>
  );
};

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
          const container = FeatureMap.getContainer(current);
          current = container && container.id !== root.id ? FeatureMap.getOwner(container) : undefined;
        }
        return trail;
      }),
    [root, feature],
  );
  return useAtomValue(trailAtom);
};

export type SpecFeaturesProps = {
  role?: string;
  spec: Spec.Spec;
  attendableId?: string;
};

/**
 * A spec's feature map in a plank of its own, zooming within the plank: a double-click zooms into the spec that breaks
 * the feature down, and the trail above zooms back out.
 *
 * @deprecated Serves the top-level Specs section; a project shows its spec's levels as nodes of their own.
 */
export const SpecFeatures = ({ role, spec, attendableId }: SpecFeaturesProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const { focus } = useViewState(FeatureMapView.aspect, spec.id);
  const { update: updateView } = useViewStateActions(FeatureMapView.aspect, spec.id);
  const db = Obj.getDatabase(spec);

  // The feature zoomed into; a focus that no longer resolves (deleted), or that has moved off this spec's tree, falls
  // back to the top level, so a feature created there lands under the opened spec.
  const [focusFeature] = useQuery(focus ? db : undefined, focus ? Query.select(Filter.id(focus)) : nothing);
  const zoomed =
    Feature.instanceOf(focusFeature) &&
    FeatureMap.getAncestry(FeatureMap.getContainer(focusFeature)).some((ancestor) => ancestor.id === spec.id)
      ? focusFeature
      : undefined;
  const trail = useTrail(spec, zoomed);
  const exclude = useMemo(() => trail.map(({ id }) => id), [trail]);

  // The level's spec: the map's own, or the one breaking the zoomed feature down (none until a feature is added).
  const breakdown = useResolveRef(useObject(zoomed)[0]?.spec);
  const level = zoomed ? (Spec.instanceOf(breakdown) ? breakdown : undefined) : spec;
  const handleZoom = useCallback(
    (id: string | undefined) => updateView((prev) => ({ ...prev, focus: id })),
    [updateView],
  );

  const { mode, actions } = useSpecMapActions({ spec: level ?? spec, viewId: spec.id });
  const menu = useMenuBuilder(() => MenuBuilder.make().subgraph(actions).build(), [actions]);

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...menu} attendableId={attendableId} />
        {/* The trail is a second row: the map's level, with every step above it a way back out. */}
        {zoomed && mode !== 'document' && (
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
      <Panel.Body>
        {level ? (
          <SpecMap spec={level} mode={mode} attendableId={attendableId} exclude={exclude} onZoom={handleZoom} />
        ) : (
          <Status.Empty classNames='h-full'>{t('feature-map.empty.message')}</Status.Empty>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

export type SpecArticleProps = AppSurface.ObjectArticleProps<Spec.Spec>;

/**
 * Article surface for a {@link Spec.Spec}: its feature map.
 *
 * @deprecated Serves the top-level Specs section; see {@link SpecFeatures}.
 */
export const SpecArticle = ({ role, subject, attendableId }: SpecArticleProps) => (
  <SpecFeatures role={role} spec={subject} attendableId={attendableId} />
);
