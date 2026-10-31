//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import React, { type PropsWithChildren } from 'react';

import { type DimensionConfig } from '../config.ts';
import { createEditorStore } from '../store.ts';
import { createCommandsAspect } from './commands.ts';
import { type SceneEditorServices, useSceneLook } from './context.ts';
import { createDocumentAspect } from './document.ts';
import { type SceneEditorLatest } from './host.ts';
import { createNavigationAspect } from './navigation.ts';
import { createTimeAspect } from './time.ts';

/**
 * The editor's services for `config`, built once from one aspect module each (DESIGN.md §13.1): the host's values that
 * change with each edit are atoms `sync` sets after a render, and every command reads them, and the host's callbacks,
 * when it runs.
 */
export const createSceneEditorServices = <C,>(
  registry: Registry.AtomRegistry,
  config: DimensionConfig<C>,
  latest: { readonly current: SceneEditorLatest<C> },
): { services: SceneEditorServices; sync: () => void } => {
  const { viewport: DimensionViewport, camera: _camera, ...editorConfig } = config;
  const store = createEditorStore(registry, { onIntent: (layout, edit) => document.commands.intent(layout, edit) });
  const options = { registry, config, latest, store };
  const time = createTimeAspect(options);
  const { aspect: document, sync: syncDocument } = createDocumentAspect(options, { editorConfig, time: time.aspect });
  const { aspect: navigation, sync: syncNavigation, camera } = createNavigationAspect(options, document);
  const { aspect: commands } = createCommandsAspect(options, document);
  const { intent, modelIntent, transaction } = document.commands;

  /** The dimension's viewport, bound to the editor. */
  const Viewport = ({ children }: PropsWithChildren) => {
    const { display } = useSceneLook('SceneEditor.Viewport');
    const shown = useAtomValue(document.atoms.shown);
    const scene = useAtomValue(document.atoms.scene);
    const path = useAtomValue(store.atoms.editing);
    const selection = useAtomValue(store.atoms.selection);
    const tool = useAtomValue(store.atoms.tool);
    const face = useAtomValue(store.atoms.face);
    const readonly = useAtomValue(document.atoms.readonly);
    const picture = useAtomValue(document.atoms.picture);
    const offers = useAtomValue(document.atoms.host);
    const viewer = useAtomValue(camera.viewer);
    const move = useAtomValue(camera.request);
    const editing = !picture;
    return (
      <DimensionViewport
        document={shown}
        scene={scene}
        editing={path.at(-1)}
        path={path}
        selection={selection}
        tool={tool}
        readonly={readonly}
        picture={picture}
        grid={editing && display.grid}
        snap={editing && display.snap}
        axes={editing && (display.axes ?? false)}
        guides={editing && (display.guides ?? false)}
        theme={display.theme}
        face={face}
        // A picture opens framed to fit, until its own zoom bar moves it.
        camera={viewer}
        cameraRequest={move}
        onSelect={store.select}
        onToolChange={store.setTool}
        onIntent={intent}
        onModelIntent={offers.model ? modelIntent : undefined}
        onTransaction={transaction}
        onPreview={store.preview}
        onEdit={store.open}
        onContextMenu={(at, kind) => store.setMenu({ at, kind })}
        onFaceChange={store.setFace}
        onCameraChange={editing && offers.camera ? camera.report : undefined}
        onViewCamera={camera.viewCamera}
        onResize={camera.resize}
      >
        {children}
      </DimensionViewport>
    );
  };
  Viewport.displayName = 'SceneEditor.DimensionViewport';

  const services: SceneEditorServices = {
    registry,
    config: editorConfig,
    document,
    navigation,
    selection: {
      atoms: { selection: store.atoms.selection, face: store.atoms.face },
      commands: { select: store.select, setFace: store.setFace },
    },
    tools: { atoms: { tool: store.atoms.tool }, commands: { setTool: store.setTool } },
    commands,
    time: time.aspect,
    Viewport,
  };
  const sync = () => {
    syncDocument();
    time.sync();
    syncNavigation();
  };
  return { services, sync };
};
