---
'@dxos/ai': minor
'@dxos/diagram': minor
---

Decisions can carry images for models that read them. `DecisionModel.decide(definition, { input, images })` reaches Clef and Clef Flash as embedded data URLs on the System One `images` extension; jev, which reads no images, fails such a call with `InvalidUserInputError` rather than answer blind. `TypeSafeResolver.makeDecisionModel` takes `images: true` to opt a back-end in, and the resolver sets it from a model's `image` characteristic. Effect's `DecisionModel` gains `images` through a local patch until the upstream change lands.

`@dxos/diagram` gains a rule library of what makes a diagram read well (`rules/DIAGRAM.mdl`, parsed by `Rules`), scored by `Appeal`: rules measurable from geometry are scored in code, and the rest are asked of a judge shown the rendered page (`Architecture.judge` and `Aesthetics.judge` accept a subject with `images`). `Appeal.objective()` lets the layout engine choose by appeal. `DxSvg` embeds a JSON payload in an SVG's `<metadata>`, so a drawing exported as `.dx.svg` opens as an image anywhere and imports back as editable objects.

The mermaid layout engine draws tidier diagrams: ports along each box side follow the order their connectors turn away (`Ports`), parallel runs that share a line are nudged apart (`Nudge`), and placements are compacted toward the boxes they connect. On the illustrator's corpus, crossings fall from 56 to 23 and no connectors overlap; compiling takes longer because each candidate is re-routed.
