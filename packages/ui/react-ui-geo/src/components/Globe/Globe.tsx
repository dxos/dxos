//
// Copyright 2018 DXOS.org
//

import {
  type GeoProjection,
  selection as d3Selection,
  easeLinear,
  easeSinOut,
  geoMercator,
  geoOrthographic,
  geoPath,
  geoTransverseMercator,
  interpolateNumber,
  transition,
} from 'd3';
import { type ControlPosition } from 'leaflet';
import React, {
  type PropsWithChildren,
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { type Topology } from 'topojson-specification';

import {
  type ThemeMode,
  type ThemedClassName,
  useComposedRefs,
  useControlledState,
  useDynamicRef,
  useThemeContext,
} from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { GlobeContext, type GlobeContextType, type Point, type Vector, useGlobeContext } from '../../hooks';
import { type LatLngLiteral } from '../../types';
import {
  type Features,
  type StyleSet,
  createLayers,
  createRotationTween,
  flyDuration,
  geoToPosition,
  positionToRotation,
  renderLayers,
  timer,
} from '../../util';
import { ActionControls, type ControlProps, ZoomControls, controlPositions } from '../Toolbar';

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute
 */
const defaultStyles: Record<ThemeMode, StyleSet> = {
  light: {
    background: {
      fillStyle: '#EEE',
    },

    water: {
      fillStyle: '#555',
    },

    land: {
      fillStyle: '#999',
    },

    line: {
      strokeStyle: 'darkred',
    },

    point: {
      fillStyle: '#111111',
      strokeStyle: '#111111',
      strokeWidth: 1,
      pointRadius: 0.5,
    },
  },
  dark: {
    background: {
      fillStyle: '#111111',
    },

    water: {
      fillStyle: '#123E6A',
    },

    land: {
      fillStyle: '#032153',
    },

    line: {
      strokeStyle: '#111111',
    },

    point: {
      fillStyle: '#111111',
      strokeStyle: '#111111',
      strokeWidth: 1,
      pointRadius: 0.5,
    },
  },
};

/**
 * Imperative options accepted by GlobeController.flyTo.
 */
export type FlyToOptions = {
  /** Base duration in ms (scales with great-circle distance). */
  duration?: number;
  /** Optional pitch offset applied along the latitude axis of the target. */
  tilt?: number;
  /**
   * Optional per-frame callback fired before the rotation tween advances.
   * Useful for layered animations (e.g. cursor / arc trails in tours).
   * `t` runs 0→1 across the eased duration.
   */
  onTick?: (t: number) => void;
};

export type FlyToTarget = LatLngLiteral & {
  /** Optional zoom factor; interpolated alongside rotation when set. */
  zoom?: number;
};

export type GlobeController = {
  canvas: HTMLCanvasElement;
  projection: GeoProjection;
  /**
   * Animates the globe to the given lat/lng (and optional zoom) along a
   * great-circle arc. Returns a Promise that resolves on completion and
   * rejects if interrupted (e.g. by another flyTo on the same globe).
   */
  flyTo: (target: FlyToTarget, options?: FlyToOptions) => Promise<void>;
  /**
   * Interrupts any in-flight `flyTo` (used by tours when stopped mid-segment).
   */
  cancelFlyTo: () => void;
} & Pick<GlobeContextType, 'zoom' | 'translation' | 'rotation' | 'setZoom' | 'setTranslation' | 'setRotation'>;

export type ProjectionType = 'orthographic' | 'mercator' | 'transverse-mercator';

const projectionMap: Record<ProjectionType, () => GeoProjection> = {
  orthographic: geoOrthographic,
  mercator: geoMercator,
  'transverse-mercator': geoTransverseMercator,
};

const getProjection = (type: GlobeCanvasProps['projection'] = 'orthographic'): GeoProjection => {
  if (typeof type === 'string') {
    const constructor = projectionMap[type] ?? geoOrthographic;
    return constructor();
  }

  return type ?? geoOrthographic();
};

//
// Root
//

const DEFAULT_ZOOM = 1.5;

type GlobeRootProps = Partial<Pick<GlobeContextType, 'center' | 'zoom' | 'translation' | 'rotation'>>;

const GlobeRoot = composable<HTMLDivElement, GlobeRootProps>(
  (
    {
      children,
      center: centerProp,
      zoom: zoomProp = DEFAULT_ZOOM,
      translation: translationProp,
      rotation: rotationProp,
      ...props
    },
    forwardedRef,
  ) => {
    const localRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(localRef, forwardedRef);
    const { width, height } = useResizeDetector<HTMLDivElement>({ targetRef: localRef });

    const [center, setCenter] = useControlledState(centerProp);
    const [zoom, setZoom] = useControlledState(zoomProp);
    const [translation, setTranslation] = useControlledState<Point>(translationProp);
    const [rotation, setRotation] = useControlledState<Vector>(rotationProp);

    return (
      <GlobeContext.Provider
        value={{
          size: { width, height },
          center,
          zoom,
          translation,
          rotation,
          setCenter,
          setZoom,
          setTranslation,
          setRotation,
        }}
      >
        <div {...composableProps(props, { classNames: 'relative dx-container' })} ref={composedRef}>
          {children}
        </div>
      </GlobeContext.Provider>
    );
  },
);

//
// Canvas
//

type GlobeCanvasProps = {
  projection?: ProjectionType | GeoProjection;
  topology?: Topology;
  features?: Features;
  styles?: StyleSet;
};

/**
 * Basic globe renderer.
 * https://github.com/topojson/world-atlas
 */
// TODO(burdon): Move controller to root.
const GlobeCanvas = forwardRef<GlobeController, GlobeCanvasProps>(
  ({ projection: projectionProp, topology, features, styles: stylesProp }, forwardRef) => {
    const { themeMode } = useThemeContext();
    const styles = useMemo(() => stylesProp ?? defaultStyles[themeMode], [stylesProp, themeMode]);

    // Canvas.
    const [canvas, setCanvas] = useState<HTMLCanvasElement>(null);
    const canvasRef = (canvas: HTMLCanvasElement) => setCanvas(canvas);

    // Projection.
    const projection = useMemo(() => getProjection(projectionProp), [projectionProp]);

    // Layers.
    // TODO(burdon): Generate on-the-fly based on what is visible.
    const layers = useMemo(() => {
      return timer(() => createLayers(topology as Topology, features, styles));
    }, [topology, features, styles]);

    // State.
    const { size, center, zoom, translation, rotation, setCenter, setZoom, setTranslation, setRotation } =
      useGlobeContext();
    const zoomRef = useDynamicRef(zoom);

    // Update rotation when the center changes. Preserve current zoom — callers can set zoom
    // independently via the `zoom` prop or `setZoom` on the controller.
    useEffect(() => {
      if (center) {
        setRotation(positionToRotation(geoToPosition(center)));
      }
    }, [center]);

    // Per-instance flyTo plumbing. d3 named transitions are scoped per DOM
    // element and `d3Selection()` returns the documentElement root, so a
    // shared name would let one globe's flyTo interrupt another's. The
    // useId-scoped name keeps each Globe.Canvas's transition isolated.
    const flyToSelection = useMemo(() => d3Selection(), []);
    const flyToTransitionName = `globe-fly-to-${useId()}`;
    useEffect(
      () => () => {
        flyToSelection.interrupt(flyToTransitionName);
      },
      [flyToSelection, flyToTransitionName],
    );

    // External controller.
    const zooming = useRef(false);
    useImperativeHandle<GlobeController, GlobeController>(forwardRef, () => {
      return {
        canvas,
        projection,
        center,
        get zoom() {
          return zoomRef.current;
        },
        translation,
        rotation,
        setCenter,
        setZoom: (state) => {
          if (typeof state === 'function') {
            const is = interpolateNumber(zoomRef.current, state(zoomRef.current));
            // Stop easing if already zooming.
            transition()
              .ease(zooming.current ? easeLinear : easeSinOut)
              .duration(200)
              .tween('scale', () => (t) => setZoom(is(t)))
              .on('end', () => {
                zooming.current = false;
              });
          } else {
            setZoom(state);
          }
        },
        setTranslation,
        setRotation,
        flyTo: (target, options = {}) => {
          const { duration = 1_200, tilt = 0, onTick } = options;
          const p2 = geoToPosition(target);
          const r1 = projection.rotate() as Vector;
          const r2 = positionToRotation(p2, tilt);
          // Approximate current centre from the inverse of the rotation.
          const p1: [number, number] = [-r1[0], -r1[1]];
          const rotationTween = createRotationTween(projection, setRotation, r1, r2);

          const iz = target.zoom !== undefined ? interpolateNumber(zoomRef.current, target.zoom) : undefined;

          flyToSelection.interrupt(flyToTransitionName);
          const tx = flyToSelection.transition(flyToTransitionName).duration(flyDuration(p1, p2, duration, 1_500));
          if (onTick) {
            tx.tween('flyToOnTick', () => onTick);
          }
          tx.tween('flyToRotation', () => rotationTween);
          if (iz) {
            tx.tween('flyToZoom', () => (t: number) => setZoom(iz(t)));
          }
          return tx.end();
        },
        cancelFlyTo: () => {
          flyToSelection.interrupt(flyToTransitionName);
        },
      };
      // `projection` must be in deps: switching between stories that pass
      // different projection types creates a new instance via useMemo, and
      // any consumer reading controller.projection (e.g. useDrag) would
      // otherwise mutate a dead instance while the canvas renders the new one.
    }, [canvas, projection, flyToSelection, flyToTransitionName]);

    // https://d3js.org/d3-geo/path#geoPath
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
    // Keep the context alpha-enabled: when a style set omits `background`, `renderLayers`
    // clears to transparent so the canvas's themed CSS background (below) shows through the
    // area outside the globe — correct in both light and dark mode.
    const generator = useMemo(
      () => canvas && projection && geoPath(projection, canvas.getContext('2d')),
      [canvas, projection],
    );

    // Render on change.
    useEffect(() => {
      if (canvas && projection) {
        timer(() => {
          // https://d3js.org/d3-geo/projection
          projection
            .scale((Math.min(size.width, size.height) / 2) * zoom)
            .translate([size.width / 2 + (translation?.x ?? 0), size.height / 2 + (translation?.y ?? 0)])
            .rotate(rotation ?? [0, 0, 0]);

          // Provide a view-center for per-frame culling — only meaningful for
          // projections that present a single visible hemisphere (e.g.
          // orthographic). For Mercator/transverse-mercator the whole sphere
          // is always visible, so we skip culling.
          const isOrthographic = !projectionProp || projectionProp === 'orthographic';
          const [lambda, phi] = (rotation ?? [0, 0, 0]) as Vector;
          const viewCenter: [number, number] | undefined = isOrthographic ? [-lambda, -phi] : undefined;

          renderLayers(generator, layers, zoom, styles, viewCenter);
        });
      }
    }, [generator, size, zoom, translation, rotation, layers, projectionProp]);

    if (!size.width || !size.height) {
      return null;
    }

    return <canvas ref={canvasRef} className='bg-base-surface' width={size.width} height={size.height} />;
  },
);

//
// Debug
//

const GlobeDebug = ({ position = 'topleft' }: { position?: ControlPosition }) => {
  const { size, zoom, translation, rotation } = useGlobeContext();
  return (
    <div
      className={mx(
        'z-10 absolute w-96 p-2 overflow-hidden border border-green-700 rounded-sm',
        controlPositions[position],
      )}
    >
      <pre className='font-mono text-xs text-green-700'>
        {JSON.stringify({ size, zoom, translation, rotation }, null, 2)}
      </pre>
    </div>
  );
};

//
// Panel
//

const GlobePanel = ({
  position,
  classNames,
  children,
}: ThemedClassName<PropsWithChildren & { position?: ControlPosition }>) => {
  return <div className={mx('z-10 absolute overflow-hidden', controlPositions[position], classNames)}>{children}</div>;
};

//
// Controls
//

const CustomControl = ({ position, children }: PropsWithChildren<{ position: ControlPosition }>) => {
  return <div className={mx('z-10 absolute overflow-hidden', controlPositions[position])}>{children}</div>;
};

type GlobeControlProps = { position?: ControlPosition } & Pick<ControlProps, 'onAction'>;

const GlobeZoom = ({ onAction, position = 'bottomleft', ...props }: GlobeControlProps) => (
  <CustomControl position={position} {...props}>
    <ZoomControls onAction={onAction} />
  </CustomControl>
);

const GlobeAction = ({ onAction, position = 'bottomright', ...props }: GlobeControlProps) => (
  <CustomControl position={position} {...props}>
    <ActionControls onAction={onAction} />
  </CustomControl>
);

//
// Globe
//

export const Globe = {
  Root: GlobeRoot,
  Canvas: GlobeCanvas,
  Zoom: GlobeZoom,
  Action: GlobeAction,
  Debug: GlobeDebug,
  Panel: GlobePanel,
};

export type { GlobeRootProps, GlobeCanvasProps };
