---
title: Models
description: The model an agent uses, and how DXOS picks and calls it.
---

SAGE calls models through one service, so an agent, the assistant and an operation that needs a model all ask for one
the same way. The caller names a model, and the service finds a provider that serves it.

## Model

**Models and providers.** A model has an id, a DXN in its developer's namespace, and the same id can be served by
several providers. A provider is who serves the model: EDGE for hosted models, or a local server. Each pairing has its
own back-end name and characteristics, such as the context window and whether the model accepts images.

| Provider  | Serves                                                          |
| --------- | --------------------------------------------------------------- |
| EDGE      | Hosted models, such as Claude, through EDGE's AI service        |
| Built-in  | Local models on a server Composer manages, on the user's device |
| Ollama    | Local models on an Ollama server the user runs                  |
| LM Studio | Local models on an LM Studio server the user runs               |

**The AI service.** An operation that needs a model declares the AI service and asks it for a model by id. The service
returns a layer for that model, which the operation provides to its model calls.

**Resolution.** Resolvers are chained. A resolver serves the models it knows, and passes the rest, or any it fails to
reach, to the one below it. The default provider is EDGE, so a local resolver can sit in front and fall back to EDGE.

**Kinds of model.** Besides language models that hold a conversation, the service resolves decision models, which pick
from a fixed set of answers, and extraction models, which pull structured facts from text.

## Behavior

- A chat records the model it uses. Changing it applies from the next turn.
- Calls through EDGE are made with the space's access to EDGE, so a person needs no API key of their own for hosted
  models.
- A local model keeps prompts on the device, but works only while the device and its model server are running. Agents on
  EDGE use hosted models.

## Limits

- A call sends the model the chat, the agent's instructions and skills, and the content of every object the agent reads
  in that turn. A hosted model's provider receives all of it.
- When telemetry is on, each model call is recorded with its model, timings and token counts.
- A model that a provider does not serve fails to resolve; the caller gets an error, not a different model.
