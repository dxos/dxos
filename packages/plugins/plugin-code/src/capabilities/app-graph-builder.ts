//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Filter } from '@dxos/echo';
import { AtomQuery, AtomRef } from '@dxos/echo-atom';
import { GraphBuilder, Node } from '@dxos/plugin-graph';

import { meta } from '#meta';
import { CodeProject } from '#types';

import { CODE_PROJECTS_SECTION_TYPE, CODE_PROJECT_BUILD_TYPE, CODE_PROJECT_SPEC_TYPE } from '../constants';
import { getCodeProjectBuildId, getCodeProjectSpecId, getCodeProjectsSectionId } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // Top-level "Code Projects" section in each space that has at least one CodeProject.
      GraphBuilder.createExtension({
        id: 'code-projects-section',
        match: AppNodeMatcher.whenSpace,
        connector: (space, get) => {
          const projects = get(AtomQuery.make(space.db, Filter.type(CodeProject.CodeProject)));
          if (projects.length === 0) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            AppNode.makeSection({
              id: getCodeProjectsSectionId(),
              type: CODE_PROJECTS_SECTION_TYPE,
              label: ['code-projects-section.label', { ns: meta.id }],
              icon: 'ph--code--regular',
              iconHue: 'indigo',
              space,
              position: 'hoist',
            }),
          ]);
        },
      }),

      // Listing of CodeProjects under the section, each with Spec + Build sub-nodes.
      GraphBuilder.createExtension({
        id: 'code-project-listing',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === CODE_PROJECTS_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const projects = get(AtomQuery.make(space.db, Filter.type(CodeProject.CodeProject)));

          return Effect.succeed(
            projects.map((project: CodeProject.CodeProject) => {
              const spec = get(AtomRef.make(project.spec));
              return Node.make({
                id: project.id,
                type: CodeProject.CodeProject.typename,
                data: project,
                properties: {
                  label: project.name ?? ['object-name.placeholder', { ns: CodeProject.CodeProject.typename }],
                  icon: 'ph--code--regular',
                  iconHue: 'indigo',
                  role: 'branch',
                  project,
                },
                nodes: [
                  Node.make({
                    id: getCodeProjectSpecId(),
                    type: CODE_PROJECT_SPEC_TYPE,
                    data: spec ?? null,
                    properties: {
                      label: ['spec.label', { ns: meta.id }],
                      icon: 'ph--file-text--regular',
                      iconHue: 'indigo',
                    },
                  }),
                  Node.make({
                    id: getCodeProjectBuildId(),
                    type: CODE_PROJECT_BUILD_TYPE,
                    data: project,
                    properties: {
                      label: ['build.label', { ns: meta.id }],
                      icon: 'ph--gear--regular',
                      iconHue: 'indigo',
                    },
                  }),
                ],
              });
            }),
          );
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
