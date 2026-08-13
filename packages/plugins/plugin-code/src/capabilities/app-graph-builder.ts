//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import type * as PluginNS from '@dxos/app-framework/Plugin';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { isSpace } from '@dxos/client/echo';
import { Filter, Type } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { CodeProject } from '#types';

import {
  CODE_PROJECT_BUILD_TYPE,
  CODE_PROJECT_SPEC_TYPE,
  CODE_PROJECTS_SECTION_TYPE,
  PLUGIN_SPEC_TYPE,
} from '../constants';
import { getCodeProjectBuildId, getCodeProjectSpecId, getCodeProjectsSectionId } from '../paths';
import { makePluginSpecSubject } from '../plugin-spec';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // `addPluginAssetModule` is dependency-mode (declared in `requires`), so every plugin's
    // asset module is already contributed by the time this module runs.
    // Subscribe to the reactive asset atom so the connector re-runs when a
    // plugin enabled later in the session contributes (or removes) its spec.
    const pluginAssetsAtom = yield* Capability.atom(AppCapabilities.PluginAsset);

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
      AppGraphBuilder.createExtension({
        id: 'pluginSpec',
        url: { key: 'spec', kind: 'item', path: [] },
        match: GraphNodeMatcher.whenNodeType('org.dxos.plugin'),
        connector: (node, get) => {
          const plugin = node.data as PluginNS.Plugin;
          const { key: slug, name, spec } = plugin.meta.profile;
          if (!spec) {
            return Effect.succeed([]);
          }
          const content = get(pluginAssetsAtom).find(
            (entry) => entry.pluginId === slug && entry.path === spec,
          )?.content;
          if (!content) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            AppGraphNode.make({
              id: 'spec',
              type: PLUGIN_SPEC_TYPE,
              data: makePluginSpecSubject({ pluginId: slug, name, content }),
              properties: {
                label: ['plugin-spec.label', { ns: meta.profile.key }],
                icon: 'ph--file-code--regular',
                disposition: 'hidden',
              },
            }),
          ]);
        },
      }),

      // Top-level "Code Projects" section in each space that has at least one CodeProject.
      AppGraphBuilder.createExtension({
        id: 'codeProjectsSection',
        match: AppNodeMatcher.whenSpace,
        connector: (space, get) => {
          const projects = get(space.db.query(Filter.type(CodeProject.CodeProject)).atom);
          if (projects.length === 0) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            AppNode.makeSection({
              id: getCodeProjectsSectionId(),
              type: CODE_PROJECTS_SECTION_TYPE,
              label: ['code-projects-section.label', { ns: meta.profile.key }],
              icon: 'ph--code--regular',
              iconHue: 'indigo',
              space,
              position: Position.first,
            }),
          ]);
        },
      }),

      // Listing of CodeProjects under the section, each with Spec + Build sub-nodes.
      AppGraphBuilder.createExtension({
        id: 'codeProjectListing',
        url: { key: 'code', kind: 'item', path: [getCodeProjectsSectionId()] },
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === CODE_PROJECTS_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const projects = get(space.db.query(Filter.type(CodeProject.CodeProject)).atom);

          return Effect.succeed(
            projects.map((project: CodeProject.CodeProject) => {
              const spec = get(project.spec.atom);
              return AppGraphNode.make({
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
                  AppGraphNode.make({
                    id: getCodeProjectSpecId(),
                    type: CODE_PROJECT_SPEC_TYPE,
                    data: spec ?? null,
                    properties: {
                      label: ['spec.label', { ns: meta.profile.key }],
                      icon: 'ph--file-text--regular',
                      iconHue: 'indigo',
                    },
                  }),
                  AppGraphNode.make({
                    id: getCodeProjectBuildId(),
                    type: CODE_PROJECT_BUILD_TYPE,
                    data: project,
                    properties: {
                      label: ['build.label', { ns: meta.profile.key }],
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

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
