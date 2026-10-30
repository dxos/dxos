//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { useSelection, useSelectionActions, useViewStateActions } from '@dxos/react-ui-attention';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Feature, FeatureMap, FeatureMapView } from '#types';

import { useOpenObject, useOpenSpecLevel, useSelectedSpec } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import { FeatureDetail } from '../FeatureArticle/index.ts';

const nothing = Query.select(Filter.nothing());

export type FeatureCompanionProps = {
  role?: string;
  /** The spec whose map the companion sits beside. */
  spec: Spec.Spec;
  /** The spec plank's id: the selection context the map writes and what the detail opens beside. */
  attendableId?: string;
  /** Opens the level breaking the feature down; the map zooms within its plank without it. */
  onZoom?: (feature: Feature.Feature) => void;
};

/**
 * The spec's feature companion: the feature selected on its map, in full. Which feature is the plank's single
 * selection, so the companion follows the map without either holding state of its own. Picking a subfeature here
 * zooms the map into this feature and selects it there, so the map and the companion keep showing the same place.
 */
export const FeatureCompanion = ({ role, spec, attendableId, onZoom }: FeatureCompanionProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const db = Obj.getDatabase(spec);
  const selectedId = useSelection(attendableId, 'single');
  const [selected] = useQuery(selectedId ? db : undefined, selectedId ? Query.select(Filter.id(selectedId)) : nothing);
  const feature = Feature.instanceOf(selected) ? selected : undefined;
  const { single: select } = useSelectionActions(attendableId);
  const { update: updateView } = useViewStateActions(FeatureMapView.aspect, spec.id);
  const openObject = useOpenObject(db, attendableId);

  const handleZoom = useCallback(() => {
    if (!feature) {
      return;
    }
    if (onZoom) {
      onZoom(feature);
    } else {
      updateView((prev) => ({ ...prev, focus: feature.id }));
    }
  }, [feature, onZoom, updateView]);
  // Within the plank, the subfeature is selected on the level zoomed to; a level of its own has its own selection.
  const handleSelectSubfeature = useCallback(
    (id: string) => {
      handleZoom();
      if (!onZoom) {
        select(id);
      }
    },
    [handleZoom, onZoom, select],
  );

  if (!feature) {
    return (
      <Panel.Root role={role}>
        <Panel.Body>
          <Status.Empty classNames='h-full' data-testid='feature-companion.empty'>
            {t('feature-companion.empty.message')}
          </Status.Empty>
        </Panel.Body>
      </Panel.Root>
    );
  }

  return (
    <Panel.Root role={role} data-testid='feature-companion'>
      <Panel.Header>
        <Toolbar.Root>
          <Button.Root
            variant='ghost'
            icon='ph--arrows-in--regular'
            data-testid='feature-companion.zoom'
            onClick={handleZoom}
          >
            {t('feature-article.zoom.label')}
          </Button.Root>
          <Toolbar.Separator variant='gap' />
          <Button.Root
            variant='ghost'
            icon='ph--arrow-square-out--regular'
            iconOnly
            label={t('feature-article.open.label')}
            data-testid='feature-companion.open'
            onClick={() => void openObject(feature.id)}
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        {/* Keyed by feature, so a form's uncommitted field never carries over to the next selection. */}
        <FeatureDetail
          key={feature.id}
          feature={feature}
          attendableId={attendableId}
          onSelectSubfeature={handleSelectSubfeature}
        />
      </Panel.Body>
    </Panel.Root>
  );
};

export type ProjectFeatureCompanionProps = Omit<FeatureCompanionProps, 'spec' | 'onZoom'> & {
  /** The project whose Specs tab shows the map. */
  project: Project.Project;
  /** The spec the level lies in; the one the Specs tab has selected when absent. */
  spec?: Spec.Spec;
  /** The feature whose breakdown the plank shows; the spec itself when absent. */
  feature?: Feature.Feature;
};

/**
 * The feature companion beside one level of a project's specs: the map its Specs tab shows. Zooming opens the level
 * breaking the selected feature down.
 */
export const ProjectFeatureCompanion = ({
  project,
  spec: levelSpec,
  feature,
  ...props
}: ProjectFeatureCompanionProps) => {
  const selected = useSelectedSpec(project, levelSpec);
  const breakdown = useResolveRef(useObject(feature, 'spec')[0]);
  const spec = feature ? (Spec.instanceOf(breakdown) ? breakdown : undefined) : selected;
  const openLevel = useOpenSpecLevel(project, props.attendableId);
  return spec ? <FeatureCompanion spec={spec} onZoom={(zoomed) => openLevel(zoomed)} {...props} /> : null;
};

export type FeatureLevelCompanionProps = Omit<ProjectFeatureCompanionProps, 'project' | 'feature'> & {
  feature: Feature.Feature;
};

/** The feature companion beside a feature's level of the project tracking it. */
export const FeatureLevelCompanion = ({ feature, ...props }: FeatureLevelCompanionProps) => {
  const project = FeatureMap.findProject(feature);
  return project ? (
    <ProjectFeatureCompanion {...props} project={project} spec={FeatureMap.findRoot(feature)} feature={feature} />
  ) : null;
};

export type SpecLevelCompanionProps = Omit<ProjectFeatureCompanionProps, 'project' | 'spec' | 'feature'> & {
  spec: Spec.Spec;
};

/** The feature companion beside a spec's level of the project owning it. */
export const SpecLevelCompanion = ({ spec, ...props }: SpecLevelCompanionProps) => {
  const project = Project.getOwner(spec);
  return project ? <ProjectFeatureCompanion {...props} project={project} spec={spec} /> : null;
};
