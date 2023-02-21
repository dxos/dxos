//
// Copyright 2023 DXOS.org
//

import { ZenObservable } from '@dxos/async';
import type { Stream } from '@dxos/codec-protobuf';

// TODO(wittjosiah): Factor out. To Stream?
export const observableFromStream = <T>(stream: Stream<T>): ZenObservable<T> =>
  new ZenObservable((observer) => {
    stream.subscribe((response) => {
      observer.next(response);
    });
  });
