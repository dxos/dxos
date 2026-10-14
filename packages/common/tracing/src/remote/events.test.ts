//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type EventAttributes, RemoteEvents } from './events.ts';

type Recorded = { name: string; attributes: EventAttributes };

const recorder = () => {
  const recorded: Recorded[] = [];
  return {
    recorded,
    processor: { emit: (name: string, attributes: EventAttributes) => recorded.push({ name, attributes }) },
  };
};

describe('RemoteEvents', () => {
  test('is inert without a processor', () => {
    const events = new RemoteEvents();
    events.emit('dxos.test.event', { id: 'a' });
  });

  test('fans each event out to every registered processor', ({ expect }) => {
    const events = new RemoteEvents();
    const first = recorder();
    const second = recorder();
    events.registerProcessor(first.processor);
    events.registerProcessor(second.processor);

    events.emit('dxos.test.event', { id: 'a' });

    expect(first.recorded).toEqual([{ name: 'dxos.test.event', attributes: { id: 'a' } }]);
    expect(second.recorded).toEqual(first.recorded);
  });

  test('does not replay events emitted before a processor registers', ({ expect }) => {
    const events = new RemoteEvents();
    events.emit('dxos.test.event', { id: 'early' });
    const { recorded, processor } = recorder();
    events.registerProcessor(processor);

    events.emit('dxos.test.event', { id: 'late' });

    expect(recorded.map(({ attributes }) => attributes.id)).toEqual(['late']);
  });

  test('stops delivering once a processor unregisters', ({ expect }) => {
    const events = new RemoteEvents();
    const { recorded, processor } = recorder();
    events.registerProcessor(processor);
    events.unregisterProcessor(processor);

    events.emit('dxos.test.event', { id: 'a' });

    expect(recorded).toEqual([]);
  });

  test('a throwing processor neither fails the emitter nor starves the others', ({ expect }) => {
    const failures: unknown[] = [];
    const events = new RemoteEvents({ onError: (err) => failures.push(err) });
    const failure = new Error('processor failed');
    const { recorded, processor } = recorder();
    events.registerProcessor({
      emit: () => {
        throw failure;
      },
    });
    events.registerProcessor(processor);

    expect(() => events.emit('dxos.test.event', { id: 'a' })).not.toThrow();
    expect(recorded).toHaveLength(1);
    expect(failures).toEqual([failure]);
  });
});
