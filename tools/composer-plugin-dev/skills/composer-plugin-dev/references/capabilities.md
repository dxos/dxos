# Capabilities

A capability is a module that contributes some functionality to the framework, activated in a wave it declares. The barrel `capabilities/index.ts` declares which capabilities exist; each one lives in its own file.

## Barrel — makers, or `Capability.lazyModule`

```ts
// src/capabilities/index.ts
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as GameCapabilities from '@dxos/plugin-game/GameCapabilities';
import * as GameEvents from '@dxos/plugin-game/GameEvents';

// Prefer a maker: it carries the right activation wave for that kind of contribution.
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});

// No maker for this capability — declare the spec yourself.
export const GameVariant = Capability.lazyModule(
  'GameVariant',
  { provides: [GameCapabilities.VariantProvider], activatesOn: GameEvents.Start },
  () => import('./game-variant'),
);
```

**Use the maker when one exists.** Makers encode the activation wave a contribution requires —
`reactContext` and `reactRoot` must be on the startup pass because they wrap or mount the tree on
its first render, and a hand-written `lazyModule` that merely `provides` them silently inherits the
idle default instead. That failure shows up far from its cause (`Tooltip.Trigger must be used
within Tooltip`), not at the contribution site.

**Omitting `activatesOn` means idle**, not startup: the module runs after the app is interactive,
and is pullable earlier as a dependency via another module's `requires`. That is the right default
for nearly everything.

**Do not** add eager exports here. The barrel is consumed during plugin definition before the
framework has decided whether to activate each module.

## Module file — `Capability.makeModule()` default export

Each capability file exports a `Capability.makeModule(...)`:

```ts
// src/capabilities/react-surface.tsx
import * as Effect from 'effect/Effect';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(Capabilities.ReactSurface, [/* surfaces */])),
);
```

The pattern:

1. Import the capability registry (`Capabilities.X` or `AppCapabilities.X`).
2. Build your contribution.
3. `Capability.contribute(Registry, value)` declares it.
4. Wrap in `Capability.makeModule(...)` so the framework can activate it under the right event.

## Why everything is lazy

- Capabilities are large (surfaces pull React, operation handlers pull domain logic).
- The framework uses **activation events** to decide when each capability is needed.
- Lazy imports keep the initial bundle small — operation handlers, for example, never load until an operation is invoked.

## Reference

- `packages/plugins/plugin-chess/src/capabilities/`

## Activation pitfalls

Each of these shipped as a user-visible bug before being written down.

1. **The gate belongs on the PROVIDER, not the reader.** If a startup-pass module reads state on
   its first render, gate the _state module_ `activatesOn: ActivationEvents.Startup`. Declaring it
   as the reader's `requires` looks equivalent but is the opposite: `requires` only pulls a
   provider forward when that provider is ungated, so aiming it at an idle-gated provider demotes
   the **reader** into the idle wave. Measured once as a 6.3 s blank shell.
2. **`requires` IS right when the provider is ungated.** A demand-gated module that reads a
   capability in its body should declare it — the dependency pass then pulls the ungated provider
   in ahead of it.
3. **Headless state is not gated on its plugin's UI.** If a capability is useful with no surface of
   that plugin on screen (comment sync inside a markdown document, a compute graph, filesystem
   state), gating it on `<Plugin>Events.Start` conflates "the UI is visible" with "the state
   exists". Leave it ungated.
4. **Cross-plugin contributions ride the CONSUMING plugin's start event** — a skill rides the
   assistant's, a markdown extension rides markdown's.
5. **A React context can never be deferred.** It wraps the tree on its first render by definition;
   arriving at idle leaves roots mounted outside it.

Readers are tolerant of arrival order by design: `useCapability` / `useAtomCapability` suspend
until the capability is contributed rather than throwing, so a component parks at its nearest
Suspense boundary and re-renders when it lands. That covers "not yet" — it does not make a
genuinely absent capability appear, so the gates above still matter.
