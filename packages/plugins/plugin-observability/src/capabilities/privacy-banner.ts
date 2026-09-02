//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Observability from '@dxos/observability/Observability';

import { ObservabilityCapabilities } from '#types';

/**
 * The headless counterpart of `privacy-notice`: same event, printed rather than rendered.
 *
 * Written to stderr because a host that has no toast surface still has a user reading its output,
 * and stdout may be carrying a protocol or a `--json` payload.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const namespace = yield* ObservabilityCapabilities.Namespace;
    yield* Effect.promise(() =>
      Observability.showObservabilityBanner(namespace, (text) => process.stderr.write(`\n${text}\n\n`)),
    );
    return [];
  }),
);
