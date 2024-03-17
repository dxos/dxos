//
// Copyright 2024 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { type EchoObject, type Filter, filterMatch, getAutomergeObjectCore } from '@dxos/echo-schema';

import { type Signal, SignalBusInterconnect } from '../signal';

type UnsubscribeCallback = () => void;

export class SignalTrigger {
  public static readonly fromMutations = (space: Space) => new MutationsSignalTriggerBuilder(space);

  public static readonly fromTimer = (space: Space) => new TimerSignalTriggerBuilder(space);
}

export class MutationsSignalTriggerBuilder<T extends EchoObject> {
  private _uniqueComparator: (o1: T, o2: T) => boolean = () => false;
  private _debounceIntervalMs: number | undefined;
  private _filter: Filter<T> | undefined;

  constructor(
    private readonly _space: Space,
    private readonly _busInterconnect = SignalBusInterconnect.global,
  ) {}

  public withFilter<U extends T>(filter: Filter<U>): MutationsSignalTriggerBuilder<U> {
    this._filter = filter;
    return this as any as MutationsSignalTriggerBuilder<U>;
  }

  public debounceMs(millis: number): MutationsSignalTriggerBuilder<T> {
    this._debounceIntervalMs = millis;
    return this;
  }

  public unique(comparator: (prev: T, curr: T) => boolean = Object.is): MutationsSignalTriggerBuilder<T> {
    this._uniqueComparator = comparator;
    return this;
  }

  public create(signalProvider: (object: T) => Signal | null): UnsubscribeCallback {
    const bus = this._busInterconnect.createConnected(this._space);
    const filter = this._filter;
    const filterCheck = filter ? (obj: T) => filterMatch(filter, getAutomergeObjectCore(obj)) : () => true;
    const areEqual = this._uniqueComparator;
    const debounceMs = this._debounceIntervalMs;
    const previousCheckedById = new Map<string, T>();
    const timeoutById = new Map<string, any>();
    return bus.subscribe((mutationSignal: Signal) => {
      if (mutationSignal.kind !== 'echo-mutation') {
        return;
      }
      const object = mutationSignal.data.value;
      if (!(object && filterCheck(object))) {
        return;
      }
      const timeout = timeoutById.get(object.id);
      if (timeout) {
        clearTimeout(timeout);
        timeoutById.delete(object.id);
      }
      const previous = previousCheckedById.get(object.id);
      if (previous && areEqual(previous, object)) {
        return;
      }
      previousCheckedById.set(object.id, deepCopy(object));
      const signal = signalProvider(object);
      if (signal == null) {
        return;
      }
      if (debounceMs) {
        const timer = setTimeout(() => bus.emit(signal), debounceMs);
        timeoutById.set(object.id, timer);
      } else {
        bus.emit(signal);
      }
    });
  }
}

const deepCopy = (object: any): any => {
  if (typeof object !== 'object') {
    return object;
  }
  const result: any = {};
  for (const key in object) {
    result[key] = Array.isArray(object[key]) ? object[key].map(deepCopy) : deepCopy(object[key]);
  }
  return result;
};

export class TimerSignalTriggerBuilder {
  private _interval: number = 0;
  constructor(
    private readonly _space: Space,
    private readonly _busInterconnect = SignalBusInterconnect.global,
  ) {}

  public withIntervalMs(interval: number): TimerSignalTriggerBuilder {
    this._interval = interval;
    return this;
  }

  public create(signalProvider: () => Signal): UnsubscribeCallback {
    const bus = this._busInterconnect.createConnected(this._space);
    const timerId = setInterval(() => bus.emit(signalProvider()), this._interval);
    return () => clearInterval(timerId);
  }
}
