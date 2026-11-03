//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import type * as Project from '@dxos/compute/Project';
import { Annotation, Format, Ref } from '@dxos/echo';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import { Repo } from '@dxos/types';

import { ClaudeCapabilities } from '#types';

import { ClaudeNamespace } from '../namespace.ts';

/** Where the group sorts among the Config section's groups, after the project's own. */
const SOFTWARE_ORDER = 10;

/**
 * The project's Software settings: the repositories coding agents check out (the project's `Repo.RepositoriesAnnotation`)
 * and its code folder on this device (this plugin's local state, since a path means nothing on another device; shown
 * only where an agent host exists).
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateAtom = yield* ClaudeCapabilities.State;
    const hostsAtom = yield* Capability.atom(ClaudeCapabilities.AgentHelper);

    const repositories = Atom.family((project: Project.Project) =>
      Atom.writable(
        (get): readonly Ref.Ref<Repo.Repo>[] =>
          Option.getOrElse(get(Annotation.atom(project, Repo.RepositoriesAnnotation)), () => []),
        (_ctx, value: readonly Ref.Ref<Repo.Repo>[] | undefined) => Repo.setRepositories(project, value ?? []),
      ),
    );

    const folder = Atom.family((projectId: string) =>
      Atom.writable(
        (get) => get(stateAtom).repositories?.[projectId],
        (ctx, value: string | undefined) => {
          const { repositories: { [projectId]: _, ...others } = {}, ...state } = ctx.get(stateAtom);
          const path = value?.trim();
          ctx.set(stateAtom, { ...state, repositories: path ? { ...others, [projectId]: path } : others });
        },
      ),
    );

    return Capability.contribute(ProjectCapabilities.ConfigGroup, {
      id: 'software',
      label: ['software-config.label', { ns: ClaudeNamespace.key }],
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
        {
          key: 'folder',
          schema: Schema.optional(
            Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Key)).annotate({
              title: 'Code folder on this device',
              description:
                'Where Claude Code on this computer works; each delegated task gets its own git worktree of it.',
              examples: ['/Users/me/code/project'],
            }),
          ),
          value: (project) => folder(project.id),
          enabled: Atom.make((get) => get(hostsAtom).length > 0),
        },
      ],
    });
  }),
);
