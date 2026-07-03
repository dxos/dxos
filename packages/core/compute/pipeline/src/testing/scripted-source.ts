//
// Copyright 2026 DXOS.org
//

import * as Stream from 'effect/Stream';

/** A finite source from a fixed list; the pipeline drains and resolves when it ends. */
export const scriptedSource = <T>(items: readonly T[]): Stream.Stream<T> => Stream.fromIterable(items);
