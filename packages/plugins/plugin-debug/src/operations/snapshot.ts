//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';

import { DebugOperation } from '#types';

type Translate = (label: unknown) => string | undefined;

/** Best-effort localization: an i18n tuple degrades to its key when no translator is active. */
const makeTranslate =
  (translator: { t: (key: string, options?: unknown) => string } | undefined): Translate =>
  (label) => {
    if (typeof label === 'string') {
      return label;
    }
    if (Array.isArray(label) && typeof label[0] === 'string') {
      return translator ? translator.t(label[0], label[1]) : label[0];
    }
    return undefined;
  };

/** ECHO objects summarize to identity — a snapshot must be O(planks), never O(space). */
const summarizeSubject = (data: unknown) => {
  if (data == null || typeof data !== 'object') {
    return undefined;
  }
  if (Obj.isObject(data)) {
    return {
      dxn: String(Obj.getURI(data)),
      typename: Obj.getTypename(data),
      name: Obj.getLabel(data),
    };
  }
  if ('id' in data && typeof data.id === 'string') {
    return { id: data.id };
  }
  return undefined;
};

const OPERATION_DXN = /dxn:[^/]+/;

/** Flattens the node's actions with one level of group expansion — what a menu would show. */
const collectActions = (
  graph: Parameters<typeof AppGraph.getActions>[0],
  translate: Translate,
  nodeId: string,
): { id: string; label?: string; icon?: string; disabled?: boolean; operation?: string; group?: boolean }[] => {
  const out: ReturnType<typeof collectActions> = [];
  const walk = (items: readonly AppGraphNode.Node[], depth: number) => {
    for (const item of items) {
      const group = AppGraphNode.isActionGroup(item);
      const properties = item.properties ?? {};
      out.push({
        id: item.id,
        label: translate(properties.label),
        icon: typeof properties.icon === 'string' ? properties.icon : undefined,
        disabled: typeof properties.disabled === 'boolean' ? properties.disabled : undefined,
        operation: item.id.match(OPERATION_DXN)?.[0],
        group: group ? true : undefined,
      });
      if (group && depth < 1) {
        walk(AppGraph.getActions(graph, item.id), depth + 1);
      }
    }
  };
  walk(AppGraph.getActions(graph, nodeId), 0);
  return out;
};

/** Interim surface source until the surface registry (INTROSPECTION.md §3.2): dev builds wrap every mounted surface in `<dx-surface>`. */
const collectSurfaces = () => {
  if (typeof document === 'undefined') {
    return [];
  }
  return Array.from(document.querySelectorAll('dx-surface')).map((el) => ({
    id: el.getAttribute('data-id') ?? undefined,
    role: el.getAttribute('data-role') ?? undefined,
    component: el.getAttribute('data-component') ?? undefined,
  }));
};

const handler: Operation.WithHandler<typeof DebugOperation.Snapshot> = DebugOperation.Snapshot.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const manager = yield* Plugin.Service;
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      // Each source is optional: the snapshot degrades per-section rather than failing when a
      // contributing plugin (deck, graph, attention) is not active on this host.
      const layoutAtom = yield* Capability.getOption(AppCapabilities.Layout);
      const graphBuilder = yield* Capability.getOption(AppCapabilities.AppGraph);
      const translator = yield* Capability.getOption(AppCapabilities.Translator);
      const attention = yield* Capability.getOption(AttentionCapabilities.Attention);

      const translate = makeTranslate(Option.getOrUndefined(translator));
      const layout = Option.getOrUndefined(Option.map(layoutAtom, (atom) => registry.get(atom)));
      const graph = Option.getOrUndefined(Option.map(graphBuilder, (builder) => builder.graph));

      const planks = (layout?.active ?? []).map((id) => {
        const node = graph ? Option.getOrUndefined(AppGraph.getNode(graph, id)) : undefined;
        return {
          id,
          label: node ? translate(node.properties?.label) : undefined,
          type: node?.type,
          subject: node ? summarizeSubject(node.data) : undefined,
          actions: graph ? collectActions(graph, translate, id) : [],
        };
      });

      const activeModules = new Set(manager.getActive());
      const plugins = manager.getPlugins();

      return {
        layout: layout && {
          mode: layout.mode,
          sidebarOpen: layout.sidebarOpen,
          complementarySidebarOpen: layout.complementarySidebarOpen,
          dialogOpen: layout.dialogOpen,
          workspace: layout.workspace,
          active: layout.active,
          inactive: layout.inactive,
          scrollIntoView: layout.scrollIntoView,
        },
        attention: Option.getOrUndefined(attention)?.getCurrent().slice() ?? [],
        planks,
        surfaces: collectSurfaces(),
        plugins: {
          installed: plugins.length,
          enabled: manager.getEnabled().length,
          active: plugins.filter((plugin) => plugin.modules.some((module) => activeModules.has(module.id))).length,
        },
      };
    }),
  ),
);

export default handler;
