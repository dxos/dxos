---
'@dxos/ai': minor
'@dxos/diagram': minor
---

Decisions can carry images for models that read them. `DecisionModel.decide(definition, { input, images })` reaches Clef and Clef Flash as embedded data URLs on the System One `images` extension; jev, which reads no images, fails such a call with `InvalidUserInputError` rather than answer blind. `TypeSafeResolver.makeDecisionModel` takes `images: true` to opt a back-end in, and the resolver sets it from a model's `image` characteristic. Effect's `DecisionModel` gains `images` through a local patch until the upstream change lands.

The diagram judges take the rendered page the same way: `Architecture.judge` and `Aesthetics.judge` accept a subject with `images`, and `Aesthetics.IMAGE_RULES` phrases the aesthetic rules for a judge that sees the image rather than a text drawing.
