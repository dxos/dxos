//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react';
import * as Atom from 'effect/reactivity/Atom';
import React, { useMemo } from 'react';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as ProjectView from '@dxos/plugin-projects/ProjectView';
import { useViewState } from '@dxos/react-ui-attention';

import { SpecPanel } from '../SpecArticle/SpecPanel.tsx';

export type SpecCompanionProps = {
  /** The spec, or the project whose Specs tab shows one of its specs. */
  companionTo: Spec.Spec | Project.Project;
};

/** A spec's panel of views beside it: beside its own level, or beside the project showing it. */
export const SpecCompanion = ({ companionTo }: SpecCompanionProps) => {
  const spec = useCompanionSpec(companionTo);
  return spec ? <SpecPanel spec={spec} /> : null;
};

/** The spec itself, or the spec its project's Specs tab has picked (the first while none is picked). */
const useCompanionSpec = (subject: Spec.Spec | Project.Project): Spec.Spec | undefined => {
  const project = Obj.instanceOf(Project.Project, subject) ? subject : undefined;
  const { spec: picked } = useViewState(ProjectView.aspect, project?.id);
  const [refs] = useObject(project, 'specs');
  // Through `ref.atom`, which tracks loading, since a snapshot's refs carry no resolver.
  const specs = useAtomValue(
    useMemo(() => Atom.make((get) => (refs ?? []).map((ref) => get(ref.atom)).filter(Spec.instanceOf)), [refs]),
  );
  return Spec.instanceOf(subject) ? subject : (specs.find(({ id }) => id === picked) ?? specs[0]);
};
