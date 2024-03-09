//
// Copyright 2024 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { type EchoObject, type Filter, filterMatch } from '@dxos/echo-schema';

import { type Signal, SignalBusInterconnect } from '../signal';

type UnsubscribeCallback = () => void;

export class SignalTrigger {
  public static readonly fromMutations = (space: Space) => new MutationsSignalTriggerBuilder(space);
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

  public create(signalProvider: (object: T) => Signal): UnsubscribeCallback {
    const bus = this._busInterconnect.createConnected(this._space);
    const filter = this._filter;
    const filterCheck = filter ? (obj: T) => filterMatch(filter, obj) : () => true;
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
      const previous = previousCheckedById.get(object.id);
      if (previous && areEqual(previous, object)) {
        return;
      }
      previousCheckedById.set(object.id, { ...object });
      const timeout = timeoutById.get(object.id);
      if (timeout) {
        clearTimeout(timeout);
      }
      const signal = signalProvider(object);
      if (debounceMs) {
        const timer = setTimeout(() => bus.emit(signal), debounceMs);
        timeoutById.set(object.id, timer);
      } else {
        bus.emit(signal);
      }
    });
  }
}
