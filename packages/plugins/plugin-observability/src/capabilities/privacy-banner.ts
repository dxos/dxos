//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Observability from '@dxos/observability/Observability';

import { ObservabilityCapabilities } from '#types';

export default Effect.fnUntraced(function* () {
  const namespace = yield* ObservabilityCapabilities.Namespace;
  yield* Effect.promise(() =>
    Observability.showObservabilityBanner(namespace, (text) => process.stderr.write(`\n${text}\n\n`)),
  );
  return [];
});
