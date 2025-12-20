//
// Copyright 2025 DXOS.org
//

import { createEffect, createMemo, createResource, createSignal } from 'solid-js';

import {
  type ControlProps,
  Globe,
  type GlobeController,
  type StyleSet,
  loadTopology,
  useDrag,
  useGlobeZoomHandler,
} from '@dxos/solid-ui-geo';

import { type GeoControlProps } from '../types';

// Globe styles matching react-ui-geo.
const getGlobeStyles = (themeMode: 'dark' | 'light'): StyleSet =>
  themeMode === 'dark'
    ? {
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
        line: {
          lineWidth: 1.5,
          lineDash: [4, 16],
          strokeStyle: '#333',
        },
        point: {
          radius: 0.2,
          fillStyle: 'red',
        },
      }
    : {
        water: {
          fillStyle: '#fff',
        },
        land: {
          fillStyle: '#f5f5f5',
          strokeStyle: '#ccc',
        },
        graticule: {
          strokeStyle: '#ddd',
        },
        line: {
          lineWidth: 1.5,
          lineDash: [4, 16],
          strokeStyle: '#333',
        },
        point: {
          radius: 0.2,
          fillStyle: 'red',
        },
      };

export type GlobeControlProps = GeoControlProps & {
  class?: string;
};

export const GlobeControl = (props: GlobeControlProps) => {
  const [topology] = createResource(loadTopology);

  // Get theme mode (check document class for dark mode).
  const themeMode = createMemo(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const styles = createMemo(() => getGlobeStyles(themeMode()));

  const [controller, setController] = createSignal<GlobeController | null>(null);

  // Control hooks - must be called unconditionally (aligned with globe stories).
  let handleZoomAction: ControlProps['onAction'] | undefined;

  createEffect(() => {
    const ctrl = controller();
    if (ctrl) {
      useDrag(ctrl);
      handleZoomAction = useGlobeZoomHandler(ctrl);
    }
  });

  const features = createMemo(() => {
    const markerList = props.markers?.() ?? [];
    return {
      points: markerList.map(({ location: { lat, lng } }) => ({ lat, lng })),
      lines: [],
    };
  });

  const handleAction: ControlProps['onAction'] = (action) => {
    switch (action) {
      case 'toggle': {
        props.onToggle?.();
        break;
      }
    }
  };

  return (
    <Globe.Root class={props.class} center={props.center} zoom={props.zoom}>
      <Globe.Canvas
        ref={setController}
        topology={topology()}
        projection='orthographic'
        features={features()}
        styles={styles()}
      />
      <Globe.Action onAction={handleAction} />
      <Globe.Zoom onAction={handleZoomAction} />
    </Globe.Root>
  );
};
