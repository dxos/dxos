//
// Copyright 2018 DXOS.org
//

import '@dxos-theme';

import { type FeatureCollection, type Geometry, type Position } from 'geojson';
import { Leva } from 'leva';
import React, { useMemo, useState } from 'react';
import { type Topology } from 'topojson-specification';

import { useAsyncCallback } from '@dxos/react-ui';
import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import {
  Globe,
  type GlobeCanvasProps,
  type GlobeController,
  type GlobeControlsProps,
  type GlobeRootProps,
} from './Globe';
import { useDrag, useSpinner, useTour, type Vector } from '../hooks';
import { closestPoint, type LatLng, type StyleSet } from '../util';

// TODO(burdon): Local script (e.g., plot on chart) vs. remote functions.
// TODO(burdon): Add charts to sheet.
// TODO(burdon): Able to script (e.g., list of cities from named range).
// TODO(burdon): Search flight information. Calendar (itinerary).
// TODO(burdon): Show MANY packets flowing across the network.

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
  JFK: ['SFO', 'LAX', 'SEA', 'CXH', 'YYZ', 'TPA'],
  CDG: ['BHX', 'BCN', 'VIE', 'WAW', 'CPH', 'ATH', 'IST', 'TXL'],
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
}: StoryProps) => {
  const [controller, setController] = useState<GlobeController | null>();
  const dots = useAsyncCallback(async () => {
    const points = (await import('../../data/countries-dots-3.ts')).default;
    return {
      type: 'Topology',
      objects: { dots: points },
    } as any as Topology;
  });
  const topology = useAsyncCallback(async () => (await import('../../data/countries-110m.ts')).default);
  const airports = useAsyncCallback(async () => (await import('../../data/airports.ts')).default);
  const features = useMemo(() => {
    return airports ? createTrip(airports, routes, (dots?.objects.dots as any)?.geometries[0].coordinates) : undefined;
  }, [airports, routes, dots]);

  // Control hooks.
  const [startSpinner, stopSpinner] = useSpinner(controller, { disabled: !spin });
  const [startTour, stopTour] = useTour(controller, features, {
    disabled: !tour,
    styles,
  });
  useDrag(controller, {
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
  const handleAction: GlobeControlsProps['onAction'] = (event) => {
    switch (event) {
      case 'toggle': {
        break;
      }
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
        controller.setScale((scale) => scale * 1.1);
        break;
      }
      case 'zoom-out': {
        controller.setScale((scale) => scale * 0.9);
        break;
      }
    }
  };

  return (
    <Globe.Root classNames='absolute inset-0' scale={_scale} translation={translation} rotation={rotation}>
      <Globe.Canvas
        ref={setController}
        topology={styles.dots ? dots : topology}
        projection={projection}
        styles={styles}
        features={tour ? { points: features?.points ?? [] } : features}
      />
      <Globe.ZoomControls onAction={handleAction} />
      <Globe.ActionControls onAction={handleAction} />
      <Globe.Debug />
      <Globe.Panel position='top-right' classNames='w-20 h-20'>
        <Leva />
      </Globe.Panel>
    </Globe.Root>
  );
};

const initialRotation: Vector = [0, -40, 0];

export default {
  title: 'gem-globe/Globe',
  decorators: [withTheme, withFullscreen({ classNames: 'bg-[#000]' })],
};

export const Earth1 = () => {
  const topology = useAsyncCallback(async () => (await import('../../data/countries-110m.ts')).default);
  const [controller, setController] = useState<GlobeController | null>();
  useDrag(controller);

  return (
    <Globe.Root scale={1.2} rotation={[Math.random() * 360, 0, 0]}>
      <Globe.Canvas ref={setController} topology={topology} />
    </Globe.Root>
  );
};

export const Earth2 = () => {
  const topology = useAsyncCallback(async () => (await import('../../data/countries-110m.ts')).default);
  const [controller, setController] = useState<GlobeController | null>();
  useDrag(controller);

  return (
    <div className='absolute bottom-0 left-0 right-0 '>
      <Globe.Root classNames='h-[400px]' scale={2.8} translation={{ x: 0, y: 400 }}>
        <Globe.Canvas ref={setController} topology={topology} />
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
  const topology = useAsyncCallback(async () => (await import('../../data/countries-110m.ts')).default);
  const [controller, setController] = useState<GlobeController | null>();
  useDrag(controller);

  return (
    <Globe.Root classNames='flex grow overflow-hidden' scale={0.7} rotation={initialRotation}>
      <Globe.Canvas ref={setController} topology={topology} projection='mercator' styles={monochrome} />
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
  return <Story drag tour scale={2} translation={{ x: 0, y: 600 }} rotation={[0, -20, 0]} styles={dotStyles} />;
};
