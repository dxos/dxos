//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { type ComponentType, type PropsWithChildren } from 'react';

import { type ViewPlace, type ViewportProps } from '@dxos/react-ui-canvas';

import { type CameraOps, type Dimension, type DimensionContext } from '../config.ts';
import { createViewState } from '../store.ts';
import { type EditorNavigation, useSceneLook } from './context.ts';
import { keep } from './host.ts';

export type ViewDimensionOptions<C> = {
  /** Draws the scene from the editor's state and reports its gestures. */
  Viewport: ComponentType<ViewportProps<C>>;
  /** The camera bar's maths, since the viewport moves no camera of its own. */
  camera: CameraOps<C>;
};

/**
 * A dimension whose viewport holds no state of its own (3D, a test viewport): the selection, tool and drill path are
 * atoms here, and the camera bar sets a camera from `camera`'s maths.
 */
export const createViewDimension =
  <C,>({ Viewport: DimensionViewport, camera: ops }: ViewDimensionOptions<C>) =>
  ({ registry, document, camera: host, preview, setMenu }: DimensionContext<C>): Dimension => {
    const view = createViewState(registry);
    const { atoms } = document;
    // A picture's zoom is its own: the host's camera is where the viewer left the article, which a picture must not move.
    const pictureCamera = keep<C | undefined>(undefined);
    const viewer = Atom.keepAlive(Atom.make((get) => (get(atoms.picture) ? get(pictureCamera) : get(host.host))));
    // The camera on screen can be one the viewport chose itself (a fit on open) that the host never stored; the buttons
    // zoom from it. Kept outside the atoms so a pan does not re-render the editor each frame; only its percent is an atom.
    let onScreen: C | undefined;
    let size = { width: 0, height: 0 };
    const shownPercent = keep<number | undefined>(undefined);
    const zoomable = Atom.keepAlive(
      Atom.make(
        (get) =>
          (get(viewer) ?? get(host.authored)) !== undefined &&
          get(host.authored) !== undefined &&
          (get(atoms.picture) || get(atoms.host).camera),
      ),
    );
    const percent = Atom.keepAlive(
      Atom.make((get) => {
        const current = get(viewer) ?? get(host.authored);
        const authored = get(host.authored);
        return get(shownPercent) ?? (current && authored ? ops.percent(current, authored) : undefined);
      }),
    );
    const setCamera = (camera: C) =>
      registry.get(atoms.picture) ? registry.set(pictureCamera, camera) : host.report(camera);
    // A drill into a composite's parts is the composite opened on its own, as 2D isolates it.
    const place = Atom.keepAlive(
      Atom.make((get): ViewPlace => {
        const editing = get(view.atoms.editing);
        const { layouts } = get(atoms.document);
        const at = editing.findIndex((id) => layouts.find((layout) => layout.id === id)?.kind === 'composite');
        const root = get(atoms.rootLayout);
        return at >= 0
          ? { path: editing.slice(at), isolate: editing[at] }
          : { path: editing.length > 0 ? [...editing] : root === undefined ? [] : [root] };
      }),
    );
    const navigation: EditorNavigation = {
      atoms: { path: view.atoms.editing, place, zoomable, percent },
      commands: {
        open: view.open,
        openPlace: ({ path, isolate }, select = []) => {
          const root = registry.get(atoms.rootLayout);
          view.open(isolate === undefined || root === undefined ? path : [root, ...path]);
          view.select(select);
        },
        fit: () => {
          const current = registry.get(viewer) ?? registry.get(host.authored);
          const open = registry.get(atoms.layout);
          registry.get(zoomable) &&
            current &&
            open &&
            setCamera(ops.fit(current, registry.get(atoms.document), open, size));
        },
        actual: () => {
          const authored = registry.get(host.authored);
          const open = registry.get(atoms.layout);
          registry.get(zoomable) &&
            authored &&
            setCamera(open ? ops.reset(authored, registry.get(atoms.document), open, size) : authored);
        },
        zoomBy: (factor) => {
          const current = onScreen ?? registry.get(viewer) ?? registry.get(host.authored);
          registry.get(zoomable) && current && setCamera(ops.zoom(current, 1 / factor, size));
        },
      },
    };
    const viewCamera = (next: C) => {
      onScreen = next;
      const authored = registry.get(host.authored);
      authored !== undefined && registry.set(shownPercent, ops.percent(next, authored));
    };
    // Out here, not inline in the viewport: the React compiler hoists a callback over closure values out of the factory.
    const openMenu = (at: { x: number; y: number }, kind: 'element' | 'canvas') => setMenu({ at, kind });
    const resize = (next: { width: number; height: number }) => {
      size = next;
    };

    const Viewport = ({ children }: PropsWithChildren) => {
      const { display } = useSceneLook('SceneEditor.Viewport');
      const shown = useAtomValue(atoms.shown);
      const scene = useAtomValue(atoms.scene);
      const path = useAtomValue(view.atoms.editing);
      const selection = useAtomValue(view.atoms.selection);
      const tool = useAtomValue(view.atoms.tool);
      const face = useAtomValue(view.atoms.face);
      const readonly = useAtomValue(atoms.readonly);
      const picture = useAtomValue(atoms.picture);
      const offers = useAtomValue(atoms.host);
      const camera = useAtomValue(viewer);
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
          camera={camera}
          onSelect={view.select}
          onToolChange={view.setTool}
          onIntent={document.commands.intent}
          onModelIntent={offers.model ? document.commands.modelIntent : undefined}
          onTransaction={document.commands.transaction}
          onPreview={preview}
          onEdit={view.open}
          onContextMenu={openMenu}
          onFaceChange={view.setFace}
          onCameraChange={editing && offers.camera ? host.report : undefined}
          onViewCamera={viewCamera}
          onResize={resize}
        >
          {children}
        </DimensionViewport>
      );
    };
    Viewport.displayName = 'SceneEditor.ViewViewport';

    const Root: Dimension['Root'] = ({ Frame, children }) => (Frame ? <Frame>{children}</Frame> : <>{children}</>);
    Root.displayName = 'SceneEditor.ViewRoot';

    return {
      navigation,
      selection: {
        atoms: { selection: view.atoms.selection, face: view.atoms.face },
        commands: { select: view.select, setFace: view.setFace },
      },
      tools: { atoms: { tool: view.atoms.tool }, commands: { setTool: view.setTool } },
      Root,
      Viewport,
    };
  };
