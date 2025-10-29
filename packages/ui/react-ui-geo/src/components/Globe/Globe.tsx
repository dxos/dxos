//
// Copyright 2018 DXOS.org
//

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
import React, {
  type PropsWithChildren,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { type Topology } from 'topojson-specification';

import { type ThemeMode, type ThemedClassName, useDynamicRef, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import {
  GlobeContextProvider,
  type GlobeContextProviderProps,
  type GlobeContextType,
  useGlobeContext,
} from '../../hooks';
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

export type GlobeController = {
  canvas: HTMLCanvasElement;
  projection: GeoProjection;
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

type GlobeRootProps = PropsWithChildren<ThemedClassName<GlobeContextProviderProps>>;

const GlobeRoot = ({ classNames, children, ...props }: GlobeRootProps) => {
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();

  return (
    <div ref={ref} className={mx('relative flex grow overflow-hidden', classNames)}>
      <GlobeContextProvider size={{ width, height }} {...props}>
        {children}
      </GlobeContextProvider>
    </div>
  );
};

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
  ({ projection: projectionParam, topology, features, styles: stylesParam }, forwardRef) => {
    const { themeMode } = useThemeContext();
    const styles = useMemo(() => stylesParam ?? defaultStyles[themeMode], [stylesParam, themeMode]);

    // Canvas.
    const [canvas, setCanvas] = useState<HTMLCanvasElement>(null);
    const canvasRef = (canvas: HTMLCanvasElement) => setCanvas(canvas);

    // Projection.
    const projection = useMemo(() => getProjection(projectionParam), [projectionParam]);

    // Layers.
    // TODO(burdon): Generate on the fly based on what is visible.
    const layers = useMemo(() => {
      return timer(() => createLayers(topology as Topology, features, styles));
    }, [topology, features, styles]);

    // State.
    const { size, center, zoom, translation, rotation, setCenter, setZoom, setTranslation, setRotation } =
      useGlobeContext();
    const zoomRef = useDynamicRef(zoom);

    // Update rotation.
    useEffect(() => {
      if (center) {
        setZoom(1);
        setRotation(positionToRotation(geoToPosition(center)));
      }
    }, [center]);

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
        setZoom: (s) => {
          if (typeof s === 'function') {
            const is = interpolateNumber(zoomRef.current, s(zoomRef.current));
            // Stop easing if already zooming.
            transition()
              .ease(zooming.current ? easeLinear : easeSinOut)
              .duration(200)
              .tween('scale', () => (t) => setZoom(is(t)))
              .on('end', () => {
                zooming.current = false;
              });
          } else {
            setZoom(s);
          }
        },
        setTranslation,
        setRotation,
      };
    }, [canvas]);

    // https://d3js.org/d3-geo/path#geoPath
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
    const generator = useMemo(
      () => canvas && projection && geoPath(projection, canvas.getContext('2d', { alpha: false })),
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

          renderLayers(generator, layers, zoom, styles);
        });
      }
    }, [generator, size, zoom, translation, rotation, layers]);

    if (!size.width || !size.height) {
      return null;
    }

    return <canvas ref={canvasRef} width={size.width} height={size.height} />;
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
        'z-10 absolute w-96 p-2 overflow-hidden border border-green-700 rounded',
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
