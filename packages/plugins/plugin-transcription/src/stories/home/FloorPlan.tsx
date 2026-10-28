//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import * as Icon from '@dxos/react-ui/Icon';
import { mx } from '@dxos/ui-theme';

import { type Door, type HomeState, type Room, ROOMS } from './home.ts';

/** Where each room and door sits on the plan; the garage holds only its door. */
const AREAS: Record<Room | 'garage', string> = {
  'bedroom': 'bedroom',
  'bathroom': 'bathroom',
  'study': 'study',
  'hallway': 'hallway',
  'living room': 'living',
  'kitchen': 'kitchen',
  'garage': 'garage',
};

const TEMPLATE = `
  'bedroom bathroom study'
  'hallway hallway garage'
  'living living kitchen'
`;

/** The door shown in each area. */
const DOOR_IN: Partial<Record<Room | 'garage', Door>> = {
  hallway: 'front door',
  kitchen: 'back door',
  garage: 'garage door',
};

/** Light overlay opacity for the dimmest and brightest light; capped so the room's text stays readable. */
const GLOW_MIN = 0.15;
const GLOW_MAX = 0.5;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const Badge = ({ icon, label, active }: { icon: string; label: string; active?: boolean }) => (
  <span className={mx('flex items-center gap-1 text-xs', active ? 'text-fg' : 'text-fg-muted')}>
    <Icon.Icon icon={icon} size='xs' />
    {label}
  </span>
);

const DoorBadge = ({ door, state }: { door: Door; state: HomeState['doors'][Door] }) => (
  <Badge
    icon={
      state.open ? 'ph--door-open--regular' : state.locked ? 'ph--lock-simple--fill' : 'ph--lock-simple-open--regular'
    }
    label={`${capitalize(door)} ${state.open ? 'open' : state.locked ? 'locked' : 'unlocked'}`}
    active={state.open || !state.locked}
  />
);

const Area = ({
  area,
  title,
  glow = 0,
  touched,
  children,
}: {
  area: string;
  title: string;
  glow?: number;
  touched?: boolean;
  children: ReactNode;
}) => (
  <div
    style={{ gridArea: area }}
    className={mx(
      'relative flex flex-col gap-1 p-2 rounded-sm border overflow-hidden transition-shadow',
      glow > 0 ? 'border-amber-border' : 'border-separator',
      touched && 'ring-2 ring-accent-bg',
    )}
  >
    {/* Light level: the room fills with warm light in proportion to its brightness. */}
    <div
      className='dx-cover bg-amber-surface transition-opacity duration-300 pointer-events-none'
      style={{ opacity: glow }}
    />
    <span className='relative text-sm font-medium'>{title}</span>
    <div className='relative flex flex-col gap-1'>{children}</div>
  </div>
);

export type FloorPlanProps = {
  home: HomeState;
  /** Rooms and doors the latest command changed. */
  touched?: string[];
};

/** A mock home: lights, blinds, doors, the thermostat and music, as the voice commands leave them. */
export const FloorPlan = ({ home, touched = [] }: FloorPlanProps) => (
  <div className='grid grid-cols-3 auto-rows-[minmax(7rem,auto)] gap-1 p-2' style={{ gridTemplateAreas: TEMPLATE }}>
    {ROOMS.map((room) => {
      const light = home.lights[room];
      const door = DOOR_IN[room];
      const music = home.music.room === room && home.music.playing;
      return (
        <Area
          key={room}
          area={AREAS[room]}
          title={capitalize(room)}
          glow={light.on ? GLOW_MIN + ((GLOW_MAX - GLOW_MIN) * light.brightness) / 100 : 0}
          touched={touched.includes(room) || (door !== undefined && touched.includes(door))}
        >
          <Badge
            icon={light.on ? 'ph--lightbulb--fill' : 'ph--lightbulb--regular'}
            label={light.on ? (light.brightness < 100 ? `${light.brightness}%` : 'On') : 'Off'}
            active={light.on}
          />
          <Badge
            icon='ph--sun-horizon--regular'
            label={home.blinds[room] ? 'Blinds open' : 'Blinds closed'}
            active={home.blinds[room]}
          />
          {room === 'hallway' && (
            <Badge icon='ph--thermometer-simple--regular' label={`Thermostat ${home.temperature} °C`} active />
          )}
          {music && <Badge icon='ph--music-notes--fill' label={`Music ${home.music.volume}%`} active />}
          {door && <DoorBadge door={door} state={home.doors[door]} />}
        </Area>
      );
    })}
    <Area area={AREAS.garage} title='Garage' touched={touched.includes('garage door')}>
      <Icon.Icon icon='ph--garage--regular' size='lg' classNames='text-fg-subtle' />
      <DoorBadge door='garage door' state={home.doors['garage door']} />
    </Area>
  </div>
);
