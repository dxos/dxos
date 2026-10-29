//
// Copyright 2026 DXOS.org
//

// Ported from lighthouse `web/src/kit/geo.tsx` (LocationHover, MiniMap), on react-ui's HoverCard (delayed hover,
// keyboard focus, Escape) and react-ui-geo's Map (Leaflet, react-leaflet).

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import React, { type PropsWithChildren, useEffect } from 'react';
import { AttributionControl, Circle, CircleMarker, TileLayer, useMap } from 'react-leaflet';

import { Map } from '@dxos/react-ui-geo';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as HoverCard from '@dxos/react-ui/HoverCard';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';

import { meta } from '#meta';

import { type MapPoint, OSM_ATTRIBUTION, OSM_TILES, coordinatesLine, googleLink, isPrecise, osmLink } from './osm.ts';

const ACCENT = '#2f6fdb';

/** Frames the point: the precision ring when it is approximate, else the street around the pin. */
const Frame = ({ point }: { point: MapPoint }) => {
  const map = useMap();
  useEffect(() => {
    const at = L.latLng(point.lat, point.lng);
    if (isPrecise(point)) {
      map.setView(at, 16);
    } else {
      map.fitBounds(at.toBounds((point.precisionM ?? 0) * 2), { padding: [24, 24], maxZoom: 17 });
    }
  }, [map, point.lat, point.lng, point.precisionM]);
  return null;
};

export type MiniMapProps = { point: MapPoint; label?: string; classNames?: string };

/** A small, still OSM map centred on a point: the pin, and its precision ring when it is approximate. */
export const MiniMap = ({ point, label, classNames }: MiniMapProps) => (
  <div role='img' aria-label={label ? `Map of ${label}` : 'Map'} className={classNames ?? 'h-40 w-full'}>
    <Map.Root>
      <Map.Viewport
        center={{ lat: point.lat, lng: point.lng }}
        zoom={16}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        classNames='h-full'
      >
        <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} maxZoom={19} className='dark:grayscale dark:invert' />
        <AttributionControl position='bottomright' prefix={false} />
        {!isPrecise(point) && (
          <Circle
            center={[point.lat, point.lng]}
            radius={point.precisionM ?? 0}
            interactive={false}
            pathOptions={{ color: ACCENT, weight: 1.5, opacity: 0.5, dashArray: '4 4', fillOpacity: 0.12 }}
          />
        )}
        <CircleMarker
          center={[point.lat, point.lng]}
          radius={7}
          interactive={false}
          pathOptions={{ color: '#fff', weight: 2.5, fillColor: ACCENT, fillOpacity: 1 }}
        />
        <Frame point={point} />
      </Map.Viewport>
    </Map.Root>
  </div>
);

export type LocationPopoverProps = PropsWithChildren<{
  point: MapPoint;
  /** The address as one line, most specific first. */
  address: string;
}>;

/**
 * A location row with a map behind it: hovering the row for a moment (or focusing it) opens a card beside it with a
 * small OSM map of the place, the address, and links out. It stays open while the pointer is over it, and closes on
 * leave, blur or Escape.
 */
export const LocationPopover = ({ point, address, children }: LocationPopoverProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <HoverCard.Root openDelay={280} closeDelay={180} positioning={{ placement: 'right-start' }}>
      <HoverCard.Trigger asChild>
        <span
          tabIndex={0}
          // A click inside a card must not select the card.
          onClick={(event) => event.stopPropagation()}
          className='block min-w-0 truncate cursor-help underline decoration-dotted decoration-separator underline-offset-[3px] rounded-xs dx-focus-ring'
          data-testid='lighthouse.card.location'
        >
          {children}
        </span>
      </HoverCard.Trigger>
      <HoverCard.Content arrow={false} classNames='p-0 w-[300px] overflow-hidden' data-testid='lighthouse.geo.popover'>
        <MiniMap point={point} label={address} />
        <Layout.Flex column gap='xs' classNames='px-2.5 pt-2 pb-2.5 text-sm'>
          <Layout.Flex gap='xs' align='center' classNames='font-medium'>
            <Icon.Icon icon='ph--map-pin--regular' />
            <span className='min-w-0'>{address}</span>
          </Layout.Flex>
          <span className='text-xs text-fg-subtle tabular-nums'>{coordinatesLine(point)}</span>
          <Layout.Flex gap='md'>
            <Typography.Link href={osmLink(point)} target='_blank' rel='noopener' data-testid='lighthouse.geo.osm'>
              {t('geo-osm.label')}
            </Typography.Link>
            <Typography.Link
              href={googleLink(point)}
              target='_blank'
              rel='noopener'
              data-testid='lighthouse.geo.google'
            >
              {t('geo-google.label')}
            </Typography.Link>
          </Layout.Flex>
        </Layout.Flex>
      </HoverCard.Content>
    </HoverCard.Root>
  );
};
