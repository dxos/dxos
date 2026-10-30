//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import {
  type MutableRefObject,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { type Timeline } from '@dxos/animation';
import { type Bounds, type Point, type Size, type ViewId } from '@dxos/scene';

import { type CanvasAtoms, type Drag } from '../../engine/index.ts';
import { type Camera, applyCameraKey, sampleCamera } from '../../model/index.ts';
import { NOMINAL_ZOOM, fitBounds, panBy } from '../../utils/index.ts';
import { type useRegistry } from '../useRegistry.ts';
import { type SceneCamera } from './useSceneCamera.ts';

/** Quiet time after the view's last resize before fit mode refits, so a drag-resize refits once, where it ends. */
const FIT_DEBOUNCE_MS = 150;

/** Quiet time after the camera's last move before `onCameraChange` reports it. */
const CAMERA_SETTLE_MS = 300;

/**
 * The view's display toggles a host may persist: snapping (which draws the grid), the lattice guides, and fit mode
 * (the camera keeps the scene framed until the user pans or zooms).
 */
export type SceneDisplay = { snap: boolean; guides: boolean; fit: boolean };

export type UseSceneViewOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: CanvasAtoms;
  rootRef: RefObject<HTMLDivElement | null>;
  viewport: Size;
  /** Set once the user takes the camera over, which stops the view re-fitting itself. */
  interactedRef: MutableRefObject<boolean>;
  path: ViewId[];
  camera: Camera;
  drag: Drag | undefined;
  timeline: Timeline | undefined;
  time: number;
  /** What Fit frames. */
  fitTarget: Bounds;
  /** Least gap between that frame and each viewport edge, in scene units. */
  inset: number;
  /** Highest zoom a fit reaches; 1:1 (`NOMINAL_ZOOM`) unless the view should enlarge a small scene to fill it. */
  fitZoom?: number;
  /** The `Canvas.Root` props of the same names. */
  initialCamera?: Camera;
  initialDisplay?: Partial<SceneDisplay>;
  onDisplayChange?: (display: SceneDisplay) => void;
  onCameraChange?: (camera: Camera) => void;
  onViewChange?: (view: Bounds) => void;
  refitKey?: string | number;
  refitDuration?: number;
  drift?: Point;
} & Pick<SceneCamera, 'setCamera' | 'animateTo' | 'isAnimating'>;

export type SceneView = {
  /** Fit mode: the camera keeps the scene framed until the user pans or zooms. */
  fitting: Atom.Atom<boolean>;
  /** Enters fit mode, which the caller follows by framing the scene. */
  enterFit: () => void;
  exitFit: () => void;
  /** A camera track drives the camera as the clock moves. */
  hasCameraTrack: boolean;
};

/**
 * The camera's own life between gestures: fit mode, the camera a host restores, a refit the host asks for, drift, a
 * camera track, and what the host hears of the view.
 */
export const useSceneView = ({
  registry,
  atoms,
  rootRef,
  viewport,
  interactedRef,
  path,
  camera,
  drag,
  timeline,
  time,
  fitTarget,
  inset,
  fitZoom = NOMINAL_ZOOM,
  initialCamera,
  initialDisplay,
  onDisplayChange,
  onCameraChange,
  onViewChange,
  refitKey,
  refitDuration,
  drift,
  setCamera,
  animateTo,
  isAnimating,
}: UseSceneViewOptions): SceneView => {
  const snapEnabled = useAtomValue(atoms.snap);
  const guides = useAtomValue(atoms.guides);
  const sceneId = path[path.length - 1];
  const measured = viewport.width > 0 && viewport.height > 0;
  // Fit mode keeps the current scene framed as the view resizes or opens another scene, until the user pans or zooms.
  // A view opens fitted, in fit mode, unless the host restores it with fit mode off (and then its camera).
  // An atom rather than state, so the camera bar reads it without the root's context changing with it.
  const [fittingAtom] = useState(() => Atom.keepAlive(Atom.make<boolean>(initialDisplay?.fit ?? true)));
  const fitting = useAtomValue(fittingAtom);
  const setFitting = useCallback((value: boolean) => registry.set(fittingAtom, value), [registry, fittingAtom]);
  const exitFit = useCallback(() => setFitting(false), [setFitting]);
  // A refit the host asks for frames the scene even after the user took the camera over: it re-enters fit mode, and
  // the fit below then animates to the new frame.
  const refitKeyRef = useRef(refitKey);
  useEffect(() => {
    if (refitKeyRef.current !== refitKey) {
      refitKeyRef.current = refitKey;
      setFitting(true);
    }
  }, [refitKey, setFitting]);
  // Seeded once per atoms, before the host hears of any change, so restoring the toggles reports nothing back.
  const reportedRef = useRef<SceneDisplay | undefined>(undefined);
  useLayoutEffect(() => {
    if (initialDisplay?.snap !== undefined) {
      registry.set(atoms.snap, initialDisplay.snap);
    }
    if (initialDisplay?.guides !== undefined) {
      registry.set(atoms.guides, initialDisplay.guides);
    }
    reportedRef.current = { snap: registry.get(atoms.snap), guides: registry.get(atoms.guides), fit: fitting };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atoms]);
  useEffect(() => {
    const reported = reportedRef.current;
    if (
      !onDisplayChange ||
      !reported ||
      (reported.snap === snapEnabled && reported.guides === guides && reported.fit === fitting)
    ) {
      return;
    }
    reportedRef.current = { snap: snapEnabled, guides, fit: fitting };
    onDisplayChange({ snap: snapEnabled, guides, fit: fitting });
  }, [onDisplayChange, snapEnabled, guides, fitting]);
  // What the last fit framed: the scene and the view size. Only a resize refits; an edit to the scene does not, so the
  // camera holds still under someone editing.
  const fitKey = `${viewport.width}x${viewport.height}:${refitKey ?? ''}`;
  const fittedRef = useRef<{ scene: ViewId; key: string } | undefined>(undefined);
  useLayoutEffect(() => {
    if (initialCamera && !fitting) {
      setCamera(initialCamera);
    }
    // Only the camera the view opened with is restored; later values are the host echoing ours back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCamera]);

  // In fit mode the first fit lands before the first paint; opening another scene animates to its frame, and a resize
  // animates to the new fit once the view has stopped changing size for `FIT_DEBOUNCE_MS`.
  useLayoutEffect(() => {
    if (fitting && measured && !fittedRef.current) {
      // Measured now, not from the observed size: a docked inspector mounting in the same frame narrows the canvas
      // before the observer reports it, and fitting the stale size would animate a refit straight after load.
      const element = rootRef.current;
      const size = element ? { width: element.clientWidth, height: element.clientHeight } : viewport;
      fittedRef.current = { scene: sceneId, key: `${size.width}x${size.height}:${refitKey ?? ''}` };
      setCamera(fitBounds(fitTarget, size, inset, fitZoom));
    }
  }, [fitting, measured, viewport, fitTarget, inset, fitZoom, setCamera, sceneId, refitKey]);
  // Until the size has held still for `FIT_DEBOUNCE_MS` the view is still opening (a docked panel mounts once its
  // sections register), so a resize refits in the same frame rather than sliding the drawing across after load.
  const settledRef = useRef(false);
  useLayoutEffect(() => {
    const fitted = fittedRef.current;
    if (!fitting || !measured || !fitted || settledRef.current || fitted.scene !== sceneId || fitted.key === fitKey) {
      return;
    }
    fittedRef.current = { scene: sceneId, key: fitKey };
    setCamera(fitBounds(fitTarget, viewport, inset, fitZoom));
  }, [fitting, measured, sceneId, fitKey, fitTarget, viewport, inset, fitZoom, setCamera]);
  useEffect(() => {
    if (!fittedRef.current || settledRef.current) {
      return;
    }
    const timeout = setTimeout(() => {
      settledRef.current = true;
    }, FIT_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [fitting, measured, fitKey]);
  // Keyed on values, not identities: the scene and the camera helpers are rebuilt on unrelated renders, and each rerun
  // would restart the debounce before it fires. The latest helpers and frame are read when it does.
  const fitLatestRef = useRef({
    animateTo,
    isAnimating,
    frame: () => fitBounds(fitTarget, viewport, inset, fitZoom),
  });
  fitLatestRef.current = { animateTo, isAnimating, frame: () => fitBounds(fitTarget, viewport, inset, fitZoom) };
  useEffect(() => {
    const fitted = fittedRef.current;
    if (!fitting || !measured || !fitted) {
      return;
    }
    // Another scene opened: frame it now.
    if (fitted.scene !== sceneId) {
      fittedRef.current = { scene: sceneId, key: fitKey };
      fitLatestRef.current.animateTo(fitLatestRef.current.frame());
      return;
    }
    if (fitted.key === fitKey) {
      return;
    }
    // A resize refits once it settles; an animation in flight (a drill) finishes first, since `animateTo` would cancel
    // it before it lands.
    let timeout: ReturnType<typeof setTimeout>;
    // A refit the host asked for starts at once and takes its time; a resize waits for the size to settle.
    const asked = fitted.key.slice(fitted.key.indexOf(':') + 1) !== String(refitKey ?? '');
    const fit = () => {
      if (fitLatestRef.current.isAnimating()) {
        timeout = setTimeout(fit, FIT_DEBOUNCE_MS);
        return;
      }
      fittedRef.current = { scene: sceneId, key: fitKey };
      fitLatestRef.current.animateTo(fitLatestRef.current.frame(), undefined, asked ? refitDuration : undefined);
    };
    timeout = setTimeout(fit, asked ? 0 : FIT_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [fitting, measured, sceneId, fitKey, refitDuration]);
  useEffect(() => {
    if (onViewChange && viewport.width > 0) {
      onViewChange({
        x: -camera.x,
        y: -camera.y,
        width: viewport.width / camera.zoom,
        height: viewport.height / camera.zoom,
      });
    }
  }, [onViewChange, camera, viewport]);
  // The pan advances with the view's clock rather than a loop of its own (ANIMATION.md §2.1): while drifting the clock
  // plays, and each tick moves the camera by the velocity times the time it advanced. The velocity is read from a ref,
  // so a change of speed neither restarts anything nor loses a frame.
  const driftRef = useRef<Point>({ x: 0, y: 0 });
  driftRef.current = { x: drift?.x ?? 0, y: drift?.y ?? 0 };
  const drifting = driftRef.current.x !== 0 || driftRef.current.y !== 0;
  useEffect(() => {
    if (!drifting) {
      return;
    }
    exitFit();
    const started = !registry.get(atoms.clock.playing);
    registry.set(atoms.clock.playing, true);
    let last = registry.get(atoms.clock.time);
    const unsubscribe = registry.subscribe(atoms.clock.time, (time) => {
      const seconds = time - last;
      last = time;
      if (seconds > 0) {
        // The camera offsets the content, so the view moves right as it moves left.
        const { x, y } = driftRef.current;
        setCamera((camera) => panBy(camera, { x: -x * seconds, y: -y * seconds }));
      }
    });
    return () => {
      unsubscribe();
      if (started) {
        registry.set(atoms.clock.playing, false);
      }
    };
  }, [drifting, exitFit, setCamera, registry, atoms.clock]);

  // A camera track drives the camera as the clock moves (ANIMATION.md §5.5); keys hold the view's centre, so the same
  // point is framed whatever the viewport's size.
  const hasCameraTrack = sampleCamera(timeline, 0) !== undefined;
  useLayoutEffect(() => {
    const key = sampleCamera(timeline, time);
    if (key && measured) {
      setCamera((camera) => applyCameraKey(camera, key, viewport.width, viewport.height));
    }
  }, [timeline, time, measured, viewport.width, viewport.height, setCamera]);
  useEffect(() => {
    if (hasCameraTrack) {
      exitFit();
    }
  }, [hasCameraTrack, exitFit]);

  // Dragging the canvas takes the camera over.
  useEffect(() => {
    if (drag?.kind === 'pan') {
      exitFit();
      if (hasCameraTrack) {
        registry.set(atoms.clock.playing, false);
      }
    }
  }, [drag?.kind, exitFit, hasCameraTrack, registry, atoms.clock]);
  // Reported after a quiet beat, so a wheel gesture or an animation is persisted once, where it ends.
  const atRoot = path.length === 1;
  useEffect(() => {
    if (!onCameraChange || !atRoot || !interactedRef.current) {
      return;
    }
    const timeout = setTimeout(() => onCameraChange(camera), CAMERA_SETTLE_MS);
    return () => clearTimeout(timeout);
  }, [onCameraChange, atRoot, camera]);

  const enterFit = useCallback(() => {
    setFitting(true);
    fittedRef.current = { scene: sceneId, key: fitKey };
  }, [setFitting, sceneId, fitKey]);

  return { fitting: fittingAtom, enterFit, exitFit, hasCameraTrack };
};
