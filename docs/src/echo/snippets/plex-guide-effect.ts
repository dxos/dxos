//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/echo';

// #region service
// Inside a module, the capability manager is the `Capability.Service` in
// context; `Capability.get` and friends read it.
export const CountSchemasModule = Capability.makeModule(() =>
  Effect.gen(function* () {
    const manager = yield* Capability.Service;
    const schemas = manager.getAll(AppCapabilities.Schema).flat();
    console.log(schemas.length);
    return [];
  }),
);
// #endregion

// #region layer
export class LinkChecker extends Context.Service<
  LinkChecker,
  { readonly check: (url: string) => Effect.Effect<boolean> }
>()('com.example.plugin.bookmarks.LinkChecker') {}

const LinkCheckerLive = Layer.succeed(LinkChecker, {
  check: (url) => Effect.succeed(url.startsWith('https://')),
});

// A layer spec says what the layer provides and how widely it is shared; the
// runtime builds it for any operation that declares the service.
export const LinkCheckerModule = Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(
      Capabilities.LayerSpec,
      LayerSpec.make(
        { affinity: 'application', requires: [], provides: [LinkChecker] },
        () => LinkCheckerLive,
      ),
    ),
  ),
);
// #endregion

// #region operation
export const CheckLink = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.checkLink'),
    name: 'Check link',
  },
  input: Schema.Struct({ url: Schema.String }),
  output: Schema.Struct({ ok: Schema.Boolean }),
  services: [LinkChecker],
});

export const checkLink = CheckLink.pipe(
  Operation.withHandler(({ url }) =>
    Effect.gen(function* () {
      const checker = yield* LinkChecker;
      return { ok: yield* checker.check(url) };
    }),
  ),
);
// #endregion
