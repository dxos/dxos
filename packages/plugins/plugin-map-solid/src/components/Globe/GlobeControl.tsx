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
  useTour,
} from '@dxos/solid-ui-geo';
import { isNonNullable } from '@dxos/util';

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
  selected?: () => string[];
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
  const handleZoomAction = createMemo(() => useGlobeZoomHandler(controller()));
  let setRunning: ((running: boolean | ((prev: boolean) => boolean)) => void) | undefined;

  const [moved, setMoved] = createSignal(false);

  const features = createMemo(() => {
    const markerList = props.markers?.() ?? [];
    return {
      points: markerList.map(({ location: { lat, lng } }) => ({ lat, lng })),
      lines: [],
    };
  });

  const selectedPoints = createMemo(() => {
    const selected = props.selected?.() ?? [];
    if (selected.length === 0) {
      return features().points;
    }

    const markerList = props.markers?.() ?? [];
    const points = selected
      .map((id) => {
        const marker = markerList.find((marker) => marker.id === id);
        return marker ? marker.location : undefined;
      })
      .filter(isNonNullable);

    return points;
  });

  // TODO(burdon): Redo.
  const [active, setActive] = createSignal(false);

  createEffect(() => {
    const ctrl = controller();
    if (ctrl) {
      useDrag(ctrl, {
        onUpdate: () => setMoved(true),
      });

      const tourResult = useTour(ctrl, selectedPoints().length ? selectedPoints() : features().points, {
        running: active(),
        loop: true,
        styles: styles(),
        autoRotate: !moved(),
      });
      setRunning = tourResult.setRunning;
    }
  });

  createEffect(() => setActive(selectedPoints().length > 0));

  const handleAction: ControlProps['onAction'] = (action) => {
    switch (action) {
      case 'toggle': {
        props.onToggle?.();
        break;
      }

      case 'start': {
        setRunning?.((running) => !running);
        setMoved(false);
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
      <Globe.Zoom onAction={handleZoomAction()} />
    </Globe.Root>
  );
};
