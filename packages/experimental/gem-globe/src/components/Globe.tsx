//
// Copyright 2018 DXOS.org
//

import * as d3 from 'd3';
import { type GeoProjection } from 'd3';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, type PropsWithChildren, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { type Topology } from 'topojson-specification';

import { DensityProvider, type ThemedClassName, Toolbar, useDynamicRef } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import Countries from '../../data/countries-110m.js';
import { GlobeContextProvider, type GlobeContextProviderProps, type GlobeContextType, useGlobeContext } from '../hooks';
import { createLayers, type Features, latLngToRotation, renderLayers, type Styles, type StyleSet } from '../util';

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
  canvas: HTMLCanvasElement;
  projection: GeoProjection;
} & Pick<GlobeContextType, 'setScale' | 'setTranslation' | 'setRotation'>;

export type ProjectionType = 'orthographic' | 'mercator' | 'transverse-mercator';

const projectionMap: Record<ProjectionType, () => GeoProjection> = {
  orthographic: d3.geoOrthographic,
  mercator: d3.geoMercator,
  'transverse-mercator': d3.geoTransverseMercator,
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
const GlobeCanvas = forwardRef<GlobeController, GlobeCanvasProps>(
  ({ projection: _projection, topology = Countries, features, styles = defaultStyles }, forwardRef) => {
    // Canvas.
    const [canvas, setCanvas] = useState<HTMLCanvasElement>(null);
    const canvasRef = (canvas: HTMLCanvasElement) => setCanvas(canvas);

    // Projection.
    const projection = useMemo(() => getProjection(_projection), [_projection]);
    const layers = useMemo(() => createLayers(topology as Topology, features, styles), [topology, features, styles]);

    // State.
    const { size, center, scale, translation, rotation, setCenter, setScale, setTranslation, setRotation } =
      useGlobeContext();

    const scaleRef = useDynamicRef(scale);

    // Update rotation.
    useEffect(() => {
      if (center) {
        setScale(1);
        setRotation(latLngToRotation(center));
      }
    }, [center]);

    // External controller.
    useImperativeHandle<GlobeController, GlobeController>(
      forwardRef,
      () => {
        return {
          canvas,
          projection,
          center,
          get scale() {
            return scaleRef.current;
          },
          translation,
          rotation,
          setCenter,
          setScale: (s) => {
            if (typeof s === 'function') {
              const is = d3.interpolateNumber(scaleRef.current, s(scaleRef.current));
              d3.transition()
                .duration(200) // TODO(burdon): Option.
                .tween('scale', () => (t) => setScale(is(t)));
            } else {
              setScale(s);
            }
          },
          setTranslation,
          setRotation,
        };
      },
      [canvas],
    );

    // Render on change.
    useEffect(() => {
      if (canvas && projection) {
        // https://d3js.org/d3-geo/projection
        projection
          .scale((Math.min(size.width, size.height) / 2) * scale)
          .translate([size.width / 2 + (translation?.x ?? 0), size.height / 2 + (translation?.y ?? 0)])
          .rotate(rotation ?? [0, 0, 0]);

        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
        const context = canvas.getContext('2d');

        // https://github.com/d3/d3-geo#geoPath
        const generator = d3.geoPath().context(context).projection(projection);
        renderLayers(generator, layers, styles);
      }
    }, [canvas, projection, size, scale, translation, rotation, layers]);

    if (!size.width || !size.height) {
      return null;
    }

    return <canvas ref={canvasRef} width={size.width} height={size.height} />;
  },
);

//
// Controls
//

type GlobeControlsPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const controlPositions: Record<GlobeControlsPosition, string> = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
};

type GlobeControlAction = 'toggle' | 'start' | 'zoom-in' | 'zoom-out';

type GlobeControlsProps = ThemedClassName<{
  position?: GlobeControlsPosition;
  onAction?: (action: GlobeControlAction) => void;
}>;

const Button = ({ icon, onAction }: { icon: string; onAction?: () => void }) => (
  <Toolbar.Button classNames='min-bs-0 !p-1' variant='ghost' onClick={() => onAction?.()}>
    <svg className={mx(getSize(5))}>
      <use href={icon} />
    </svg>
  </Toolbar.Button>
);

const GlobeZoomControls = ({ classNames, position = 'bottom-left', onAction }: GlobeControlsProps) => {
  return (
    <DensityProvider density='fine'>
      <Toolbar.Root classNames={mx('absolute overflow-hidden !is-auto gap-0', controlPositions[position], classNames)}>
        <Button icon='/icons.svg#ph--plus--regular' onAction={() => onAction?.('zoom-in')} />
        <Button icon='/icons.svg#ph--minus--regular' onAction={() => onAction?.('zoom-out')} />
      </Toolbar.Root>
    </DensityProvider>
  );
};

const GlobeActionControls = ({ classNames, position = 'bottom-right', onAction }: GlobeControlsProps) => {
  return (
    <DensityProvider density='fine'>
      <Toolbar.Root classNames={mx('absolute overflow-hidden !is-auto gap-0', controlPositions[position], classNames)}>
        <Button icon='/icons.svg#ph--play--regular' onAction={() => onAction?.('start')} />
        <Button icon='/icons.svg#ph--globe-hemisphere-west--regular' onAction={() => onAction?.('toggle')} />
      </Toolbar.Root>
    </DensityProvider>
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
  ActionControls: GlobeActionControls,
  ZoomControls: GlobeZoomControls,
  Debug: GlobeDebug,
};

export type { GlobeRootProps, GlobeCanvasProps, GlobeControlsProps, GlobeControlAction };
