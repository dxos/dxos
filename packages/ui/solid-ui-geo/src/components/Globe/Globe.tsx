//
// Copyright 2018 DXOS.org
//

import { createResizeObserver } from '@solid-primitives/resize-observer';
import {
  type GeoProjection,
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
import { type Accessor, type JSX, type Setter, Show, createEffect, createMemo, createSignal } from 'solid-js';
import { type Topology } from 'topojson-specification';

import { GlobeContextProvider, type GlobeContextProviderProps, useGlobeContext } from '../../hooks';
import {
  type Features,
  type StyleSet,
  createLayers,
  geoToPosition,
  positionToRotation,
  renderLayers,
  timer,
} from '../../util';
import { ActionControls, type ControlProps, ZoomControls, controlPositions } from '../Toolbar';

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute
 */
const defaultStyles: Record<string, StyleSet> = {
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

export type GlobeController = {
  canvas: HTMLCanvasElement;
  projection: GeoProjection;
  zoom: number;
  translation: Accessor<{ x: number; y: number } | undefined>;
  rotation: Accessor<[number, number, number] | undefined>;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setTranslation: Setter<{ x: number; y: number } | undefined>;
  setRotation: (rotation: [number, number, number]) => void;
};

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

type GlobeRootProps = {
  children: JSX.Element;
  class?: string;
} & Partial<GlobeContextProviderProps> &
  JSX.HTMLAttributes<HTMLDivElement>;

const GlobeRoot = (props: GlobeRootProps) => {
  let containerRef: HTMLDivElement | undefined;
  const [size, setSize] = createSignal({ width: 0, height: 0 });

  // Use @solid-primitives/resize-observer
  createResizeObserver(
    () => containerRef,
    ({ width, height }) => {
      setSize({ width, height });
    },
  );

  return (
    <div ref={containerRef} class={`relative flex grow overflow-hidden ${props.class ?? ''}`} {...props}>
      <GlobeContextProvider size={size()} {...props}>
        {props.children}
      </GlobeContextProvider>
    </div>
  );
};

//
// Canvas
//

type GlobeCanvasProps = {
  ref?: (controller: GlobeController) => void;
  projection?: ProjectionType | GeoProjection;
  topology?: Topology;
  features?: Features;
  styles?: StyleSet;
};

/**
 * Basic globe renderer.
 * https://github.com/topojson/world-atlas
 */
const GlobeCanvas = (props: GlobeCanvasProps) => {
  const themeMode = 'dark'; // TODO: Get from theme context
  const styles = createMemo(() => props.styles ?? defaultStyles[themeMode]);

  // Canvas.
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);

  // Projection.
  const projection = createMemo(() => getProjection(props.projection));

  // Layers.
  const layers = createMemo(() => {
    return timer(() => createLayers(props.topology as Topology, props.features, styles()));
  });

  // State.
  const { size, center, zoom, translation, rotation, setCenter, setZoom, setTranslation, setRotation } =
    useGlobeContext();

  let zoomValue = zoom();
  let zooming = false;

  createEffect(() => { });

  // Update rotation.
  createEffect(() => {
    const c = center();
    if (c) {
      setZoom(1);
      setRotation(positionToRotation(geoToPosition(c)));
    }
  });

  // External controller.
  createEffect(() => {
    const canvasEl = canvas();
    if (canvasEl && props.ref) {
      const controller: GlobeController = {
        canvas: canvasEl,
        projection: projection(),
        get zoom() {
          return zoomValue;
        },
        translation,
        rotation,
        setZoom: (s) => {
          if (typeof s === 'function') {
            const is = interpolateNumber(zoomValue, s(zoomValue));
            // Stop easing if already zooming.
            transition()
              .ease(zooming ? easeLinear : easeSinOut)
              .duration(200)
              .tween('scale', () => (t) => {
                const newZoom = is(t);
                zoomValue = newZoom;
                setZoom(newZoom);
              })
              .on('end', () => {
                zooming = false;
              });
          } else {
            zoomValue = s;
            setZoom(s);
          }
        },
        setTranslation,
        setRotation,
      };
      props.ref(controller);
    }
  });

  // https://d3js.org/d3-geo/path#geoPath
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
  const generator = createMemo(() => {
    const canvasEl = canvas();
    const proj = projection();
    return canvasEl && proj && geoPath(proj, canvasEl.getContext('2d', { alpha: false }));
  });

  // Render on change.
  createEffect(() => {
    const canvasEl = canvas();
    const proj = projection();
    const gen = generator();
    const z = zoom();
    const t = translation();
    const r = rotation();
    const s = size();

    if (canvasEl && proj && gen) {
      timer(() => {
        // https://d3js.org/d3-geo/projection
        proj
          .scale((Math.min(s.width, s.height) / 2) * z)
          .translate([s.width / 2 + (t?.x ?? 0), s.height / 2 + (t?.y ?? 0)])
          .rotate(r ?? [0, 0, 0]);

        renderLayers(gen, layers(), z, styles());
      });
    }
  });

  return (
    <Show when={size().width > 0 && size().height > 0}>
      <canvas ref={setCanvas} width={size().width} height={size().height} />
    </Show>
  );
};

//
// Debug
//

const GlobeDebug = (props: { position?: ControlPosition }) => {
  const { size, zoom, translation, rotation } = useGlobeContext();
  return (
    <div
      class={`z-10 absolute w-96 p-2 overflow-hidden border border-green-700 rounded ${controlPositions[props.position ?? 'topleft']
        }`}
    >
      <pre class='font-mono text-xs text-green-700'>
        {JSON.stringify({ size, zoom: zoom(), translation: translation(), rotation: rotation() }, null, 2)}
      </pre>
    </div>
  );
};

//
// Panel
//

const GlobePanel = (props: { children: JSX.Element; position?: ControlPosition; class?: string }) => {
  return (
    <div class={`z-10 absolute overflow-hidden ${controlPositions[props.position ?? 'topleft']} ${props.class ?? ''}`}>
      {props.children}
    </div>
  );
};

//
// Controls
//

const CustomControl = (props: { children: JSX.Element; position: ControlPosition }) => {
  return <div class={`z-10 absolute overflow-hidden ${controlPositions[props.position]}`}>{props.children}</div>;
};

type GlobeControlProps = { position?: ControlPosition } & Pick<ControlProps, 'onAction'>;

const GlobeZoom = (props: GlobeControlProps) => (
  <CustomControl position={props.position ?? 'bottomleft'}>
    <ZoomControls onAction={props.onAction} />
  </CustomControl>
);

const GlobeAction = (props: GlobeControlProps) => (
  <CustomControl position={props.position ?? 'bottomright'}>
    <ActionControls onAction={props.onAction} />
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
