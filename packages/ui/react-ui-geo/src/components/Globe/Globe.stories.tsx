//
// Copyright 2018 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { type FeatureCollection, type Geometry, type Position } from 'geojson';
import { Leva } from 'leva';
import React, { useMemo, useRef, useState } from 'react';
import { type Topology } from 'topojson-specification';

import { useAsyncState } from '@dxos/react-ui';

import { type Vector, useDrag, useGlobeZoomHandler, useSpinner, useTour } from '../../hooks';
import { type LatLngLiteral } from '../../types';
import { type StyleSet, closestPoint } from '../../util';
import { type ControlProps } from '../Toolbar';

import { Globe, type GlobeCanvasProps, type GlobeController, type GlobeRootProps } from './Globe';

// TODO(burdon): Load from JSON at runtime?
const useTopology = () => {
  return useAsyncState(async () => (await import('../../../data/countries-110m.ts')).default);
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
  let previousHub: LatLngLiteral;
  return Object.entries(routes).reduce<{
    points: LatLngLiteral[];
    lines: { source: LatLngLiteral; target: LatLngLiteral }[];
  }>(
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

type StoryProps = Pick<GlobeRootProps, 'zoom' | 'translation' | 'rotation'> &
  Pick<GlobeCanvasProps, 'projection' | 'styles'> & {
    drag?: boolean;
    spin?: boolean;
    tour?: boolean;
    xAxis?: boolean;
  };

const DefaultStory = ({
  zoom: _zoom = 1,
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
  const [topology] = useTopology();
  const [airports] = useAsyncState(async () => (await import('../../../data/airports.ts')).default);

  const features = useMemo(() => {
    return airports ? createTrip(airports, routes, (dots?.objects.dots as any)?.geometries[0].coordinates) : undefined;
  }, [airports, routes, dots]);

  // Control hooks.
  const [startSpinner, stopSpinner] = useSpinner(controller.current, { disabled: !spin });
  const [_running, setRunning] = useTour(controller.current, features?.points, { disabled: !tour, styles });
  useDrag(controller.current, {
    xAxis,
    disabled: !drag,
    onUpdate: (event) => {
      switch (event.type) {
        case 'start': {
          stopSpinner();
          setRunning(false);
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
          setRunning(true);
        }
        break;
      }
      case 'zoom-in': {
        controller.current.setZoom((scale) => scale * 1.1);
        break;
      }
      case 'zoom-out': {
        controller.current.setZoom((scale) => scale * 0.9);
        break;
      }
    }
  };

  return (
    <Globe.Root classNames='absolute inset-0' zoom={_zoom} translation={translation} rotation={rotation}>
      <Globe.Canvas
        ref={controller}
        topology={styles?.dots ? dots : topology}
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

const meta = {
  title: 'ui/react-ui-geo/Globe',
  component: Globe.Root,
  render: DefaultStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

export const Earth1 = () => {
  const [topology] = useTopology();
  const [controller, setController] = useState<GlobeController | null>();
  const handleAction = useGlobeZoomHandler(controller);
  useDrag(controller);

  return (
    <Globe.Root zoom={1.2} rotation={[Math.random() * 360, 0, 0]}>
      <Globe.Canvas ref={setController} topology={topology} styles={defaultStyles} />
      <Globe.Zoom onAction={handleAction} />
    </Globe.Root>
  );
};

export const Earth2 = () => {
  const [topology] = useTopology();
  const [controller, setController] = useState<GlobeController | null>();
  const handleAction = useGlobeZoomHandler(controller);
  useDrag(controller);

  return (
    <div className='absolute bottom-0 left-0 right-0 '>
      <Globe.Root classNames='h-[400px]' zoom={2.8} translation={{ x: 0, y: 400 }}>
        <Globe.Canvas ref={setController} topology={topology} styles={defaultStyles} />
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
  const [topology] = useTopology();
  const [controller, setController] = useState<GlobeController | null>();
  const handleAction = useGlobeZoomHandler(controller);
  useDrag(controller);

  return (
    <Globe.Root classNames='flex grow overflow-hidden' zoom={0.7} rotation={initialRotation}>
      <Globe.Canvas ref={setController} topology={topology} projection='mercator' styles={monochrome} />
      <Globe.Zoom onAction={handleAction} />
    </Globe.Root>
  );
};

type Story = StoryObj<typeof DefaultStory>;

export const Globe1: Story = {
  args: {
    drag: true,
    projection: 'mercator',
    zoom: 0.8,
    rotation: initialRotation,
    styles: defaultStyles,
  },
};

export const Globe2: Story = {
  args: {
    drag: true,
    projection: 'transverse-mercator',
    zoom: 0.8,
    rotation: initialRotation,
    styles: defaultStyles,
  },
};

export const Globe3: Story = {
  args: {
    drag: true,
    spin: true,
    zoom: 1.5,
    rotation: initialRotation,
    styles: defaultStyles,
  },
};

export const Globe4: Story = {
  args: {
    drag: true,
    tour: true,
    zoom: 2,
    rotation: initialRotation,
    styles: defaultStyles,
  },
};

export const Globe5: Story = {
  args: {
    drag: true,
    tour: true,
    zoom: 0.9,
    rotation: initialRotation,
    styles: dotStyles,
  },
};

export const Globe6: Story = {
  args: {
    drag: true,
    xAxis: true,
    tour: true,
    zoom: 2,
    translation: { x: 0, y: 600 },
    rotation: [0, -20, 0],
    styles: dotStyles,
  },
};
