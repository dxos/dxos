//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Plugin, type Plugin as PluginNS } from '@dxos/app-framework';
import { AppActivationEvents, AppCapabilities, AppNode, AppNodeMatcher } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Filter, Type } from '@dxos/echo';
import { AtomQuery, AtomRef } from '@dxos/echo-atom';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';

import { meta } from '#meta';
import { CodeProject } from '#types';

import {
  CODE_PROJECTS_SECTION_TYPE,
  CODE_PROJECT_BUILD_TYPE,
  CODE_PROJECT_SPEC_TYPE,
  PLUGIN_SPEC_TYPE,
} from '../constants';
import { getCodeProjectBuildId, getCodeProjectSpecId, getCodeProjectsSectionId } from '../paths';
import { makePluginSpecSubject } from '../plugin-spec';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Fire the asset-contribution event so each plugin's `addPluginAssetModule`
    // has activated by the time the graph queries the registry. The connector
    // below reads contributions live (via `capabilities.getAll`) so that
    // plugins enabled later in the session also get spec nodes.
    yield* Plugin.activate(AppActivationEvents.SetupPluginAssets);
    const capabilities = yield* Capability.Service;
    const resolveSpecContent = (pluginId: string, specPath: string): string | undefined =>
      capabilities
        .getAll(AppCapabilities.PluginAsset)
        .find((entry) => entry.pluginId === pluginId && entry.path === specPath)?.content;

    const extensions = yield* Effect.all([
      // Per-plugin `spec` child node, attached to the registry's
      // `org.dxos.plugin` nodes when the plugin declares a bundled MDL via
      // `Plugin.Meta.spec` (a relative path inside the published package)
      // and the content can be resolved from the eager glob above. The path
      // `${getPluginPath(id)}/spec` is the contract used by plugin-registry
      // to dispatch `LayoutOperation.Open` and to gate the "View
      // specification" button — when this extension isn't registered (i.e.
      // plugin-code isn't enabled) or the spec content can't be resolved,
      // the node is absent and the button stays hidden.
      GraphBuilder.createExtension({
        id: 'plugin-spec',
        match: NodeMatcher.whenNodeType('org.dxos.plugin'),
        connector: (node) => {
          const plugin = node.data as PluginNS.Plugin;
          const { id, name, spec } = plugin.meta;
          if (!spec) {
            return Effect.succeed([]);
          }
          const content = resolveSpecContent(id, spec);
          if (!content) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            Node.make({
              id: 'spec',
              type: PLUGIN_SPEC_TYPE,
              data: makePluginSpecSubject({ pluginId: id, name, content }),
              properties: {
                label: ['plugin-spec.label', { ns: meta.id }],
                icon: 'ph--file-code--regular',
                disposition: 'hidden',
              },
            }),
          ]);
        },
      }),

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
              position: 'first',
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
                type: Type.getTypename(CodeProject.CodeProject),
                data: project,
                properties: {
                  label: project.name ?? ['object-name.placeholder', { ns: Type.getTypename(CodeProject.CodeProject) }],
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
                      icon: 'ph--app-window--regular',
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
