//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { ResultSet } from '@dxos/echo-db';

export const resultSetToStream = <T, U>(resultSet: ResultSet<T>, map: (arg: T[]) => U): Stream<U> => new Stream(({ next }) => {
  next(map(resultSet.value));
  return resultSet.update.on(() => next(map(resultSet.value)));
});

export const streamToResultSet = <T, U>(stream: Stream<T>, map: (arg?: T) => U[]): ResultSet<U> => {
  const event = new Event();
  let lastItem: T | undefined;
  stream.subscribe(data => {
    lastItem = data;
    event.emit();
  });

  return new ResultSet(event, () => map(lastItem));
};
