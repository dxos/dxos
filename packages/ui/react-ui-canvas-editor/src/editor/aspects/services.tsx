//
// Copyright 2026 DXOS.org
//

import type * as Registry from 'effect/reactivity/AtomRegistry';

import { findLayout } from '@dxos/scene';

import { type DimensionConfig } from '../config.ts';
import { createEditorStore, withoutRemoved } from '../store.ts';
import { createCommandsAspect } from './commands.ts';
import { type SceneEditorServices } from './context.ts';
import { createDocumentAspect } from './document.ts';
import { type SceneEditorLatest, keep, setChanged } from './host.ts';
import { createTimeAspect } from './time.ts';

/**
 * The editor's services for `config`, built once from one aspect module each (DESIGN.md §13.1), the dimension's
 * Navigation, Selection and Tools among them: the host's values that change with each edit are atoms `sync` sets after
 * a render, and every command reads them, and the host's callbacks, when it runs.
 */
export const createSceneEditorServices = <C,>(
  registry: Registry.AtomRegistry,
  config: DimensionConfig<C>,
  latest: { readonly current: SceneEditorLatest<C> },
): { services: SceneEditorServices; sync: () => void } => {
  const { create, ...editorConfig } = config;
  const store = createEditorStore(registry, { onIntent: (layout, edit) => document.commands.intent(layout, edit) });
  const options = { registry, config, latest, store };
  const time = createTimeAspect(options);
  const { aspect: document, sync: syncDocument } = createDocumentAspect(options, {
    editorConfig,
    time: time.aspect,
    // Read once the dimension below is built: the open layout is the last of its drill path.
    path: () => dimension.navigation.atoms.path,
  });
  const initial = latest.current.props;
  const camera = {
    host: keep(initial.camera),
    authored: keep(initial.authoredCamera),
    shared: keep(initial.sharedCamera),
  };
  const dimension = create({
    registry,
    document,
    camera: {
      ...camera,
      report: (next) => latest.current.props.onCameraChange?.(next),
      share: (next) => latest.current.props.onSharedCameraChange?.(next),
    },
    preview: store.preview,
    setMenu: store.setMenu,
  });
  const { aspect: commands } = createCommandsAspect(options, {
    document,
    selection: dimension.selection,
    tools: dimension.tools,
    dimension,
  });

  const services: SceneEditorServices = {
    registry,
    config: editorConfig,
    document,
    navigation: dimension.navigation,
    selection: dimension.selection,
    tools: dimension.tools,
    commands,
    time: time.aspect,
    Root: dimension.Root,
    Viewport: dimension.Viewport,
    shortcuts: dimension.shortcuts,
    aids: dimension.aids,
    inspector: dimension.inspector,
    MenuLead: dimension.MenuLead,
  };
  const sync = () => {
    const before = registry.get(document.atoms.document);
    syncDocument();
    const after = registry.get(document.atoms.document);
    const open = registry.get(document.atoms.layout);
    if (after !== before && open !== undefined) {
      // An element an undo or a peer took out of the open layout would otherwise stay selected, and a later one of
      // its id be drawn selected.
      const selection = registry.get(dimension.selection.atoms.selection);
      const kept = withoutRemoved(selection, findLayout(before, open), findLayout(after, open));
      kept.length === selection.length || dimension.selection.commands.select(kept);
    }
    time.sync();
    const { props } = latest.current;
    setChanged(registry, camera.host, props.camera);
    setChanged(registry, camera.authored, props.authoredCamera);
    setChanged(registry, camera.shared, props.sharedCamera);
  };
  return { services, sync };
};
