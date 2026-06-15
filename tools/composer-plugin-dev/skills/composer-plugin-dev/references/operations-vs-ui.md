# Operations vs UI: where logic belongs

**Rule of thumb: heavy logic does not live in containers.** Push it into operations.

## What belongs in operations

- Anything that **mutates ECHO** beyond a trivial property write.
- Any **external service** call (HTTP, Gmail, GitHub, OpenAI, etc.).
- Any **LLM** call (use `AiService` — see [ai-service.md](./ai-service.md)).
- Anything **non-trivial to compute** (parsing, rendering, simulation, search).
- Anything you'd want an **agent** to be able to do (operations become blueprint tools — see [blueprints.md](./blueprints.md)).
- Anything you'd want to **invoke from the CLI** (operations are headless — see [package-json.md](./package-json.md)).

## What stays in containers

- Reading reactive ECHO state via `useQuery`/`useObject`/atoms.
- Local UI state (open/closed, selected tab).
- Wiring user gestures to operation invocations.
- Layout composition with `Panel` / `ScrollArea` / `Toolbar` / `Card`.

## Why

- **Testable.** Operations have schema-typed input/output and run under the composer testing harness without mounting React.
- **Reusable.** The same operation backs the UI button, the CLI command, the agent tool, and the test.
- **Type-safe at the boundary.** Schema validates input; `services` declares dependencies up-front.
- **Resumable & observable.** Effect spans, retries, and tracing hang off operations naturally.
- **Auth-aware.** Credentials live in ECHO as `AccessToken` and are loaded inside operations — never read from a React tree.

## Pattern: invoke an operation from a container

```tsx
import { useOperationInvoker } from '@dxos/operation-react';
import { Move } from '#operations';

const invoke = useOperationInvoker();
const onClick = () => invoke(Move, { game: Ref.make(game), move: 'e4' });
```

The container stays a thin shell. All chess logic, validation, persistence, and engine calls live in `Move`'s handler.

## Anti-pattern

```tsx
// ❌ Don't do this.
const onClick = async () => {
  const res = await fetch(`https://api.example.com/x?token=${secret}`);
  const data = await res.json();
  game.pgn = renderPgn(data); // mutating ECHO from a click handler
};
```

Move the fetch + transform into an operation, declare its services, and invoke it.

## See also

- [operations.md](./operations.md) — operation definition and handler patterns.
- [external-services.md](./external-services.md) — auth and HTTP integration.
- [ai-service.md](./ai-service.md) — LLM inference inside operations.
- [blueprints.md](./blueprints.md) — surface operations to the assistant.
