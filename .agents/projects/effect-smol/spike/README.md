# effect-4-schema-ast spike

Standalone spike that de-risked the Effect 4 migration ahead of the port: it proved ECHO's
`SchemaAST` helpers could be rebuilt on v4's public API, and that JSON Schema persisted by Effect 3
reads back into Effect 4.

**Not part of the pnpm workspace** — it pins `effect@4.0.0-beta.105` against its own lockfile, and
`.agents/projects/**` matches no workspace, moon, or knip glob, so nothing here affects the build.

```sh
cd .agents/projects/effect-smol/spike
npm install
npm test        # 106 tests
npm run typecheck
```

## What shipped, and where it lives now

The migration landed, so most of this is superseded by real code:

| Spike file              | Shipped as                                                       |
| ----------------------- | ---------------------------------------------------------------- |
| `src/ast.ts`            | `packages/common/effect/src/internal/{ast,schema-ast}.ts`        |
| `src/json-schema-compat.ts` | `packages/core/echo/echo/src/internal/JsonSchema/`           |
| `src/dispatch.ts`       | the same module's read path (both formats, one entry point)      |

The durable rules the spike turned up — the `SchemaAST` facade, annotation resolution on refined
types, the `toJsonSchema` wire contract, the permanence of the v3 decoder — are in the `effect`
skill ([v4-schema.md](../../../skills/effect/v4-schema.md)), not here.

## What is still live

`src/migration.ts` + `test/migration.test.ts` prototype the `org.dxos.type.schema` `0.1.0` → `0.2.0`
ECHO migration, which is **not yet implemented** in the monorepo — it is the Composer-ship step in
[TASKS.md](../TASKS.md). Read it before writing the real one.

`REPORT.md` keeps the full evidence: the v3/v4 emitter comparison, the `SchemaRepresentation`
round-trip result, and the recommendation to move the *write* path off JSON-Schema-as-storage
(deferred; the read path is what shipped).

Fixtures are generated, not hand-written: `fixtures-v3.json` (2 built types) and `corpus-v3.json`
(all 18 ECHO types exported by `@dxos/types`) came from `@dxos/echo`'s `toJsonSchema` running on
effect 3.21.4. Regenerate from a temporary test inside the owning package if the stored format
changes.
