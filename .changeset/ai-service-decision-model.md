---
'@dxos/ai': minor
---

`AiService` now resolves Effect's `DecisionModel` alongside `LanguageModel`: `AiService.decisionModel(...)` is new, and resolvers contribute decision models with `AiModelResolver.decisionResolver`. Breaking: `AiService.model` is renamed `AiService.languageModel` (both the module helper and the service method); build partial services with `AiService.make`. TypeSafe System One ships as `TypeSafeResolver` in `@dxos/ai/resolvers`, replacing the removed `@dxos/ai-typesafe` package.
