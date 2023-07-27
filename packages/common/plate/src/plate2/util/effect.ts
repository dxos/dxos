//
// Copyright 2023 DXOS.org
//

import { MaybePromise } from './promise';

export type Effect<I = void, O = any> = {
  apply(argument?: I): MaybePromise<O>;
};
