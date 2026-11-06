//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Obj, type Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useViewState } from '@dxos/react-ui-attention';

import { ProjectView } from '#types';

import * as ProjectGraph from '../ProjectGraph.ts';
import { type SpecNesting, readNesting, specLineage } from '../util/spec-references.ts';
import { useRefTargets } from './useRefTargets.ts';

/** The specs the project owns, live and in order: it follows `Project.specs` as specs are added, removed or loaded. */
export const useProjectSpecs = (project: Project.Project): Spec.Spec[] => {
  const [specs] = useObject(project, 'specs');
  return useRefTargets(specs ?? EMPTY).filter(Spec.instanceOf);
};

const EMPTY: readonly Ref.Ref<Spec.Spec>[] = [];

/** The spec the project's Specs tab shows: `spec` when the level names one, else the reader's pick, else the first. */
export const useSelectedSpec = (project: Project.Project, spec?: Spec.Spec): Spec.Spec | undefined => {
  const specs = useProjectSpecs(project);
  const { spec: selectedId } = useViewState(ProjectView.aspect, project.id);
  return spec ?? specs.find(({ id }) => id === selectedId) ?? specs[0];
};

/** How `specs` nest by citation, following their texts. */
export const useSpecNesting = (specs: readonly Spec.Spec[]): SpecNesting => {
  const ids = specs.map(({ id }) => id).join(',');
  // Keyed by ids: the list is a new array each render.
  const atom = useMemo(() => Atom.make((get) => readNesting(specs, get)), [ids]);
  return useAtomValue(atom);
};

/** Opens a spec's level of the project's nav tree, beside `pivotId`, by the first path of citations that reaches it. */
export const useOpenSpecLevel = (project: Project.Project, pivotId: string | undefined) => {
  const nesting = useSpecNesting(useProjectSpecs(project));
  const { invokePromise } = Hooks.useOperationInvoker();
  return useCallback(
    (spec: Spec.Spec) => {
      const spaceId = Obj.getDatabase(project)?.spaceId;
      if (!spaceId) {
        return;
      }
      const [root, ...lineage] = specLineage(nesting, spec.id) ?? [spec.id];
      void invokePromise(LayoutOperation.Open, {
        subject: [ProjectGraph.getSpecLevelPath(spaceId, project.id, root, lineage)],
        pivotId,
        disposition: 'auto',
      });
    },
    [project, pivotId, nesting, invokePromise],
  );
};
