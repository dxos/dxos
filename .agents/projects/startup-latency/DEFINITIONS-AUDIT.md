# Operation-definition weight audit (2026-07-31)

Premise (ratified direction): an operation definition is schema + service _tags_ — importable by
any caller for free. This audit walks the browser-condition source graph of all 84
`Operation.make()` files (value imports only; `import type` skipped) and cross-checks each
finding against the chunks actually fetched at boot. Tooling:
`scratchpad/audit-opdefs.py` → `opdef-audit.json` (candidate for promotion to a CI budget check).

## Headline

**No definition file is lightweight today.** The lightest definition's transitive closure is
~576 workspace source files; the heaviest (blogger, script templates) reach ~1,700. Two causes:
a shared floor every definition pays, and per-definition leaks. Tree-shaking rescues some of it
(e.g. of `@effect/platform`'s 5.5 MB rendered, only 103 KB ships) — but the confirmed-shipping
leaks below all survive into the boot fetch.

## The floor (paid by every definition)

| sink                                                      | chain                                                                                                                                                                | ships at boot?                          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `@effect/platform/HttpClient`                             | `Operation.make` → `@dxos/compute` **barrel** → `Header.ts`                                                                                                          | 103 KB of 5.5 MB (tree-shaken; fragile) |
| `bip39` (207 KB)                                          | any def importing another plugin's **main barrel** (e.g. `TableOperation` → `@dxos/plugin-space` index → `util.ts` → `@dxos/client` → halo credentials → seedphrase) | **yes**                                 |
| `@bufbuild/protobuf` (151 KB), `@dxos/wa-sqlite` (157 KB) | same client-chain                                                                                                                                                    | **yes**                                 |

## Confirmed-shipping per-definition leaks (fetched-at-boot verified)

| leak                                                                                                                                  | bytes at boot (rendered) | chain                                                                                                                                                                                                                                                                                            | fix shape                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------- | -----------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| SPARQL stack (`@traqula/*`, chevrotain; `fact-store` chunk is 1.5 MB minified)                                                        |                ~1,500 KB | `InboxOperation.ts:14` → `@dxos/pipeline-rdf` **barrel** → `FactStore` implementation                                                                                                                                                                                                            | pipeline-rdf needs a light tag/types entry; definition imports the tag                                                       |
| AI resolver stack: `@effect/ai-openai` 396 + `ai-anthropic` 181 + `@effect/ai` 44 + `fast-check` 298 (via `@effect/ai`'s `Arbitrary`) |                  ~920 KB | `InboxOperation` → `Mailbox.ts` → **`@dxos/plugin-connector` barrel** → `util/sync-routine.ts` → **`@dxos/plugin-routine` barrel** → `RoutineOperation` → **`@dxos/assistant-toolkit` barrel** → supervisor → `compute-runtime` → `@dxos/ai` **resolvers** → concrete OpenAI/Anthropic resolvers | definitions import `/types` subpaths, never plugin barrels; `@dxos/ai` resolvers must not be reachable from its type surface |
| CodeMirror: `@codemirror/view` 309 + `codemirror-lang-mermaid` 204                                                                    |                  ~510 KB | `MarkdownOperation` → `Markdown.ts` → `Settings.ts` → `ui-editor` types barrel → **`types/types.ts` value-imports `@codemirror/view`**                                                                                                                                                           | make the editor-type imports type-only; a `types/` file must not value-import an editor                                      |
| react-ui-editor full components barrel (76 `.tsx` files)                                                                              |                 (shared) | `CommentOperation` → **`@dxos/plugin-markdown` main barrel** → `MarkdownCapabilities` → `react-ui-editor` index → components                                                                                                                                                                     | cross-plugin definition imports go through `/types`                                                                          |

The `plugin.ts` static `export { XOperationHandlerSet } from './operations'` line (all 97 stubs;
sole external consumer is the node CLI) is the second door into the same graphs and falls out of
the same cleanup.

## Fix rules (the convention to enforce)

1. **Definitions import tags, never implementations.** Every service referenced by a definition
   (FactStore, AiService, …) must be importable as a `Context.Tag` from a chunk-free entry.
2. **Definitions never import a plugin's main barrel.** Cross-plugin type references go through
   `@dxos/plugin-x/types` (exists today; under-used) or `#types`.
3. **Type directories are value-free.** `types/*.ts` files must not value-import UI/editor/
   runtime packages (`ui-editor/src/types/types.ts` is the exemplar violation).
4. **`Operation` importable without the `@dxos/compute` barrel** (subpath or Header decoupled
   from `HttpClient`).
5. **Budget check in CI**: run the closure walk per definition file; fail on new heavy externals
   or closure growth. This matters _more_ once the `handles` declaration field lands — that
   substrate makes definitions imported even more widely, so their weight becomes the floor of
   every module spec.

## Recoverable estimate

Confirmed-shipping leak total ≈ **2.9–3.4 MB rendered (~2–2.5 MB wire)** out of the 10.4 MB
eager core — on top of, and independent from, the family-deferral work. Combined with the
`ResetDialog` lazy-import fix (~2 MB: emoji-mart, motion, mdast/mermaid, ajv/zod via
react-ui-form) this roughly halves the non-framework share of the eager core.
