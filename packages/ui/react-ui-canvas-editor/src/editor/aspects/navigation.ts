//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { type CameraMove, type CameraRequest } from '@dxos/react-ui-canvas';

import { type EditorDocument, type EditorNavigation } from './context.ts';
import { type AspectOptions, keep, setChanged } from './host.ts';

/** How far one camera-bar zoom step moves the camera, in both dimensions. */
export const ZOOM_STEP = 1.25;

/**
 * Where the view is: the drill path, and this viewer's camera, which the camera bar moves (never the scene's authored
 * camera). The typed camera stays here; the viewport reads it through `camera`.
 */
export const createNavigationAspect = <C>(
  { registry, config, latest, store }: AspectOptions<C>,
  document: EditorDocument,
) => {
  const { atoms } = document;
  const initial = latest.current.props;
  const host = { camera: keep(initial.camera), authored: keep(initial.authoredCamera) };
  // A picture's zoom is its own: the host's camera is where the viewer left the article, which a picture must not move.
  const pictureCamera = keep<C | undefined>(undefined);
  const viewer = Atom.keepAlive(Atom.make((get) => (get(atoms.picture) ? get(pictureCamera) : get(host.camera))));
  // The camera on screen can be one the viewport chose itself (a fit on open) that the host never stored; the buttons
  // zoom from it. Kept outside the atoms so a pan does not re-render the editor each frame; only its percent is an atom.
  let onScreen: C | undefined;
  let size = { width: 0, height: 0 };
  const shownPercent = keep<number | undefined>(undefined);
  const cameraRequest = keep<CameraRequest | undefined>(undefined);
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
      return get(shownPercent) ?? (current && authored ? config.camera.percent(current, authored) : undefined);
    }),
  );
  const setCamera = (camera: C) =>
    registry.get(atoms.picture) ? registry.set(pictureCamera, camera) : latest.current.props.onCameraChange?.(camera);
  const request = (move: CameraMove) =>
    registry.set(cameraRequest, { ...move, id: (registry.get(cameraRequest)?.id ?? 0) + 1 });
  const commands = {
    open: store.open,
    fit: () => {
      const current = registry.get(viewer) ?? registry.get(host.authored);
      const open = registry.get(atoms.layout);
      if (!registry.get(zoomable) || !current) {
        return;
      }
      config.camera.animated
        ? request({ kind: 'fit' })
        : open && setCamera(config.camera.fit(current, registry.get(atoms.document), open, size));
    },
    actual: () => {
      const authored = registry.get(host.authored);
      const open = registry.get(atoms.layout);
      if (!registry.get(zoomable) || !authored) {
        return;
      }
      config.camera.animated
        ? request({ kind: 'actual' })
        : setCamera(open ? config.camera.reset(authored, registry.get(atoms.document), open, size) : authored);
    },
    zoomBy: (factor: number) => {
      const current = onScreen ?? registry.get(viewer) ?? registry.get(host.authored);
      if (!registry.get(zoomable) || !current) {
        return;
      }
      config.camera.animated
        ? request({ kind: 'zoom', factor })
        : setCamera(config.camera.zoom(current, 1 / factor, size));
    },
  };
  const viewCamera = (next: C) => {
    onScreen = next;
    const authored = registry.get(host.authored);
    authored !== undefined && registry.set(shownPercent, config.camera.percent(next, authored));
  };
  const resize = (next: { width: number; height: number }) => {
    size = next;
  };
  const reportCamera = (camera: C) => latest.current.props.onCameraChange?.(camera);

  const aspect: EditorNavigation = { atoms: { path: store.atoms.editing, zoomable, percent }, commands };
  const sync = () => {
    const { props } = latest.current;
    setChanged(registry, host.camera, props.camera);
    setChanged(registry, host.authored, props.authoredCamera);
  };
  /** What the viewport reads and reports of the typed camera. */
  const camera = { viewer, request: cameraRequest, viewCamera, resize, report: reportCamera };
  return { aspect, sync, camera };
};
