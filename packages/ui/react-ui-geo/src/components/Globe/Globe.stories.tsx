//
// Copyright 2018 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import { type FeatureCollection, type Geometry, type Position } from 'geojson';
import { Leva } from 'leva';
import React, { useMemo, useRef, useState } from 'react';
import { type Topology } from 'topojson-specification';

import { useAsyncState } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Globe, type GlobeCanvasProps, type GlobeController, type GlobeRootProps } from './Globe';
import { useDrag, useGlobeZoomHandler, useSpinner, useTour, type Vector } from '../../hooks';
import { closestPoint, type LatLng, type StyleSet } from '../../util';
import { type ControlProps } from '../Toolbar';

// TODO(burdon): Local script (e.g., plot on chart) vs. remote functions.
// TODO(burdon): Add charts to sheet.
// TODO(burdon): Able to script (e.g., list of cities from named range).
// TODO(burdon): Search flight information. Calendar (itinerary).
// TODO(burdon): Show MANY packets flowing across the network.

const useImportJson = (filename: string) => {
  return useAsyncState(
    // TODO(burdon): Configure vite plugins for experimental syntax.
    //  @babel/plugin-syntax-import-assertions
    //  @babel/plugin-syntax-import-attributes
    async () => await import(filename), // { assert: { type: 'json' } }),
  );
};

const defaultStyles: StyleSet = {
  water: {
    fillStyle: '#0a0a0a',
  },

  land: {
    fillStyle: '#050505',
    strokeStyle: 'darkgreen',
  },

  graticule: {
    strokeStyle: '#111',
  },

  line: {
    lineWidth: 1,
    lineDash: [4, 16],
    strokeStyle: 'yellow',
  },

  point: {
    pointRadius: 2,
    fillStyle: 'red',
  },

  cursor: {
    fillStyle: 'orange',
    pointRadius: 2,
  },

  arc: {
    lineWidth: 2,
    strokeStyle: 'yellow',
  },
};

const dotStyles: StyleSet = {
  dots: {
    fillStyle: '#444',
    pointRadius: 2,
  },

  point: {
    pointRadius: 2,
    fillStyle: 'red',
  },

  cursor: {
    fillStyle: 'orange',
    pointRadius: 2,
  },

  arc: {
    lineWidth: 2,
    strokeStyle: 'yellow',
  },
};

const routes: Record<string, string[]> = {
  LAX: ['SFO', 'SEA'],
  JFK: ['LAX', 'YYZ', 'TPA', 'CXH'],
  CDG: ['BHX', 'BCN', 'VIE', 'WAW', 'CPH', 'ATH', 'IST', 'TXL', 'KBP', 'TLL'],
  DXB: ['IKA'],
  SIN: ['HND', 'SYD', 'HKG', 'BKK'],
};

// TODO(burdon): Make hierarchical/tree.
const createTrip = (
  airports: FeatureCollection<Geometry & { coordinates: Position }, { iata: string }>,
  routes: Record<string, string[]>,
  points: Position[] = [],
) => {
  let previousHub: LatLng;
  return Object.entries(routes).reduce<{ points: LatLng[]; lines: { source: LatLng; target: LatLng }[] }>(
    (features, [hub, regional]) => {
      const hubAirport = airports.features.find(({ properties }) => properties.iata === hub);
      if (hubAirport) {
        const [lng, lat] = closestPoint(points, hubAirport.geometry.coordinates);
        const hubPoint = { lat, lng };
        features.points.push(hubPoint);
        if (previousHub) {
          features.lines.push({ source: previousHub, target: hubPoint });
        }

        for (const dest of regional) {
          const destAirport = airports.features.find(({ properties }) => properties.iata === dest);
          if (destAirport) {
            const [lng, lat] = closestPoint(points, destAirport.geometry.coordinates);
            features.points.push({ lat, lng });
            features.lines.push({ source: hubPoint, target: { lat, lng } });
          }
        }

        previousHub = hubPoint;
      }

      return features;
    },
    { points: [], lines: [] },
  );
};

type StoryProps = Pick<GlobeRootProps, 'scale' | 'translation' | 'rotation'> &
  Pick<GlobeCanvasProps, 'projection' | 'styles'> & {
    drag?: boolean;
    spin?: boolean;
    tour?: boolean;
    xAxis?: boolean;
  };

const Story = ({
  scale: _scale = 1,
  translation,
  rotation = [0, 0, 0],
  projection,
  styles = defaultStyles,
  drag = false,
  spin = false,
  tour = false,
  xAxis = false,
}: StoryProps) => {
  const controller = useRef<GlobeController>(null);
  const [dots] = useAsyncState(async () => {
    const points = (await import('../../../data/countries-dots-3.ts')).default;
    return {
      type: 'Topology',
      objects: { dots: points },
    } as any as Topology;
  });
  const [topology] = useImportJson('../../../data/raw/countries-110m.json');
  const [airports] = useAsyncState(async () => (await import('../../../data/airports.ts')).default);
  const features = useMemo(() => {
    return airports ? createTrip(airports, routes, (dots?.objects.dots as any)?.geometries[0].coordinates) : undefined;
  }, [airports, routes, dots]);

  // Control hooks.
  const [startSpinner, stopSpinner] = useSpinner(controller.current, { disabled: !spin });
  const [startTour, stopTour] = useTour(controller.current, features, {
    disabled: !tour,
    styles,
  });
  useDrag(controller.current, {
    xAxis,
    disabled: !drag,
    onUpdate: (event) => {
      switch (event.type) {
        case 'start': {
          stopSpinner();
          stopTour();
          break;
        }
      }
    },
  });

  // TODO(burdon): Factor out handlers.
  const handleAction: ControlProps['onAction'] = (event) => {
    switch (event) {
      case 'start': {
        if (spin) {
          startSpinner();
        }
        if (tour) {
          startTour();
        }
        break;
      }
      case 'zoom-in': {
        controller.current.setScale((scale) => scale * 1.1);
        break;
      }
      case 'zoom-out': {
        controller.current.setScale((scale) => scale * 0.9);
        break;
      }
    }
  };

  return (
    <Globe.Root classNames='absolute inset-0' scale={_scale} translation={translation} rotation={rotation}>
      <Globe.Canvas
        ref={controller}
        topology={styles.dots ? dots : topology}
        projection={projection}
        styles={styles}
        features={tour ? { points: features?.points ?? [] } : features}
      />
      <Globe.Zoom onAction={handleAction} />
      <Globe.Action onAction={handleAction} />
      <Globe.Debug />
      <Globe.Panel position='topright' classNames='w-20 h-20'>
        <Leva />
      </Globe.Panel>
    </Globe.Root>
  );
};

const initialRotation: Vector = [0, -40, 0];

const meta: Meta = {
  title: 'ui/react-ui-geo/Globe',
  component: Globe.Root,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'bg-[#000]', tooltips: true })],
};

export default meta;

export const Earth1 = () => {
  const [topology] = useImportJson('../../../data/raw/countries-110m.json');
  const [controller, setController] = useState<GlobeController | null>();
  const handleAction = useGlobeZoomHandler(controller);
  useDrag(controller);

  return (
    <Globe.Root scale={1.2} rotation={[Math.random() * 360, 0, 0]}>
      <Globe.Canvas ref={setController} topology={topology} />
      <Globe.Zoom onAction={handleAction} />
    </Globe.Root>
  );
};

export const Earth2 = () => {
  const [topology] = useImportJson('../../../data/raw/countries-110m.json');
  const [controller, setController] = useState<GlobeController | null>();
  const handleAction = useGlobeZoomHandler(controller);
  useDrag(controller);

  return (
    <div className='absolute bottom-0 left-0 right-0 '>
      <Globe.Root classNames='h-[400px]' scale={2.8} translation={{ x: 0, y: 400 }}>
        <Globe.Canvas ref={setController} topology={topology} />
        <Globe.Zoom onAction={handleAction} />
      </Globe.Root>
    </div>
  );
};

const monochrome: StyleSet = {
  water: {
    fillStyle: '#191919',
  },

  land: {
    fillStyle: '#444',
    strokeStyle: '#222',
  },

  border: {
    strokeStyle: '#111',
  },

  graticule: {
    strokeStyle: '#111',
  },
};

export const Mercator = () => {
  const [topology] = useImportJson('../../../data/raw/countries-110m.json');
  const [controller, setController] = useState<GlobeController | null>();
  const handleAction = useGlobeZoomHandler(controller);
  useDrag(controller);

  return (
    <Globe.Root classNames='flex grow overflow-hidden' scale={0.7} rotation={initialRotation}>
      <Globe.Canvas ref={setController} topology={topology} projection='mercator' styles={monochrome} />
      <Globe.Zoom onAction={handleAction} />
    </Globe.Root>
  );
};

export const Globe1 = () => {
  return <Story drag projection='mercator' scale={0.8} rotation={initialRotation} />;
};

export const Globe2 = () => {
  return <Story drag projection='transverse-mercator' scale={0.8} rotation={initialRotation} />;
};

export const Globe3 = () => {
  return <Story drag spin scale={1.5} rotation={initialRotation} />;
};

export const Globe4 = () => {
  return <Story drag tour scale={2} rotation={initialRotation} />;
};

export const Globe5 = () => {
  return <Story drag tour scale={0.9} rotation={initialRotation} styles={dotStyles} />;
};

export const Globe6 = () => {
  return <Story drag xAxis tour scale={2} translation={{ x: 0, y: 600 }} rotation={[0, -20, 0]} styles={dotStyles} />;
};
