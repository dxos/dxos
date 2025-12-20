# @dxos/echo-atom

Effect Atom wrappers for ECHO objects with explicit subscriptions. Provides object reactivity without signals by integrating ECHO objects with the Effect Atom system.

## Overview

`echo-atom` bridges ECHO objects and Effect Atoms, enabling reactive programming patterns without relying on signals. It provides:

- **Object-level reactivity**: Subscribe to entire Echo objects or specific properties
- **Explicit subscriptions**: Direct integration with Echo's `ObjectCore.updates` event system
- **Type-safe APIs**: Full TypeScript support with proper inference
- **React integration**: See `@dxos/echo-react` for React hooks

## Design Goals

1. **No Signals Dependency**: Provides reactivity without requiring signal-based reactivity systems
2. **Explicit Subscriptions**: Clear subscription model that integrates directly with Echo's update system
3. **Granular Updates**: Subscribe to entire objects or specific properties for efficient re-renders
4. **Type Safety**: Full TypeScript support with proper generic constraints
5. **Framework Agnostic**: Core functionality works with any framework; React hooks provided separately

## Core Concepts

### Atoms

Atoms wrap Echo objects and their properties, storing metadata about the object and path being watched:

```typescript
interface AtomValue<T> {
  readonly obj: Entity.Unknown;  // The Echo object being watched
  readonly path: KeyPath;          // Property path (empty for entire object)
  readonly value: T;               // Current value
}
```

### Registry

The Effect Atom Registry manages atom lifecycle and subscriptions. Each registry instance maintains its own subscription state.

### Subscription Manager

`EchoAtomSubscriptionManager` handles the bridge between Echo's `ObjectCore.updates` events and Effect Atom subscriptions. It:

- Subscribes directly to `ObjectCore.updates` (not through signals)
- Batches updates for performance
- Compares values to avoid unnecessary updates
- Manages subscription lifecycle

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

// Get current values
const currentPerson = AtomObj.get(registry, personAtom);
const currentName = AtomObj.get(registry, nameAtom);

// Subscribe to updates
const unsubscribe = AtomObj.subscribe(registry, nameAtom, (newName) => {
  console.log('Name changed:', newName);
}, { immediate: true });

// Update the object
AtomObj.update(registry, personAtom, (person) => {
  person.name = 'Bob';
});

// Update a property
AtomObj.updateProperty(registry, nameAtom, 'Charlie');
// Or with an updater function
AtomObj.updateProperty(registry, nameAtom, (current) => current.toUpperCase());

// Clean up
unsubscribe();
```

### React Integration

For React applications, use the hooks from `@dxos/echo-react`:

```tsx
import { useObject, useObjectUpdate } from '@dxos/echo-react';
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
  // Subscribe to entire object
  const currentPerson = useObject(person);
  
  // Subscribe to specific property
  const name = useObject(person, 'name');
  
  // Get update functions
  const updatePerson = useObjectUpdate(person);
  const updateName = useObjectUpdate(person, 'name');
  
  return (
    <div>
      <input
        value={name}
        onChange={(e) => updateName(e.target.value)}
      />
      <button onClick={() => updatePerson(p => p.email = 'new@example.com')}>
        Update Email
      </button>
    </div>
  );
}
```
