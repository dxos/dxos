//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import type * as Project from '@dxos/compute/Project';
import { Annotation, Ref } from '@dxos/echo';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import { Repo } from '@dxos/types';

import { CodeNamespace } from '../namespace.ts';

const SOFTWARE_ORDER = 10;

const repositories = Atom.family((project: Project.Project) =>
  Atom.writable(
    (get): readonly Ref.Ref<Repo.Repo>[] =>
      Option.getOrElse(get(Annotation.atom(project, Repo.RepositoriesAnnotation)), () => []),
    (_ctx, value: readonly Ref.Ref<Repo.Repo>[] | undefined) => Repo.setRepositories(project, value ?? []),
  ),
);

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(ProjectCapabilities.ConfigGroup, {
      id: 'software',
      label: ['software-config.label', { ns: CodeNamespace.key }],
      order: SOFTWARE_ORDER,
      fields: [
        {
          key: 'repositories',
          schema: Schema.Array(Ref.Ref(Repo.Repo)).annotate({
            title: 'Repositories',
            description: 'Checked out for coding agents that run in the cloud; the first is where a session starts.',
          }),
          value: repositories,
        },
      ],
    }),
  ),
);
