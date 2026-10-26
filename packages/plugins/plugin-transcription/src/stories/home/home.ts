//
// Copyright 2026 DXOS.org
//

import { type NeedleCall, type NeedleTool } from '../../whistle/protocol.ts';

/**
 * A mock home the `Home` story controls by voice: its state, the tools Needle chooses between, and what each
 * call does. Pure, so the mapping from a call to a change is tested without a model.
 */

export const ROOMS = ['living room', 'kitchen', 'bedroom', 'bathroom', 'hallway', 'study'] as const;
export type Room = (typeof ROOMS)[number];

/** Not a room: what a request that names none means for lights and blinds. */
const ALL = 'all';

export const DOORS = ['front door', 'back door', 'garage door'] as const;
export type Door = (typeof DOORS)[number];

const DOOR_ACTIONS = ['lock', 'unlock', 'open', 'close'] as const;
const MUSIC_ACTIONS = ['play', 'pause'] as const;
const CHANGES = ['warmer', 'cooler'] as const;

export const MIN_TEMPERATURE = 10;
export const MAX_TEMPERATURE = 30;

/** Degrees per "warmer" or "cooler". */
const TEMPERATURE_STEP = 1;

export type Light = { on: boolean; brightness: number };
export type DoorState = { locked: boolean; open: boolean };

export type HomeState = {
  lights: Record<Room, Light>;
  blinds: Record<Room, boolean>;
  doors: Record<Door, DoorState>;
  temperature: number;
  music: { room: Room; playing: boolean; volume: number };
};

const byRoom = <T>(make: (room: Room) => T): Record<Room, T> => ({
  'living room': make('living room'),
  'kitchen': make('kitchen'),
  'bedroom': make('bedroom'),
  'bathroom': make('bathroom'),
  'hallway': make('hallway'),
  'study': make('study'),
});

export const initialHome = (): HomeState => ({
  lights: byRoom(() => ({ on: false, brightness: 100 })),
  blinds: byRoom(() => true),
  doors: {
    'front door': { locked: true, open: false },
    'back door': { locked: true, open: false },
    'garage door': { locked: false, open: false },
  },
  temperature: 20,
  music: { room: 'living room', playing: false, volume: 40 },
});

const roomProperty = (fallback: string) => ({
  type: 'string',
  enum: [...ROOMS, ALL],
  default: fallback,
  description: fallback === ALL ? 'which room; all rooms when none is named' : 'which room',
});

/**
 * Five tools, so all of them stay in context (Needle retrieves five of a larger set). One tool per action,
 * enums in the words people say, and defaults for what a request may leave out, after
 * https://cactuscompute.com/blog/designing-tools-for-needle.
 */
export const HOME_TOOLS: NeedleTool[] = [
  {
    name: 'set_lights',
    description: 'Turn the lights on or off, or dim them, in one room or all of them',
    parameters: {
      type: 'object',
      properties: {
        room: roomProperty(ALL),
        on: { type: 'boolean' },
        brightness: { type: 'integer', minimum: 0, maximum: 100, description: 'percent' },
      },
      required: ['on'],
    },
  },
  {
    name: 'set_thermostat',
    description: 'Set the heating to a temperature, or make the house warmer or cooler',
    parameters: {
      type: 'object',
      properties: {
        temperature: {
          type: 'integer',
          minimum: MIN_TEMPERATURE,
          maximum: MAX_TEMPERATURE,
          description: 'target temperature in Celsius',
        },
        change: { type: 'string', enum: [...CHANGES], description: 'a step up or down when no temperature is named' },
      },
    },
  },
  {
    name: 'operate_door',
    description: 'Lock, unlock, open or close a door',
    parameters: {
      type: 'object',
      properties: {
        door: { type: 'string', enum: [...DOORS] },
        action: { type: 'string', enum: [...DOOR_ACTIONS] },
      },
      required: ['door', 'action'],
    },
  },
  {
    name: 'set_blinds',
    description: 'Open or close the blinds',
    parameters: {
      type: 'object',
      properties: {
        room: roomProperty(ALL),
        open: { type: 'boolean' },
      },
      required: ['open'],
    },
  },
  {
    name: 'play_music',
    description: 'Play or pause music, or change its volume',
    parameters: {
      type: 'object',
      properties: {
        room: roomProperty('living room'),
        action: { type: 'string', enum: [...MUSIC_ACTIONS] },
        volume: { type: 'integer', minimum: 0, maximum: 100 },
      },
      required: ['action'],
    },
  },
];

/** Facts the model resolves requests against. */
export const HOME_SYSTEM = 'device: home hub; locale: en-GB';

/** A call's effect: the new state, a line saying what changed, and the rooms and doors it touched. */
export type Applied = { state: HomeState; summary: string; touched: string[] } | { error: string };

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  values.some((candidate) => candidate === value);

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The rooms an optional `room` argument names; an unknown or missing room means `fallback`. */
const targetRooms = (value: unknown, fallback: Room[]): Room[] => (isOneOf(ROOMS, value) ? [value] : fallback);

const describeRooms = (rooms: Room[]) => (rooms.length === ROOMS.length ? 'all rooms' : rooms.join(', '));

/** Applies one call to the home; arguments are checked here, not trusted from the model. */
export const applyCall = (state: HomeState, { name, arguments: args }: NeedleCall): Applied => {
  switch (name) {
    case 'set_lights': {
      const rooms = targetRooms(args.room, [...ROOMS]);
      const brightness = asNumber(args.brightness);
      // A brightness above zero means the lights are on, whatever `on` says ("dim the kitchen to 30").
      const on = brightness !== undefined ? brightness > 0 : args.on !== false;
      const lights = { ...state.lights };
      for (const room of rooms) {
        lights[room] = { on, brightness: brightness !== undefined && brightness > 0 ? clamp(brightness, 1, 100) : 100 };
      }
      const level = on
        ? brightness !== undefined && brightness > 0
          ? `at ${clamp(brightness, 1, 100)}%`
          : 'on'
        : 'off';
      return { state: { ...state, lights }, summary: `Lights ${level}: ${describeRooms(rooms)}`, touched: rooms };
    }

    case 'set_thermostat': {
      const target = asNumber(args.temperature);
      const step = args.change === 'warmer' ? TEMPERATURE_STEP : args.change === 'cooler' ? -TEMPERATURE_STEP : 0;
      if (target === undefined && step === 0) {
        return { error: 'No temperature or change' };
      }
      // A named temperature wins over a step the model added beside it.
      const temperature = clamp(target ?? state.temperature + step, MIN_TEMPERATURE, MAX_TEMPERATURE);
      return { state: { ...state, temperature }, summary: `Thermostat set to ${temperature} °C`, touched: ['hallway'] };
    }

    case 'operate_door': {
      if (!isOneOf(DOORS, args.door) || !isOneOf(DOOR_ACTIONS, args.action)) {
        return { error: 'Unknown door or action' };
      }
      const door = args.door;
      const current = state.doors[door];
      const next: DoorState =
        args.action === 'lock'
          ? { locked: true, open: false }
          : args.action === 'unlock'
            ? { locked: false, open: current.open }
            : args.action === 'open'
              ? { locked: false, open: true }
              : { locked: current.locked, open: false };
      const verb = { lock: 'locked', unlock: 'unlocked', open: 'opened', close: 'closed' }[args.action];
      return {
        state: { ...state, doors: { ...state.doors, [door]: next } },
        summary: `${capitalize(door)} ${verb}`,
        touched: [door],
      };
    }

    case 'set_blinds': {
      const rooms = targetRooms(args.room, [...ROOMS]);
      const open = args.open !== false;
      const blinds = { ...state.blinds };
      for (const room of rooms) {
        blinds[room] = open;
      }
      return {
        state: { ...state, blinds },
        summary: `Blinds ${open ? 'open' : 'closed'}: ${describeRooms(rooms)}`,
        touched: rooms,
      };
    }

    case 'play_music': {
      if (!isOneOf(MUSIC_ACTIONS, args.action)) {
        return { error: 'Unknown music action' };
      }
      const [room] = targetRooms(args.room, [state.music.room]);
      const volume = asNumber(args.volume);
      const music = {
        room,
        playing: args.action === 'play',
        volume: volume !== undefined ? clamp(volume, 0, 100) : state.music.volume,
      };
      const summary = music.playing
        ? `Music playing in the ${room}${volume !== undefined ? ` at ${music.volume}%` : ''}`
        : 'Music paused';
      return { state: { ...state, music }, summary, touched: [room] };
    }

    default:
      return { error: `Unknown tool ${name}` };
  }
};

/** A call as one line: `set_lights(room: kitchen, on: true)`. */
export const formatCall = ({ name, arguments: args }: NeedleCall) =>
  `${name}(${Object.entries(args)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(', ')})`;
