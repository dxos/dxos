# @dxos/echo-atom

Effect Atom wrappers for ECHO objects with automatic subscriptions. Provides object reactivity without signals by integrating ECHO objects with the Effect Atom system.

## Overview

`echo-atom` bridges ECHO objects and Effect Atoms, enabling reactive programming patterns without relying on signals. It provides:

- **Object-level reactivity**: Subscribe to entire Echo objects or specific properties
- **Automatic subscriptions**: Direct integration with Echo's `Obj.subscribe` system
- **Type-safe APIs**: Full TypeScript support with proper inference
- **React integration**: See `@dxos/echo-react` for React hooks
- **SolidJS integration**: See `@dxos/echo-solid` for SolidJS hooks

## Design Goals

1. **No Signals Dependency**: Provides reactivity without requiring signal-based reactivity systems
2. **Automatic Subscriptions**: Atoms automatically subscribe to Echo object changes via `Obj.subscribe`
3. **Granular Updates**: Subscribe to entire objects or specific properties for efficient re-renders
4. **Type Safety**: Full TypeScript support with proper generic constraints
5. **Framework Agnostic**: Core functionality works with any framework; React and SolidJS hooks provided separately

## Core Concepts

### Atoms

Atoms wrap Echo objects and their properties, storing metadata about the object and path being watched:

```typescript
interface AtomValue<T> {
  readonly obj: Entity.Unknown;  // The Echo object being watched
  readonly path: KeyPath;        // Property path (empty for entire object)
  readonly value: T;             // Current value
}
```

### Registry

The Effect Atom Registry manages atom lifecycle and subscriptions. Each registry instance maintains its own subscription state.

### Reactive Updates

When you mutate an Echo object directly, the changes automatically flow through `Obj.subscribe` to update the atom and notify all subscribers.

## Usage

### Basic Usage

```typescript
import * as Registry from '@effect-atom/atom/Registry';
import { AtomObj } from '@dxos/echo-atom';
import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

// Create a registry
const registry = Registry.make();

// Create an Echo object
const person = Obj.make(TestSchema.Person, {
  name: 'Alice',
  email: 'alice@example.com'
});

// Create an atom for the entire object
const personAtom = AtomObj.make(person);

// Create an atom for a specific property
const nameAtom = AtomObj.makeProperty(person, 'name');

// Get current values from the registry
const currentPerson = registry.get(personAtom).value;
const currentName = registry.get(nameAtom).value;

// Subscribe to updates using the registry
const unsubscribe = registry.subscribe(nameAtom, () => {
  const newName = registry.get(nameAtom).value;
  console.log('Name changed:', newName);
}, { immediate: true });

// Update the object directly - the atom will automatically update
person.name = 'Bob';
person.email = 'bob@example.com';

// Clean up
unsubscribe();
```

### React Integration

For React applications, use the hooks from `@dxos/echo-react`:

```tsx
import { useObject } from '@dxos/echo-react';
import { RegistryContext } from '@effect-atom/atom-react';
import * as Registry from '@effect-atom/atom/Registry';

// Wrap your app with RegistryContext
function App() {
  const registry = useMemo(() => Registry.make(), []);

  return (
    <RegistryContext.Provider value={registry}>
      <YourComponents />
    </RegistryContext.Provider>
  );
}

// In your components
function PersonView({ person }: { person: Person }) {
  // Subscribe to entire object (returns [value, updateCallback])
  const [currentPerson, updatePerson] = useObject(person);

  // Subscribe to specific property (returns [value, updateCallback])
  const [name, updateName] = useObject(person, 'name');

  return (
    <div>
      <input
        value={name}
        onChange={(e) => updateName(e.target.value)}
      />
      <button onClick={() => updatePerson(p => { p.email = 'new@example.com'; })}>
        Update Email
      </button>
    </div>
  );
}
```

### SolidJS Integration

For SolidJS applications, use the hooks from `@dxos/echo-solid`:

```tsx
import { useObject, useObjectUpdate } from '@dxos/echo-solid';
import { RegistryContext } from '@dxos/effect-atom-solid';
import * as Registry from '@effect-atom/atom/Registry';

// Wrap your app with RegistryContext
function App() {
  const registry = Registry.make();

  return (
    <RegistryContext.Provider value={registry}>
      <YourComponents />
    </RegistryContext.Provider>
  );
}

// In your components
function PersonView(props: { person: Person }) {
  // Subscribe to specific property (returns accessor)
  const name = useObject(() => props.person, 'name');

  // Get update function for property
  const updateName = useObjectUpdate(() => props.person, 'name');

  return (
    <div>
      <input
        value={name()}
        onInput={(e) => updateName(e.target.value)}
      />
    </div>
  );
}
```
