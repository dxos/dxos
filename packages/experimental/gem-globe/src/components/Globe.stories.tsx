//
// Copyright 2018 DXOS.org
//

import '@dxos-theme';

import React, { useMemo, useRef } from 'react';

import { withTheme, withFullscreen } from '@dxos/storybook-utils';

// @ts-ignore
import Airports from '#data_airports.json';
import {
  Globe,
  type GlobeCanvasProps,
  type GlobeController,
  type GlobeControlsProps,
  type GlobeRootProps,
} from './Globe';
import { useDrag, useSpinner, useTour, type Vector } from '../hooks';
import { type LatLng } from '../util';

// TODO(burdon): Local script (e.g., plot on chart) vs. remote functions.
// TODO(burdon): Add charts to sheet.
// TODO(burdon): Able to script (e.g., list of cities from named range).
// TODO(burdon): Search flight information. Calendar (itinerary).
// TODO(burdon): Show MANY packets flowing across the network.

const globeStyles1 = {
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

const globeStyles2 = {
  water: {
    fillStyle: '#000',
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
    // lineDash: [4, 16],
    strokeStyle: 'yellow',
  },

  point: {
    radius: 0.2,
    fillStyle: 'red',
  },
};

const routes: Record<string, string[]> = {
  JFK: ['SFO', 'LAX', 'SEA', 'CXH', 'YYZ', 'TPA'],
  CDG: ['BHX', 'BCN', 'VIE', 'WAW', 'CPH', 'ATH', 'IST', 'TXL'],
  SIN: ['HND', 'SYD', 'HKG', 'BKK'],
};

// TODO(burdon): Make hierarchical/tree.
const createRoute = () => {
  let previousHub: LatLng;
  return Object.entries(routes).reduce<{ points: LatLng[]; lines: { source: LatLng; target: LatLng }[] }>(
    (features, [hub, regional]) => {
      const hubAirport = Airports.features.find(({ properties }) => properties.iata === hub);
      if (hubAirport) {
        const [lng, lat] = hubAirport.geometry.coordinates;
        const hubPoint = { lat, lng };
        features.points.push(hubPoint);
        if (previousHub) {
          features.lines.push({ source: previousHub, target: hubPoint });
        }

        for (const dest of regional) {
          const destAirport = Airports.features.find(({ properties }) => properties.iata === dest);
          if (destAirport) {
            const [lng, lat] = destAirport.geometry.coordinates;
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

type StoryProps = Pick<GlobeRootProps, 'scale' | 'rotation'> &
  Pick<GlobeCanvasProps, 'projection'> & {
    drag?: boolean;
    spin?: boolean;
    tour?: boolean;
  };

const Story = ({
  scale: _scale = 1,
  rotation = [0, 0, 0],
  projection,
  drag = false,
  spin = false,
  tour = false,
}: StoryProps) => {
  const controllerRef = useRef<GlobeController>(null);
  const features = useMemo(() => createRoute(), []);

  const [startSpinner, stopSpinner] = useSpinner(controllerRef.current, { disabled: !spin });
  const [startTour, stopTour] = useTour(controllerRef.current, features, { disabled: !tour, styles: globeStyles2 });
  useDrag(controllerRef.current, {
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
      case 'home': {
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
      case 'zoom.in': {
        controllerRef.current.setScale((scale) => scale * 1.1);
        break;
      }
      case 'zoom.out': {
        controllerRef.current.setScale((scale) => scale * 0.9);
        break;
      }
    }
  };

  return (
    <Globe.Root classNames='absolute inset-0' scale={_scale} rotation={rotation}>
      <Globe.Canvas
        ref={controllerRef}
        projection={projection}
        styles={globeStyles2}
        features={tour ? { points: features.points } : features}
      />
      <Globe.Controls onAction={handleAction} />
      <Globe.Debug />
    </Globe.Root>
  );
};

export default {
  title: 'gem-globe/Globe',
  decorators: [withTheme, withFullscreen({ classNames: 'bg-[#111]' })],
};

export const Earth = () => {
  const ref = useRef<GlobeController>(null);
  useDrag(ref.current);

  return (
    <div className='absolute bottom-0 left-0 right-0 '>
      <Globe.Root classNames='h-[400px]' scale={2.8} translation={{ x: 0, y: 400 }}>
        <Globe.Canvas ref={ref} />
      </Globe.Root>
    </div>
  );
};

export const Mercator = () => {
  const ref = useRef<GlobeController>(null);
  useDrag(ref.current);

  return (
    <Globe.Root classNames='flex grow overflow-hidden' scale={0.7} rotation={[0, -35, 0]}>
      <Globe.Canvas ref={ref} projection='mercator' styles={globeStyles1} />
    </Globe.Root>
  );
};

const initialRotation: Vector = [0, -40, 0];

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
  return <Story drag tour scale={0.9} rotation={initialRotation} />;
};

export const Globe5 = () => {
  return <Story drag tour scale={2} rotation={initialRotation} />;
};
