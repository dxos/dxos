# @dxos/ner

Experimental named entity recognition using local `@xenova/transformers` models.

Extracted from `@dxos/assistant` so that the transformers runtime (and its `protobufjs`
dependency) is not reachable from the app's dependency graph.
