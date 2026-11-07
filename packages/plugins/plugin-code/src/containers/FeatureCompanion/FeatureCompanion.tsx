//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Obj, Ref } from '@dxos/echo';
import * as ProjectHooks from '@dxos/plugin-projects/ProjectHooks';
import { useSelection, useSelectionActions } from '@dxos/react-ui-attention';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { FeatureCard, type FeatureTarget, getDependents } from '#components';
import { CodeOperation } from '#types';

import { useSpecFeatures } from '../../hooks/index.ts';
import { CodeNamespace } from '../../namespace.ts';
import { findSpec } from '../../util/find-spec.ts';

export type FeatureCompanionProps = {
  role?: string;
  /** The spec whose map the companion sits beside. */
  spec: Spec.Spec;
  /** The spec plank's id: the selection context the map writes and what the detail opens beside. */
  attendableId?: string;
  /** Opens the spec breaking the feature down; an article of its own without it. */
  onZoom?: (spec: Spec.Spec) => void;
};

/**
 * The spec's feature companion: the `feat` block selected on its map, in full. Which block is the plank's single
 * selection, so the companion follows the map without either holding state of its own.
 */
export const FeatureCompanion = ({ role, spec, attendableId, onZoom }: FeatureCompanionProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const db = Obj.getDatabase(spec);
  const { invokePromise } = AppHooks.useOperationInvoker();
  const { features, lookup } = useSpecFeatures(spec);
  const selectedId = useSelection(attendableId, 'single');
  const feature = selectedId ? lookup(selectedId) : undefined;
  const { single: select } = useSelectionActions(attendableId);
  const openObject = ProjectHooks.useOpenObject(db, attendableId);
  const zoom = useCallback(
    (target: Spec.Spec) => (onZoom ? onZoom(target) : void openObject(target.id)),
    [onZoom, openObject],
  );

  // A feature without a breakdown gets one, named after it.
  const handleZoom = useCallback(async () => {
    if (!feature || !db) {
      return;
    }
    if (feature.breakdown) {
      const target = await findSpec(db, feature.breakdown);
      target && zoom(target);
      return;
    }
    const { data } = await invokePromise(
      CodeOperation.CreateSpec,
      { name: feature.name, breaks: { spec: Ref.make(spec), item: feature.id } },
      { spaceId: db.spaceId },
    );
    data && Spec.instanceOf(data.spec) && zoom(data.spec);
  }, [feature, db, spec, invokePromise, zoom]);

  // A row naming another feature of the map selects it; anything else (a task, a showcase) opens.
  const handleOpen = useCallback(
    (target: FeatureTarget) => {
      if (target.type !== 'object') {
        return;
      }
      lookup(target.id) ? select(target.id) : void openObject(target.id);
    },
    [lookup, select, openObject],
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
            onClick={() => void handleZoom()}
          >
            {t(feature.breakdown ? 'feature-article.zoom.label' : 'feature-companion.break-down.label')}
          </Button.Root>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <FeatureCard.Root feature={feature} lookup={lookup} onOpen={handleOpen}>
          <FeatureCard.Header>
            <FeatureCard.Status />
            <FeatureCard.Title />
          </FeatureCard.Header>
          <FeatureCard.Body>
            <FeatureCard.Description lines={0} />
            <FeatureCard.Requirements />
            <FeatureCard.Tags all />
            <FeatureCard.Dependencies />
            <FeatureCard.Dependents
              dependents={getDependents(feature.id, features).flatMap((id) => lookup(id) ?? [])}
            />
            <FeatureCard.Tasks />
            <FeatureCard.Showcases />
          </FeatureCard.Body>
        </FeatureCard.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

export type ProjectFeatureCompanionProps = Omit<FeatureCompanionProps, 'spec' | 'onZoom'> & {
  /** The project whose Specs tab shows the map. */
  project: Project.Project;
  /** The spec the level shows; the one the Specs tab has selected when absent. */
  spec?: Spec.Spec;
};

/** The feature companion beside a project's Specs tab; zooming opens the breakdown's level. */
export const ProjectFeatureCompanion = ({ project, spec: levelSpec, ...props }: ProjectFeatureCompanionProps) => {
  const spec = ProjectHooks.useSelectedSpec(project, levelSpec);
  const openLevel = ProjectHooks.useOpenSpecLevel(project, props.attendableId);
  return spec ? <FeatureCompanion spec={spec} onZoom={openLevel} {...props} /> : null;
};

export type SpecLevelCompanionProps = Omit<ProjectFeatureCompanionProps, 'project' | 'spec'> & {
  spec: Spec.Spec;
};

/** The feature companion beside a spec's level of the project owning it. */
export const SpecLevelCompanion = ({ spec, ...props }: SpecLevelCompanionProps) => {
  const project = Project.getOwner(spec);
  return project ? <ProjectFeatureCompanion {...props} project={project} spec={spec} /> : null;
};
