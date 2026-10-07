---
branch: claude/resume-plugin-projects-7558db
commit: bd8e873916217dfefcd8ee54d2586e6f2c20e7a9
base: 7654298d4575594a6abf017ccbbd6e98cc7ce647
mode: fast
createdAt: 2026-10-07T07:26:20.302Z
isFinalized: true
groups: 183
rules: [errors-extend-base-error, import-as-namespace-is-all-or-nothing, jsdoc-non-obvious-identifiers, private-new-packages]
reviewId: bd8e8739162
---

_7 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bd8e8739162-1 - ignored - private-new-packages - packages/common/datalog/package.json:1
- bd8e8739162-2 - resolved - errors-extend-base-error - packages/common/datalog/src/Checker.ts:33
- bd8e8739162-3 - resolved - errors-extend-base-error - packages/common/datalog/src/internal/lexer.ts:30
- bd8e8739162-4 - resolved - errors-extend-base-error - packages/common/datalog/src/Parser.ts:11
- bd8e8739162-5 - ignored - private-new-packages - packages/core/compute/brain/package.json:1
- bd8e8739162-6 - resolved - errors-extend-base-error - packages/core/compute/brain/src/CompilePrompt.ts:58
- bd8e8739162-7 - resolved - errors-extend-base-error - packages/core/compute/brain/src/Compiler.ts:48
- bd8e8739162-8 - resolved - jsdoc-non-obvious-identifiers - packages/core/compute/brain/src/testing/scenarios.ts:6
- bd8e8739162-9 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/brain/src/Vocabulary.ts:1
- bd8e8739162-10 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/pipeline-rdf/src/types/Predicate.ts:1

## Issues

# ERROR bd8e8739162-1 private-new-packages `packages/common/datalog/package.json:1`

System One judges this a likely violation of `private-new-packages` (New packages must be private), p=0.94. The likeliest place is lines 1-12 (`{`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd8e8739162-2 errors-extend-base-error `packages/common/datalog/src/Checker.ts:33`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 33-40 (`export class CheckError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd8e8739162-3 errors-extend-base-error `packages/common/datalog/src/internal/lexer.ts:30`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 30-38 (`export class LexError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd8e8739162-4 errors-extend-base-error `packages/common/datalog/src/Parser.ts:11`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 11-26 (`export class ParseError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd8e8739162-5 private-new-packages `packages/core/compute/brain/package.json:1`

System One judges this a likely violation of `private-new-packages` (New packages must be private), p=0.95. The likeliest place is lines 1-12 (`{`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd8e8739162-6 errors-extend-base-error `packages/core/compute/brain/src/CompilePrompt.ts:58`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 58-68 (`export class ReplyError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bd8e8739162-7 errors-extend-base-error `packages/core/compute/brain/src/Compiler.ts:48`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 48-55 (`export class CompileError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd8e8739162-8 jsdoc-non-obvious-identifiers `packages/core/compute/brain/src/testing/scenarios.ts:6`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 6-20 (`export type ScenarioFact = {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd8e8739162-9 import-as-namespace-is-all-or-nothing `packages/core/compute/brain/src/Vocabulary.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-9 (`import { Predicate } from '@dxos/pipeline-rdf/types';`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bd8e8739162-10 import-as-namespace-is-all-or-nothing `packages/core/compute/pipeline-rdf/src/types/Predicate.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-8 (`//`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7654298d4575594a6abf017ccbbd6e98cc7ce647`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 10 violations written to fragments, 190 uncertain, 1820 clean, 0 unanswered
- left for an agentic reviewer: 44 batch(es)

```text
requests: 843 (129 verdicts re-asked with context the model requested)
estimated input tokens: 4669271
billed input tokens: 4346905 (cost $0.1826)
measured chars per token: 3.22
```

### Dismissals

- bd8e8739162-1: `@dxos/datalog` is public on purpose; the user asked for it to be published and is registering it on npm.
- bd8e8739162-5: `@dxos/brain` is public on purpose; the user asked for it to be published and is registering it on npm.
- bd8e8739162-9: the four sites agree: `Predicate.ts` carries `// @import-as-namespace`, the `types` barrel re-exports it as `export * as Predicate from './Predicate.ts'`, and `import { Predicate } from '@dxos/pipeline-rdf/types'` is the barrel form the rule allows; members are reached as `Predicate.normalize`.
- bd8e8739162-10: same module as -9; it has the directive, a capital-case filename matching the barrel name, and no namespace-prefixed members.
