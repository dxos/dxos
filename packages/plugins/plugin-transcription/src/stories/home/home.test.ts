//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Applied, HOME_TOOLS, type HomeState, applyCall, formatCall, initialHome } from './home.ts';

const applied = (result: Applied): Extract<Applied, { state: HomeState }> => {
  if ('error' in result) {
    throw new Error(result.error);
  }
  return result;
};

describe('Home', () => {
  test('lights in one room, or all of them when none is named', ({ expect }) => {
    const kitchen = applied(applyCall(initialHome(), { name: 'set_lights', arguments: { room: 'kitchen', on: true } }));
    expect(kitchen.state.lights.kitchen.on).toBe(true);
    expect(kitchen.state.lights.bedroom.on).toBe(false);
    expect(kitchen.touched).toEqual(['kitchen']);

    const all = applied(applyCall(kitchen.state, { name: 'set_lights', arguments: { room: 'all', on: false } }));
    expect(Object.values(all.state.lights).every((light) => !light.on)).toBe(true);
    expect(all.summary).toBe('Lights off: all rooms');
  });

  test('a brightness means on, whatever the model put in `on`', ({ expect }) => {
    // Needle answered "dim the living room to 30" this way.
    const { state, summary } = applied(
      applyCall(initialHome(), { name: 'set_lights', arguments: { room: 'living room', brightness: 30, on: false } }),
    );
    expect(state.lights['living room']).toEqual({ on: true, brightness: 30 });
    expect(summary).toBe('Lights at 30%: living room');
  });

  test('thermostat: a named temperature wins over a step', ({ expect }) => {
    const set = applied(
      applyCall(initialHome(), { name: 'set_thermostat', arguments: { temperature: 21, change: 'warmer' } }),
    );
    expect(set.state.temperature).toBe(21);
    const warmer = applied(applyCall(set.state, { name: 'set_thermostat', arguments: { change: 'warmer' } }));
    expect(warmer.state.temperature).toBe(22);
    expect(applyCall(set.state, { name: 'set_thermostat', arguments: {} })).toEqual({
      error: 'No temperature or change',
    });
  });

  test('doors: opening unlocks, locking closes', ({ expect }) => {
    const open = applied(
      applyCall(initialHome(), { name: 'operate_door', arguments: { door: 'front door', action: 'open' } }),
    );
    expect(open.state.doors['front door']).toEqual({ locked: false, open: true });
    const locked = applied(
      applyCall(open.state, { name: 'operate_door', arguments: { door: 'front door', action: 'lock' } }),
    );
    expect(locked.state.doors['front door']).toEqual({ locked: true, open: false });
    expect(
      applyCall(open.state, { name: 'operate_door', arguments: { door: 'window', action: 'open' } }),
    ).toHaveProperty('error');
  });

  test('music keeps its room and volume unless the call names them', ({ expect }) => {
    const play = applied(
      applyCall(initialHome(), { name: 'play_music', arguments: { room: 'kitchen', action: 'play' } }),
    );
    expect(play.state.music).toEqual({ room: 'kitchen', playing: true, volume: 40 });
    const pause = applied(applyCall(play.state, { name: 'play_music', arguments: { action: 'pause' } }));
    expect(pause.state.music).toEqual({ room: 'kitchen', playing: false, volume: 40 });
  });

  test('every tool is handled', ({ expect }) => {
    for (const tool of HOME_TOOLS) {
      expect(applyCall(initialHome(), { name: tool.name, arguments: {} })).not.toEqual({
        error: `Unknown tool ${tool.name}`,
      });
    }
    expect(formatCall({ name: 'set_lights', arguments: { room: 'kitchen', on: true } })).toBe(
      'set_lights(room: kitchen, on: true)',
    );
  });
});
