# Phase 9 core rework — opaque module types, capability-level props/activatesOn

User-directed corrections to the phase-9 API (branch `t3code/84a5cc44`). Work only in this
worktree. Do NOT create branches/worktrees. Do NOT commit — the driving session reviews and
commits. No casts (`as any`, `as unknown as T`, `!`); the documented "correlation cast"
pattern already in `capability.ts` is the only allowed form — copy its comment style.

## Design (authoritative)

The exported type of a capability module must be **opaque with respect to
requires/provides** — parameterized ONLY by its options type. Spec type-checking of the
body still happens at the authoring site (`lazyModule`/`inlineModule` parameters); the
*result* type erases it. This eliminates every TS2883 declaration-emit problem, so the
named `XModule` interfaces in AppCapability and all `typeof`-annotation workarounds get
deleted. `props` (plugin-options → body-props mapping) and `activatesOn` are declared where
the module is authored (capability level), not at `Plugin.addLazyModule`.

## 1. app-framework `src/core/capability.ts`

Replace the current `Module<Props, Requires, Provides>` with:

```ts
/**
 * A module body carrying its activation spec as erased runtime values. The spec types are
 * enforced where the body is authored ({@link lazyModule} / {@link inlineModule}) and
 * deliberately absent from this type, so exporting a module never leaks foreign capability
 * types into declaration emit (TS2883). Runtime manager validation is authoritative.
 */
export interface Module<Options = void> {
  (options: Options): Effect.Effect<any, Error, any>;
  readonly requires: readonly AnyTag[];
  readonly provides: readonly AnyTag[];
  readonly activatesOn?: ActivationEvent.Events;
}
```

- Import `type * as ActivationEvent from './activation-event'` (no cycle: it only imports
  @dxos/keys and @dxos/util).
- `lazyModule` new signature (keep `LoadModule`, `ProvidesReturn`, `Requirements` as-is):

```ts
export const lazyModule = <
  const Provides extends readonly AnyTag[],
  const Requires extends readonly AnyTag[] = readonly [],
  Props = void,
  Options = Props,
>(
  name: string,
  spec: {
    readonly requires?: Requires;
    readonly provides: Provides;
    /** Activates when this runtime event fires instead of during the dependency pass. */
    readonly activatesOn?: ActivationEvent.Events;
    /** Maps plugin options to the body's props; omit when they coincide. */
    readonly props?: (options: Options) => Props;
  },
  loader: LoadModule<Props, Requires, Provides>,
): Module<Options>
```

  Body: `(options: Options)` → await loader → `getModule(spec.props ? spec.props(options) :
  options)` — the no-props branch needs a documented correlation cast (when `spec.props` is
  absent, `Options` resolves to its `Props` default). Attach `[ModuleTag]: name`, `requires:
  spec.requires ?? []`, `provides: spec.provides`, `activatesOn: spec.activatesOn` via
  `Object.assign`. Do NOT mutate the caller's loader.

- `inlineModule(name, spec, activate)` — same spec shape (requires?/provides/activatesOn?/
  props?), `activate: (props: Props) => Effect<ProvidesReturn<Provides>, Error,
  Requirements<Requires>>`, returns `Module<Options>`.

- `moduleMaker(defaultName, capability)` — returned maker:

```ts
<Props = void, Options = Props, const Requires extends readonly AnyTag[] = readonly [],
 const Extra extends readonly AnyTag[] = readonly []>(
  loader: LoadModule<Props, Requires, readonly [C, ...Extra]>,
  options?: MakerOptions<Requires, Extra, Props, Options>,
): Module<Options>
```

  `MakerOptions` gains `activatesOn?: ActivationEvent.Events` and
  `props?: (options: Options) => Props` (update its type params accordingly). Delegates to
  `lazyModule` passing all spec fields through.

## 2. app-framework `src/core/plugin.ts`

`addLazyModule` drops its `activatesOn`/`props` options (they now live on the module) and
its Requires/Provides generics:

```ts
export const addLazyModule: {
  <T = void>(module: Capability.Module<void>, options?: { id?: string }):
    (builder: PluginBuilder<T>) => PluginBuilder<T>;
  <Options, T extends Options = Options>(module: Capability.Module<Options>,
    options?: { id?: string }): (builder: PluginBuilder<T>) => PluginBuilder<T>;
} = ...
```

Implementation: always register the function-entry form so options-taking modules receive
the plugin options:

```ts
(builder) => builder.addModule((pluginOptions) => ({
  id: options?.id ?? Capability.getModuleTag(module),
  activatesOn: module.activatesOn,
  requires: module.requires,
  provides: module.provides,
  activate: () => module(pluginOptions),
}));
```

(For void-options modules the extra argument is ignored by the body.) `TypedModuleOptions`,
`ValidateModuleOptions`, `addModule` stay unchanged.

## 3. app-toolkit `src/app-framework/AppCapability.ts`

Massive simplification. Delete ALL the `XModule` named interfaces and the per-maker generic
wrapper functions. Each lazy maker becomes one line:

```ts
/** Module maker contributing React surfaces. */
export const surface = Capability$.moduleMaker('ReactSurface', Capabilities.ReactSurface);
```

Same for: appGraphBuilder('AppGraphBuilder', AppCapabilities.AppGraphBuilder),
settings('Settings', AppCapabilities.Settings), skillDefinition, operationHandler
(Capabilities.OperationHandler), undoMappings (Capabilities.UndoMapping), reactContext,
reactRoot, navigationResolver (AppCapabilities.NavigationTargetResolver), navigationHandler,
commentConfig, textContent, anchorSort — keep the current default names.

Value makers (`translations`, `schema`, `pluginAsset`, `commands`): keep current bodies but
drop the interface annotations — return type is inferred `Capability$.Module` (void
options). Delete the interfaces.

`packages/plugins/plugin-space/src/types/SpaceCapability.ts` stays as-is.

## 4. Call sites (all must build after)

- **plugin-client `src/capabilities/index.ts`**: delete the two `typeof`-annotated types on
  `LayerSpecs` and `SpaceReplicationProgress` (plain `Capability.lazyModule` now).
  `SpaceReplicationProgress` gains `activatesOn: ClientEvents.SpacesReady` in its spec
  (import `ClientEvents` from `'#types'`). `ReactSurface` moves the props mapping from
  ClientPlugin.ts into the maker options:

  ```ts
  export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
    props: ({ shareableLinkOrigin = ..., invitationPath = '/', invitationProp = 'deviceInvitationCode', onReset }: ClientPluginOptions) => { ...createInvitationUrl...; return { createInvitationUrl, onReset }; },
  });
  ```

  (copy the exact current mapping body from ClientPlugin.ts; import `type
  ClientPluginOptions` from `'#types'`). `Client` needs NO props (its body already takes
  `ClientPluginOptions` — options and props coincide).
- **plugin-client `src/capabilities/navigation-handler/index.ts`**: drop the annotation;
  add `props: ({ invitationProp }: ClientPluginOptions) => ({ invitationProp })` to the
  maker options (moved from ClientPlugin.ts).
- **plugin-client `src/ClientPlugin.ts`**: every entry becomes bare
  `Plugin.addLazyModule(X)` (translations stays
  `Plugin.addLazyModule(AppCapability.translations(translations))`). No `props`, no
  `activatesOn` at this level. Keep module order and the runtime-event comment next to the
  SpaceReplicationProgress capability definition instead.
- **plugin-markdown `src/capabilities/index.ts`**: drop the `AnchorSortModule` annotation on
  `AnchorSort` (plain maker call with `requires` stays).
- **plugin-script**: move `activatesOn: ScriptEvents.SetupCompiler` from
  `ScriptPlugin.tsx` into the `Compiler` module definition in its capabilities barrel.
- **plugin-routine**: move `activatesOn: ClientEvents.SpacesReady` from `RoutinePlugin.tsx`
  AND `RoutinePlugin.node.ts` into the `TriggerRuntimeController` definition (both plugin
  files reference the same module — verify it is defined once).
- **plugin-deck `src/DeckPlugin.ts`** and **plugin-inbox `src/InboxPlugin.tsx`**: replace
  the explicit-generic workarounds
  (`Plugin.addLazyModule<typeof X.requires, typeof X.provides, void>(X)`) with bare
  `Plugin.addLazyModule(X)` (old generics no longer exist).
- **app-framework `src/core/plugin.test.ts`**: the `addLazyModule` describe block: the
  'maps plugin options to module props' test moves the props mapping into the
  `Capability.lazyModule` spec (`props: ({ offset }: { offset: number }) => ({ start:
  offset + 1 })`), and `Plugin.addLazyModule(Lazy)` becomes bare. Add one assertion that a
  module authored with `activatesOn` in its spec normalizes to event mode via
  `addLazyModule` (activation.mode === 'event'). Keep the inlineModule/moduleMaker tests,
  adjusting only if signatures require.
- Search the repo for any other compile breaks from the `Module` signature change
  (`grep -rn "Capability.Module<" packages tools --include="*.ts" --include="*.tsx"` and
  fix to the new single-param form; also re-check `addLazyModule(.*{` call sites for
  removed options).

## 5. Gates (run all; report outputs)

1. `moon run app-framework:build app-framework:test app-toolkit:build app-toolkit:test`
2. `moon run plugin-space:build plugin-client:build plugin-markdown:build plugin-script:build plugin-routine:build plugin-deck:build plugin-inbox:build`
3. Full repo: `moon exec --on-failure continue --quiet :build > /tmp/p9build.log 2>&1; echo EXIT=$?`
   — must be EXIT=0 (NEVER pipe through tail/head; grep "error TS" on failure and fix).
4. `moon run app-framework:lint app-toolkit:lint plugin-client:lint plugin-markdown:lint plugin-script:lint plugin-routine:lint plugin-deck:lint plugin-inbox:lint -- --fix`
5. `pnpm format`
6. `moon run plugin-client:test plugin-markdown:test plugin-space:test`

Report: summary of files changed, any deviations from this brief and why, gate exit codes.
