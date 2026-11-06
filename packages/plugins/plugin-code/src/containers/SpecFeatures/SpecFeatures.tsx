//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { Fragment, useCallback, useMemo } from 'react';

import * as Spec from '@dxos/compute/Spec';
import { Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import * as Breadcrumb from '@dxos/react-ui/Breadcrumb';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { FeatureKanban } from '#components';
import { Feature, FeatureMap, FeatureMapView } from '#types';

import { useFeatureEditing, useFeatureGraph } from '../../hooks/index.ts';
import { CodeNamespace } from '../../namespace.ts';
import { useFeatureSelection, useLevelIds } from './spec-map-actions.ts';

const nothing = Query.select(Filter.nothing());

export type SpecMapProps = {
  spec: Spec.Spec;
  attendableId?: string;
  /** Opens the level breaking the feature down: a double-click on its card. */
  onZoom: (id: string) => void;
};

/** One level of a feature map: the features on `spec` on a board by status. A click selects a feature. */
export const SpecMap = ({ spec, attendableId, onZoom }: SpecMapProps) => {
  const { t } = UiHooks.useTranslation(CodeNamespace.key);
  const db = Obj.getDatabase(spec);
  const ids = useLevelIds(spec);
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
  const handleZoom = useCallback((id: string | undefined) => id && onZoom(id), [onZoom]);

  if (ids.length === 0) {
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
 * The feature map of a spec no project tracks, zooming in place: a double-click zooms into the spec that breaks the
 * feature down, and the trail above zooms back out. A project's specs open each level as a node of its own instead.
 */
export const SpecFeatures = ({ role, spec, attendableId }: SpecFeaturesProps) => {
  const { t } = UiHooks.useTranslation(CodeNamespace.key);
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

  // The level's spec: the map's own, or the one breaking the zoomed feature down (none until a feature is added).
  const breakdown = useResolveRef(useObject(zoomed)[0]?.spec);
  const level = zoomed ? (Spec.instanceOf(breakdown) ? breakdown : undefined) : spec;
  const handleZoom = useCallback(
    (id: string | undefined) => updateView((prev) => ({ ...prev, focus: id })),
    [updateView],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        {/* The map's level, with every step above it a way back out. */}
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
      <Panel.Body>
        {level ? (
          <SpecMap spec={level} attendableId={attendableId} onZoom={handleZoom} />
        ) : (
          <Status.Empty classNames='h-full'>{t('feature-map.empty.message')}</Status.Empty>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};
