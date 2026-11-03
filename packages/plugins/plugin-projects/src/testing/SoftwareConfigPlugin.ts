//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import type * as Project from '@dxos/compute/Project';
import { Annotation, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Repo } from '@dxos/types';

import { ProjectCapabilities } from '#types';

const repositories = Atom.family((project: Project.Project) =>
  Atom.writable(
    (get): readonly Ref.Ref<Repo.Repo>[] =>
      Option.getOrElse(get(Annotation.atom(project, Repo.RepositoriesAnnotation)), () => []),
    (_ctx, value: readonly Ref.Ref<Repo.Repo>[] | undefined) => Repo.setRepositories(project, value ?? []),
  ),
);

const Software = Capability.inlineModule('SoftwareConfig', { provides: [ProjectCapabilities.ConfigGroup] }, () =>
  Effect.succeed([
    Capability.contribute(ProjectCapabilities.ConfigGroup, {
      id: 'software',
      label: 'Software',
      fields: [
        {
          key: 'repositories',
          schema: Schema.Array(Ref.Ref(Repo.Repo)).annotate({ title: 'Repositories' }),
          value: repositories,
        },
      ],
    }),
  ]),
);

/** Stands in for a plugin other than plugin-projects contributing a config group. */
export const make = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.projects.testing.softwareConfig'),
    name: 'Software config',
  }),
).pipe(Plugin.addModule(Software), Plugin.make);
