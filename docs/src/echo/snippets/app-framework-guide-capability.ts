//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';

// #region declare
export type Exporter = { readonly format: string; readonly export: (text: string) => Uint8Array };

// A multi capability: any number of modules may contribute one.
export const Exporter = Capability.make<Exporter>()('com.example.plugin.export.capability.exporter');

// A singleton capability: exactly one module provides it.
export const Clock = Capability.makeSingleton<() => Date>()('com.example.plugin.export.capability.clock');
// #endregion

// #region namespace
const ExportNamespace = Plugin.namespace('com.example.plugin.export');
export const Settings = ExportNamespace.makeSingleton<{ defaultFormat: string }>()('settings');
// #endregion

// #region contribute
export const TextExporterModule = Capability.inlineModule(
  'TextExporter',
  { provides: [Exporter], activatesOn: ActivationEvents.Startup },
  () =>
    Effect.succeed(
      Capability.contribute(Exporter, { format: 'text/plain', export: (text) => new TextEncoder().encode(text) }),
    ),
);
// #endregion

// #region request
export const ExportMenuModule = Capability.inlineModule('ExportMenu', { requires: [Clock], provides: [] }, () =>
  Effect.gen(function* () {
    const now = yield* Clock;
    const exporters = yield* Capability.getAll(Exporter);
    console.log(
      now(),
      exporters.map((exporter) => exporter.format),
    );
  }),
);
// #endregion

// #region later
// Contributions that arrive after startup, for example from a plugin the user turns on later.
// The view is live: a module subscribes, and the finalizer unsubscribes when the module deactivates.
export const ExportListModule = Capability.inlineModule('ExportList', { provides: [] }, () =>
  Effect.gen(function* () {
    const exporters = yield* Capability.contributions(Exporter);
    const unsubscribe = exporters.subscribe((current) => console.log(current.map((exporter) => exporter.format)));
    yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));
  }),
);
// #endregion

// #region builtin
// Built-in capabilities are tags like any other: a singleton yields its one implementation.
export const ReportModule = Capability.inlineModule(
  'Report',
  { requires: [Capabilities.OperationInvoker], provides: [] },
  () =>
    Effect.gen(function* () {
      const invoker = yield* Capabilities.OperationInvoker;
      console.log(typeof invoker.invokePromise);
    }),
);
// #endregion
