//
// Copyright 2018 DXOS.org
//

import * as d3 from 'd3';
import { type GeoProjection } from 'd3';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type PropsWithChildren } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { type Topology } from 'topojson-specification';

import { DensityProvider, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import Countries from '../../data/countries-110m.js';
import { GlobeContextProvider, type GlobeContextType, useGlobeContext, type Vector } from '../hooks';
import { createLayers, type Features, renderLayers, type Styles, type StyleSet } from '../util';

// TODO(burdon): Style generator.
// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute
const defaultStyles: Styles = {
  background: {
    fillStyle: '#111111',
  },

  water: {
    fillStyle: '#123E6A',
  },

  land: {
    fillStyle: '#032153',
  },

  // border: {
  //   strokeStyle: '#032153',
  // },

  line: {
    strokeStyle: '#111111',
    strokeWidth: 0.5,
  },

  point: {
    fillStyle: '#111111',
    strokeStyle: '#111111',
    strokeWidth: 1,
    radius: 0.5,
  },
};

export type GlobeController = {
  getCanvas: () => HTMLCanvasElement;
  projection: GeoProjection;
  setRotation: (rotation: Vector) => void;
};

export type ProjectionType = 'mercator' | 'orthographic';

const projectionMap: Record<ProjectionType, () => GeoProjection> = {
  orthographic: d3.geoOrthographic,
  mercator: d3.geoMercator,
};

const getProjection = (type: GlobeCanvasProps['projection'] = 'orthographic'): GeoProjection => {
  if (typeof type === 'string') {
    const constructor = projectionMap[type] ?? d3.geoOrthographic;
    return constructor();
  }

  return type ?? d3.geoOrthographic();
};

//
// Root
//

type GlobeRootProps = PropsWithChildren<ThemedClassName<Pick<GlobeContextType, 'scale' | 'translation' | 'rotation'>>>;

const GlobeRoot = ({ classNames, children, ...props }: GlobeRootProps) => {
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();
  return (
    <div ref={ref} className={mx('relative flex grow overflow-hidden', classNames)}>
      <GlobeContextProvider {...props} size={{ width, height }}>
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
const GlobeCanvas = forwardRef<GlobeController, GlobeCanvasProps>(
  ({ projection: _projection, topology = Countries, features, styles = defaultStyles }, forwardRef) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const projection = useMemo(() => getProjection(_projection), [_projection]);
    const layers = useMemo(() => createLayers(topology as Topology, features, styles), [topology, features, styles]);
    const { size, scale, translation, rotation, setRotation } = useGlobeContext();

    // Render on change.
    useEffect(() => {
      if (canvasRef.current && projection) {
        // https://d3js.org/d3-geo/projection
        projection
          .scale((Math.min(size.width, size.height) / 2) * scale)
          .translate([size.width / 2 + (translation?.x ?? 0), size.height / 2 + (translation?.y ?? 0)])
          .rotate(rotation ?? [0, 0, 0]);

        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
        const context = canvasRef.current.getContext('2d');

        // https://github.com/d3/d3-geo#geoPath
        const generator = d3.geoPath().context(context).projection(projection);
        renderLayers(generator, layers, styles);
      }
    }, [projection, size, scale, translation, rotation, layers]);

    // External control.
    useImperativeHandle(
      forwardRef,
      () => ({
        projection,
        getCanvas: () => canvasRef.current,
        setRotation,
      }),
      [canvasRef],
    );

    if (!size.width || !size.height) {
      return null;
    }

    return <canvas ref={canvasRef} width={size.width} height={size.height} />;
  },
);

//
// Controls
//

type GlobeControlAction = 'home' | 'start';

type GlobeControlsProps = { onAction?: (action: GlobeControlAction) => void };

// TODO(burdon): Zoom controls.
// TODO(burdon): Common controls with Map.
const GlobeControls = ({ onAction }: GlobeControlsProps) => {
  return (
    <div className='absolute left-4 bottom-4'>
      <DensityProvider density='fine'>
        <Toolbar.Root>
          <Toolbar.Button variant='ghost' onClick={() => onAction?.('home')}>
            <svg className={mx(getSize(5))}>
              <use href='/icons.svg#ph--target--regular' />
            </svg>
          </Toolbar.Button>
          <Toolbar.Button variant='ghost' onClick={() => onAction?.('start')}>
            <svg className={mx(getSize(5))}>
              <use href='/icons.svg#ph--play--regular' />
            </svg>
          </Toolbar.Button>
        </Toolbar.Root>
      </DensityProvider>
    </div>
  );
};

const GlobeDebug = () => {
  const { size, scale, translation, rotation } = useGlobeContext();

  return (
    <div className='absolute right-4 bottom-4 w-96 p-2 overflow-hidden border border-green-700 rounded'>
      <pre className='font-mono text-xs text-green-700'>
        {JSON.stringify({ size, scale, translation, rotation }, null, 2)}
      </pre>
    </div>
  );
};

export const Globe = {
  Root: GlobeRoot,
  Canvas: GlobeCanvas,
  Controls: GlobeControls,
  Debug: GlobeDebug,
};

export type { GlobeRootProps, GlobeCanvasProps, GlobeControlsProps };
