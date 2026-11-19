---
title: Models
description: The model an agent uses, and how DXOS picks and calls it.
---

SAGE calls models through one service. This means an agent, the assistant and an operation that needs a model all ask
for one the same way. The caller names a model, and the service finds a provider that serves it.

## Model

When you call an LLM API directly, the model and the vendor that serves it come as a pair, in one SDK with one API key.
SAGE separates the two.

**Models and providers.** A model has an id, which is a DXN in its developer's namespace. Several providers can serve
the same id. A provider is who serves the model: EDGE for hosted models, or a local server. Each pairing has its own
back-end name and characteristics, such as the context window and whether the model accepts images.

| Provider  | Serves                                                          |
| --------- | --------------------------------------------------------------- |
| EDGE      | Hosted models, such as Claude, through EDGE's AI service        |
| Built-in  | Local models on a server Composer manages, on the user's device |
| Ollama    | Local models on an Ollama server the user runs                  |
| LM Studio | Local models on an LM Studio server the user runs               |

**The AI service.** If your operation needs a model, it declares the AI service and asks it for a model by id. The
service returns a layer for that model, which the operation provides to its model calls.

**Resolution.** Resolvers are chained. A resolver serves the models it knows, and passes the rest, or any it fails to
reach, to the one below it. The default provider is EDGE, so a local resolver can sit in front and fall back to EDGE.

**Kinds of model.** The service resolves language models, which hold a conversation. It also resolves decision models,
which pick from a fixed set of answers, and extraction models, which pull structured facts from text.

## Behavior

- A chat records the model it uses. If you change it, the change applies from the next turn.
- Calls through EDGE are made with the space's access to EDGE, so a person needs no API key of their own for hosted
  models.
- A local model keeps prompts on the device, but works only while the device and its model server are running. Agents on
  EDGE use hosted models.

## Limits

- A call sends the model the chat, the agent's instructions and skills, and the content of every object the agent reads
  in that turn. A hosted model's provider receives all of it.
- When telemetry is on, each model call is recorded with its model, timings and token counts.
- A model that no resolver in the chain serves fails to resolve. The caller gets `AiModelNotAvailableError`, not a
  different model.
