//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type * as Project from '@dxos/compute/Project';
import { Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useSelection, useSelectionActions, useViewStateActions } from '@dxos/react-ui-attention';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Feature, FeatureMapView, type Spec } from '#types';

import { useOpenObject, useProjectSpec } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import { FeatureDetail } from '../FeatureArticle/index.ts';

const nothing = Query.select(Filter.nothing());

export type FeatureCompanionProps = {
  role?: string;
  /** The spec whose map the companion sits beside. */
  spec: Spec.Spec;
  /** The spec plank's id: the selection context the map writes and what the detail opens beside. */
  attendableId?: string;
};

/**
 * The spec's feature companion: the feature selected on its map, in full. Which feature is the plank's single
 * selection, so the companion follows the map without either holding state of its own. Picking a subfeature here
 * zooms the map into this feature and selects it there, so the map and the companion keep showing the same place.
 */
export const FeatureCompanion = ({ role, spec, attendableId }: FeatureCompanionProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const db = Obj.getDatabase(spec);
  const selectedId = useSelection(attendableId, 'single');
  const [selected] = useQuery(selectedId ? db : undefined, selectedId ? Query.select(Filter.id(selectedId)) : nothing);
  const feature = Feature.instanceOf(selected) ? selected : undefined;
  const { single: select } = useSelectionActions(attendableId);
  const { update: updateView } = useViewStateActions(FeatureMapView.aspect, spec.id);
  const openObject = useOpenObject(db, attendableId);

  const handleZoom = useCallback(() => {
    if (feature) {
      updateView((prev) => ({ ...prev, focus: feature.id }));
    }
  }, [feature, updateView]);
  const handleSelectSubfeature = useCallback(
    (id: string) => {
      handleZoom();
      select(id);
    },
    [handleZoom, select],
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

export type ProjectFeatureCompanionProps = Omit<FeatureCompanionProps, 'spec'> & {
  /** The project whose Spec tab shows the map. */
  project: Project.Project;
};

/** The feature companion beside a project: the one its spec's map shows, on the project's Spec tab. */
export const ProjectFeatureCompanion = ({ project, ...props }: ProjectFeatureCompanionProps) => {
  const spec = useProjectSpec(project);
  return spec ? <FeatureCompanion spec={spec} {...props} /> : null;
};
