# AI inference (`AiService`)

Run LLM calls **inside operations**, never from React. `AiService` from `@dxos/ai` gives you a host-managed model client with tracing, tools, and tool execution.

## Minimum example

```ts
// src/operations/summarize.ts
import * as Effect from 'effect/Effect';
import {
  AiService,
  ConsolePrinter,
  OpaqueToolkit,
  ToolExecutionService,
  ToolResolverService,
} from '@dxos/ai';
import { Operation } from '@dxos/operation';

import { Summarize } from './definitions';

const handler = Summarize.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ text }) {
      const result = yield* AiService.run({
        model: AiService.model('@anthropic/claude-sonnet-4-5'),
        system: 'You are a concise summarizer. Reply in one sentence.',
        messages: [{ role: 'user', content: text }],
      });
      return { summary: result.content };
    }),
  ),
);

export default handler;
```

## Tools and tool execution

When the model needs to call other operations as tools:

```ts
const result = yield* AiService.run({
  model: AiService.model('@anthropic/claude-sonnet-4-5'),
  toolkit: OpaqueToolkit.fromOperations([Search, Fetch]),
  toolExecutor: ToolExecutionService,
  toolResolver: ToolResolverService,
  printer: ConsolePrinter,
  messages: [...],
});
```

## Service declaration

Add `AiService` to the operation's `services` array so the platform wires it in:

```ts
export const Summarize = Operation.make({
  meta: { key: 'com.example.function.foo.summarize', name: 'Summarize', description: '...' },
  input: Schema.Struct({ text: Schema.String }),
  output: Schema.Struct({ summary: Schema.String }),
  services: [AiService.AiService],
});
```

## Why not call the SDK directly?

- **Model selection** is centralized — switch from Sonnet 4.5 to a future model in one place.
- **Auth** flows through the host; you don't ship API keys in your bundle.
- **Tracing & cost accounting** show up in Composer's diagnostics.
- **Tool calls round-trip through your operations**, so the assistant can reuse them.

## Reference

- `packages/plugins/plugin-inbox/src/operations/summarize-mailbox.ts`
- `packages/plugins/plugin-inbox/src/operations/classify-email.ts`
