//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useCallback, useMemo } from 'react';

import type * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { type Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';

import { ProjectView } from '#types';

import { type SpecNesting, readNesting } from '../util/spec-references.ts';
import { type SpecTreeEntry, specTree } from '../util/spec-tree.ts';
import { useRefTargets } from './useRefTargets.ts';

/** The specs the project owns, live and in order: it follows `Project.specs` as specs are added, removed or loaded. */
export const useProjectSpecs = (project: Project.Project): Spec.Spec[] => {
  const [specs] = useObject(project, 'specs');
  return useRefTargets(specs ?? EMPTY).filter(Spec.instanceOf);
};

const EMPTY: readonly Ref.Ref<Spec.Spec>[] = [];

/** The project's specs with the specs they cite nested beneath them, in the order its spec picker lists them. */
export const useProjectSpecTree = (project: Project.Project): SpecTreeEntry[] => {
  const specs = useProjectSpecs(project);
  const nesting = useSpecNesting(specs);
  return useMemo(() => specTree(specs, nesting), [specs, nesting]);
};

/** The spec the project's Specs tab shows: the reader's pick at any depth, else the project's first. */
export const useSelectedSpec = (project: Project.Project): Spec.Spec | undefined => {
  const tree = useProjectSpecTree(project);
  const { spec: selectedId } = useViewState(ProjectView.aspect, project.id);
  return tree.find(({ spec }) => spec.id === selectedId)?.spec ?? tree[0]?.spec;
};

/** Shows `spec`, one of the project's or one nested beneath them, on the project's Specs tab. */
export const useSelectSpec = (project: Project.Project) => {
  const { update } = useViewStateActions(ProjectView.aspect, project.id);
  return useCallback((spec: Spec.Spec) => update((prev) => ({ ...prev, tab: 'spec', spec: spec.id })), [update]);
};

/** How `specs` nest by citation, following their texts. */
export const useSpecNesting = (specs: readonly Spec.Spec[]): SpecNesting => {
  const ids = specs.map(({ id }) => id).join(',');
  // Keyed by ids: the list is a new array each render.
  const atom = useMemo(() => Atom.make((get) => readNesting(specs, get)), [ids]);
  return useAtomValue(atom);
};
