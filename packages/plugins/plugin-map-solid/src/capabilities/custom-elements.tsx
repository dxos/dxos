//
// Copyright 2025 DXOS.org
//

import * as Predicate from 'effect/Predicate';
import { customElement, noShadowDOM } from 'solid-element';
import { createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';

import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery, useSchema } from '@dxos/echo-solid';
// @ts-expect-error - useRef is exported but types may not be available yet
import { useRef } from '@dxos/echo-solid';
import { getTypenameFromQuery } from '@dxos/schema';
import { type GeoMarker, Globe, Map, type MapController } from '@dxos/solid-ui-geo';
import { getDeep } from '@dxos/util';

// Track component instances for debugging
let instanceCounter = 0;

/**
 * @noUseSignals
 */
const MapComponent = (props: any) => {
  // Disable Shadow DOM to allow global Leaflet CSS to apply.
  // Must be called inside component where it has access to element context.
  noShadowDOM();

  const instanceId = ++instanceCounter;
  // eslint-disable-next-line no-console
  console.log(`[MapComponent#${instanceId}] Component rendering/re-rendering`, {
    hasType: 'type' in props,
    hasObject: 'object' in props,
    hasData: 'data' in props,
  });

  // Make props reactive by wrapping in memos
  // In solid-element, props are reactive but we need to access them properly
  const typeProp = createMemo(() => (typeof props.type === 'function' ? props.type() : props.type) || 'map');
  const objectProp = createMemo(() => {
    const obj = typeof props.object === 'function' ? props.object() : props.object;
    const data = typeof props.data === 'function' ? props.data() : props.data;
    return obj || data?.subject;
  });
  const centerProp = createMemo(() => (typeof props.center === 'function' ? props.center() : props.center));
  const zoomProp = createMemo(() => (typeof props.zoom === 'function' ? props.zoom() : props.zoom));
  const onChangeProp = createMemo(() => (typeof props.onChange === 'function' ? props.onChange() : props.onChange));

  const [type, setType] = createSignal(typeProp());
  const [controller, setController] = createSignal<MapController | null>(null);

  // Sync type signal with prop changes
  createEffect(() => {
    const newType = typeProp();
    if (newType !== type()) {
      // eslint-disable-next-line no-console
      console.log(`[MapComponent#${instanceId}] Type prop changed, updating signal:`, newType);
      setType(newType);
    }
  });

  // Track component lifecycle
  onMount(() => {
    // eslint-disable-next-line no-console
    console.log(`[MapComponent#${instanceId}] Component mounted`);
  });

  onCleanup(() => {
    // eslint-disable-next-line no-console
    console.log(`[MapComponent#${instanceId}] Component unmounting/cleaning up`);
  });

  // Create zoom handler that uses the controller
  const handleZoomAction = (action: string) => {
    const ctrl = controller();
    if (!ctrl) return;
    switch (action) {
      case 'zoom-in':
        ctrl.setZoom((z) => z + 1);
        break;
      case 'zoom-out':
        ctrl.setZoom((z) => z - 1);
        break;
    }
  };

  // Use useObject to get reactive updates when the object or its properties change
  // Always call useObject, but it will return undefined if objectRaw is undefined
  const objectValue = objectProp();
  // eslint-disable-next-line no-console
  console.log(`[MapComponent#${instanceId}] objectProp - has object:`, !!objectValue, 'object:', objectValue);
  const object = objectValue ? useObject(objectValue) : createMemo(() => undefined);

  // Get view reactively - useObject for the view property, then useRef to get the target
  const objForView = object();
  const viewRefAccessor = objForView ? useObject(objForView, 'view') : createMemo(() => undefined);

  // Use useRef to get the target of the view ref reactively
  // useRef internally creates a memo that tracks the ref parameter
  // We pass the current ref value - useRef's internal memo will track when it changes
  const currentViewRef = viewRefAccessor();
  const view = useRef(currentViewRef);

  // Track view changes for debugging
  createEffect(() => {
    const vr = viewRefAccessor();
    const v = view();
    // eslint-disable-next-line no-console
    console.log(
      `[MapComponent#${instanceId}] view - has viewRef:`,
      !!vr,
      'viewRef:',
      vr,
      'has view target:',
      !!v,
      'view:',
      v,
    );
  });

  const db = createMemo(() => {
    const obj = object();
    const database = obj ? Obj.getDatabase(obj) : undefined;
    // eslint-disable-next-line no-console
    console.log(`[MapComponent#${instanceId}] db memo - has db:`, !!database);
    return database;
  });
  const typename = createMemo(() => {
    const v = view();
    const tn = v?.query ? getTypenameFromQuery(v.query.ast) : undefined;
    // eslint-disable-next-line no-console
    console.log(`[MapComponent#${instanceId}] typename memo - typename:`, tn);
    return tn;
  });

  // Use echo-solid hooks for reactive schema and query
  // Pass accessors directly - hooks will resolve them reactively
  const schema = useSchema(db, typename);
  const filter = createMemo(() => {
    const s = schema();
    const f = s ? Filter.type(s) : Filter.nothing();
    // eslint-disable-next-line no-console
    console.log(`[MapComponent#${instanceId}] filter memo - has schema:`, !!s, 'filter:', f);
    return f;
  });
  const objects = useQuery(db, filter);

  // Track when objects become available
  createEffect(() => {
    const objs = objects();
    // eslint-disable-next-line no-console
    console.log(`[MapComponent#${instanceId}] objects effect - count:`, objs.length, 'objects:', objs);
  });

  // Transform objects to markers
  const markers = createMemo(() => {
    const v = view();
    const objs = objects();
    // eslint-disable-next-line no-console
    console.log(`[MapComponent#${instanceId}] Computing markers - view:`, !!v, 'objects:', objs.length);

    if (!v || !objs.length) {
      // eslint-disable-next-line no-console
      console.log(`[MapComponent#${instanceId}] No view or objects, returning empty markers`);
      return [];
    }

    const result = objs
      .map((row: any): GeoMarker | undefined => {
        if (!v.projection?.pivotFieldId) {
          // eslint-disable-next-line no-console
          console.log(`[MapComponent#${instanceId}] No pivotFieldId for row:`, row.id);
          return undefined;
        }

        const field = v.projection.fields?.find((f: any) => f.id === v.projection.pivotFieldId);
        const geopoint = field?.path && getDeep(row, field.path.split('.'));

        if (!geopoint || !Array.isArray(geopoint) || geopoint.length < 2) {
          // eslint-disable-next-line no-console
          console.log(`[MapComponent#${instanceId}] No valid geopoint for row:`, row.id, 'geopoint:', geopoint);
          return undefined;
        }

        const [lng, lat] = geopoint;
        if (typeof lng !== 'number' || typeof lat !== 'number') {
          // eslint-disable-next-line no-console
          console.log(
            `[MapComponent#${instanceId}] Invalid lat/lng types for row:`,
            row.id,
            'lng:',
            typeof lng,
            'lat:',
            typeof lat,
          );
          return undefined;
        }

        // eslint-disable-next-line no-console
        console.log(`[MapComponent#${instanceId}] Creating marker for row:`, row.id, 'location:', { lat, lng });
        return { id: row.id, location: { lat, lng } };
      })
      .filter(Predicate.isNotNullable);

    // eslint-disable-next-line no-console
    console.log(`[MapComponent#${instanceId}] Final markers count:`, result.length, result);
    return result;
  });

  // Render both Map and Globe, show/hide via CSS instead of Show component
  // This prevents component remounting when switching
  // eslint-disable-next-line no-console
  console.log(
    `[MapComponent#${instanceId}] Rendering - markers accessor type:`,
    typeof markers,
    'current value:',
    markers(),
  );

  return (
    <>
      <div style={{ display: type() === 'map' ? 'contents' : 'none' }}>
        <Map.Root
          ref={setController}
          center={centerProp()}
          zoom={zoomProp()}
          onChange={(e: any) => {
            const handler = onChangeProp();
            if (handler) handler(e);
          }}
        >
          <Map.Tiles />
          <Map.Markers markers={markers} />
          <Map.Zoom onAction={handleZoomAction} />
          <Map.Action onAction={(action: string) => action === 'toggle' && setType('globe')} />
        </Map.Root>
      </div>
      <div style={{ display: type() === 'globe' ? 'contents' : 'none' }}>
        <Globe.Root>
          <Globe.Canvas />
          <Globe.Zoom />
          <Globe.Action onAction={(action: string) => action === 'toggle' && setType('map')} />
        </Globe.Root>
      </div>
    </>
  );
};

customElement(
  'dx-map',
  {
    object: undefined,
    center: undefined,
    zoom: undefined,
    type: 'map',
    onChange: undefined,
    onToggle: undefined,
    data: undefined,
    role: undefined,
  },
  MapComponent,
);
