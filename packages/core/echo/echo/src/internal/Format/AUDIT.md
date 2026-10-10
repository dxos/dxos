# AUDIT: ECHO vs. ATProto Lexicon and the Fastmail vertical protocols

Two comparisons against ECHO's Effect-Schema + JSON-Schema mechanism and its `Query`/`Filter` system:

- **Part A — ATProto Lexicon** (§§2–9): a _horizontal_ schema-definition language. Gap analysis for making
  ECHO objects Lexicon-compatible.
- **Part B — Fastmail vertical protocols** (§10+): [JMAP, IMAP, CardDAV, CalDAV, WebDAV](https://www.fastmail.com/dev/).
  Each is a _vertical_ protocol — a fixed domain data model (mail / contacts / calendar / files) bundled with
  its own access, query, and sync mechanism. The headline finding: **ECHO's runtime model is much closer to
  JMAP-core than to Lexicon.** Lexicon is about identity/federation/immutable schema; JMAP-core is about
  typed objects + query + incremental sync — which is what ECHO already is.

Scope of the ECHO side audited:

- `packages/core/echo/echo/src/internal/Format/*` — the `TypeFormat` format vocabulary.
- `packages/core/echo/echo/src/internal/JsonSchema/json-schema-type.ts` — the on-disk schema representation.
- `packages/core/echo/echo/src/internal/{Type,Ref,Annotation}/*` — identity, references, annotations.
- `packages/core/echo/echo/src/{Query,Filter}.ts` + `packages/core/echo/echo-protocol/src/query/ast.ts` — query model.
- `packages/common/keys/src/DXN.ts` — the DXN identifier grammar.

---

## 1. Executive summary

| Dimension | ATProto Lexicon | ECHO | Verdict |
| --- | --- | --- | --- |
| Schema language | Bespoke JSON dialect (JSON-Schema-_like_, not JSON Schema) | Effect Schema → JSON Schema **Draft-07** + ECHO extensions | Different base, translatable |
| Identity | NSID (reverse-DNS), authority via DNS TXT | DXN (reverse-DNS NSID + optional semver), authority via registry | **Already NSID-aligned** |
| Versioning | Implicit; types immutable, fields additive-only | Explicit `version` semver field (meta + embedded) | Philosophy mismatch |
| Primitives | Closed set incl. `bytes`, `cid-link`, `blob`, `token` | Open `TypeFormat` annotation set; **no bytes/blob/cid-link/token** | **Primitive gap** |
| References | `ref`/`union` (schema-level) + `cid-link`/strong-ref/at-uri (data-level) | `Ref` → IPLD `{ "/": "dxn:…\|echo:…" }` | Close; encoding aligns |
| Relations | None (modeled as records w/ ref fields) | First-class `EntityKind.Relation` (source+target) | ECHO is richer |
| Query | **No query DSL** — `query`/`procedure` are typed XRPC HTTP endpoints | Rich serializable graph-query AST (traversal, relations, FTS/vector) | Not comparable 1:1 |
| Validation posture | Optimistic; preserve unknown fields; `$type` mandatory on records | Effect Schema strict decode; `$type`-equivalent is `system.type` URI | Mappable |

**Bottom line.** ECHO's identity scheme is _deliberately_ atproto-style (the `DXN.ts` grammar comment says
so), so the hardest part of interop — naming — is largely solved. The real work is (a) adding the missing
**binary/content primitives** (`bytes`, `blob`, `cid-link`) and the **`token`** symbolic type, (b) defining a
canonical **`$type` discriminator** and **record-key** convention on ECHO objects, and (c) reconciling
**explicit-version vs. immutable-evolution** semantics. ECHO's `Query` has no Lexicon counterpart and would
have to be _lowered_ to XRPC endpoint definitions + `listRecords` pagination.

---

## 2. Type / primitive comparison

### 2.1 Lexicon type vocabulary

Lexicon defines a **closed** set of node types (a schema using an unknown type is invalid):

- **Concrete primitives:** `boolean`, `integer`, `string`, `bytes`, `cid-link`, `blob`.
- **Containers:** `array`, `object`, `params` (params is query-string-only: boolean/integer/string + arrays thereof).
- **Meta:** `ref`, `union` (`refs[]` + `closed` flag), `unknown`, `token` (symbolic constant, no data), `permission`.
- **Primary (top-level) defs:** `record`, `query`, `procedure`, `subscription`, `permission-set`.

String `format` values: `at-identifier`, `at-uri`, `datetime`, `uri`, `did`, `handle`, `nsid`, `cid`, `tid`,
`record-key`, `language`.

Per-type constraints:

- `integer`: `minimum`, `maximum`, `enum`, `default`, `const`.
- `string`: `format`, `minLength`/`maxLength` (UTF-8 bytes), `minGraphemes`/`maxGraphemes`, `knownValues`, `enum`, `default`, `const`.
- `bytes`: `minLength`, `maxLength`.
- `array`: `items`, `minLength`, `maxLength`.
- `object`: `properties`, `required[]`, `nullable[]`.
- `blob`: `accept[]` (MIME globs), `maxSize`.

### 2.2 ECHO `TypeFormat` vocabulary

`TypeFormat` (`Format/types.ts:63`) is an **open annotation** layered on a small set of JSON-Schema base
types. It is a UI/semantic refinement of a base type, not a closed protocol primitive. 26 members:

| Base (`TypeEnum`) | `TypeFormat` members |
| --- | --- |
| `string` | `String`, `DID`, `DXN`, `Email`, `Formula`, `Hostname`, `JSON`, `Markdown`, `Password`, `Regex`, `SingleSelect`, `Text`, `URL`, `UUID`, `Date`, `DateTime`, `Time`, `Duration` |
| `number` | `Number`, `Currency`, `Integer`, `Percent`, `Timestamp` |
| `boolean` | `Boolean` |
| `object`/`array` | `MultiSelect`, `GeoPoint` (`lnglat`, a `[lng,lat,height?]` tuple) |
| `ref` | `Ref` |

Constraints live as Effect-Schema refinements serialized into JSON Schema Draft-07 keywords
(`json-schema-type.ts:88`): `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`/`multipleOf`,
`minLength`/`maxLength`/`pattern`, `minItems`/`maxItems`/`uniqueItems`, `required[]`, `enum`, `const`,
`allOf`/`anyOf`/`oneOf`/`not`/`if`/`then`/`else`, plus ECHO extensions (`propertyOrder`, `currency`,
`reference`, `annotations`).

### 2.3 Primitive mapping table

| Lexicon | ECHO equivalent | Status |
| --- | --- | --- |
| `boolean` | `TypeEnum.Boolean` | ✅ direct |
| `integer` | `TypeFormat.Integer` (`Schema.int()`) | ✅ direct |
| `string` | `TypeEnum.String` + formats | ✅ direct |
| `bytes` | — | ❌ **missing** (no binary primitive) |
| `cid-link` | — (closest: `Ref` IPLD `{ "/": … }`) | ⚠️ conceptually near; no content-address primitive |
| `blob` | — | ❌ **missing** (no media/file primitive, no `accept`/`maxSize`) |
| `array` | `type: 'array'` + `items` | ✅ direct |
| `object` | `type: 'object'` + `properties` | ✅ direct |
| `params` | — (no RPC layer) | ❌ n/a |
| `ref` | `$ref` / `Ref` reference schema | ✅ (semantics differ, see §4) |
| `union` (`closed`) | `anyOf`/`oneOf` | ⚠️ no `$type` discriminator, no `closed` flag |
| `unknown` | `Schema.Any` / `Schema.Unknown` | ✅ direct |
| `token` | — | ❌ **missing** (no symbolic-constant type) |
| `permission`/`permission-set` | — (handled by Subduction policy, not schema) | ❌ n/a as schema node |

### 2.4 String-format mapping table

| Lexicon `format` | ECHO `TypeFormat` | Status |
| --- | --- | --- |
| `datetime` | `DateTime` | ✅ (ECHO under-validates — `date.ts` validators are commented out) |
| `uri` | `URL` | ⚠️ ECHO regex ≠ RFC-3986; no 8 KB cap |
| `did` | `DID` | ✅ name match (ECHO `DID` is enum-only, no validator yet) |
| `language` | — | ❌ missing (BCP-47) |
| `at-identifier` | — | ❌ missing |
| `at-uri` | — (closest: `DXN`) | ⚠️ different scheme |
| `handle` | — | ❌ missing |
| `nsid` | `DXN` (sans `dxn:` prefix) | ✅ structurally equivalent |
| `cid` | — | ❌ missing |
| `tid` | — | ❌ missing (ECHO uses ULID-style EntityId) |
| `record-key` | — | ❌ missing (see §5) |
| — | `Email`, `Markdown`, `Currency`, `Percent`, `GeoPoint`, `Regex`, `Formula`, `Password`, `SingleSelect`/`MultiSelect`, `JSON`, `UUID`, `Hostname`, `Duration`, `Time`, `Date` | ECHO-only (no Lexicon format) |

**Observation.** Lexicon formats are network-identity-centric (`did`, `handle`, `at-uri`, `cid`, `tid`).
ECHO formats are application/UI-centric (`Currency`, `Markdown`, `GeoPoint`, `SingleSelect`). Mapping is
mostly **one-directional with loss**: ECHO→Lexicon collapses unknown formats back to `string`/`number`
(which Lexicon validators already do — they ignore unknown formats), but Lexicon→ECHO needs new identity
formats.

---

## 3. Schema representation & identity

### 3.1 Container format

| | Lexicon | ECHO |
| --- | --- | --- |
| File/unit | One `.json` Lexicon doc: `{ lexicon: 1, id: <NSID>, defs: { main, … } }` | One Effect Schema → one `JsonSchemaType` record (`$schema: draft-07`) |
| Multiple defs per unit | Yes (`defs` map, `#fragment` refs) | No — one schema per type; sub-defs via `$defs`/`definitions` (`json-schema-type.ts:271,297`) |
| Self-describing | `$type` on instances; defs reachable by NSID | `system.type` URI on instances; `typename`+`version` embedded (`json-schema-type.ts:124,130`) |

### 3.2 Identity & versioning — the key alignment

ECHO's `DXN` grammar (`DXN.ts:11`) is **explicitly atproto-style**:

```
dxn:<nsid>[:<version>]          e.g. dxn:org.dxos.type.calendar:1.0.0
```

- NSID portion is a reverse-DNS dotted name with a camelCase final segment — the same shape as a Lexicon NSID
  (`com.example.fooBar`). ECHO `Filter.key('org.example.type.foo')` queries by this NSID.
- **Difference 1 — version.** Lexicon has **no version field**; it relies on *immutable, additive-only*
  evolution (you may add optional fields and new defs; you may never change a field's type or remove one).
  ECHO carries an **explicit semver** (`TypeMeta.version`, `EntityMeta.version`), queryable with
  `Filter.key(key, { version: '^1.2.3' })` (`Filter.ts:182`). To present ECHO types as Lexicon, the version
  must be dropped from the wire NSID (or folded into the NSID path, e.g. `…fooV2`) and ECHO would have to
  honor Lexicon's immutability rules.
- **Difference 2 — authority.** Lexicon roots authority in DNS (`_lexicon.<authority>` TXT → DID). ECHO roots
  it in the schema registry (`Type.Type` records / `Scope.registry()`). Interop needs a resolver bridging
  DXN → DNS authority.

### 3.3 ECHO JSON-Schema extensions (beyond Draft-07)

From `json-schema-type.ts` and `JsonSchema/annotations.ts`:

- Root: `typename`, `version`, `entityKind` (`object`|`relation`|`type`), `relationSource`, `relationTarget`,
  `propertyOrder`, `currency`, `reference`.
- `annotations` namespace (`JsonSchemaEchoAnnotations`, `json-schema-type.ts:32`): `labelProp`, `generator`, `meta`.
- 15+ Effect annotations (`Annotation/annotations.ts`): `Type`, `TypeIdentifier`, `Reference`, `PropertyMeta`,
  `Hidden`, `Label`, `Description`, `FormInput`, `FormInline`, `FormCreate`, `FormOrdered`, `FormLayout`,
  `FieldLookup`, `Generator`, plus `Format`/`Options`/`Currency`.

Lexicon has **no annotation-extension mechanism**; it warns that third-party fields "risk future type
conflicts." ECHO's namespaced `annotations` object is the safer pattern but is non-standard from Lexicon's
view — on export these must either be dropped or quarantined under a vendor-prefixed def.

---

## 4. References & relations

### 4.1 Schema-level references

| | Lexicon | ECHO |
| --- | --- | --- |
| Mechanism | `ref` (single NSID/`#frag`), `union` (`refs[]`) | `$ref` + ECHO `reference` block (`Ref/ref.ts:48`) |
| Encoding | `{ "type": "ref", "ref": "com.example.defs#view" }` | `{ $id: '/schemas/echo/ref', reference: { schema: { $ref: 'dxn:…' }, schemaVersion } }` |
| Constraint | `ref` may not target a ref/union; `$type` omitted on object-refs | targets an ECHO-typed schema only (`Ref()` throws otherwise) |

### 4.2 Data-level (instance) references

This is where the two are closest:

- **Lexicon**: `cid-link` (`{ "$link": "<cid>" }`), `at-uri` strings (`at://did/collection/rkey`), and
  "strong refs" (records holding `{ uri, cid }`).
- **ECHO**: `Ref` serializes to IPLD-style `{ "/": "dxn:…" }` or `{ "/": "echo:/<EntityId>", "target"?: {…} }`
  (`Ref/ref.ts:593`, `EncodedReference`). Two URI schemes: `echo:` for instance refs, `dxn:` for type refs
  (`Ref/ref.ts:171`).

ECHO's `{ "/": … }` envelope is structurally analogous to IPLD/`cid-link`'s `{ "$link": … }`, and the `echo:`
EID plays the role of the at-uri/rkey locator. The semantic gap: ECHO refs are **not content-addressed**
(no CID), so Lexicon's integrity guarantee (a strong ref pins an exact record version by CID) has no ECHO
analog. ECHO adds capabilities Lexicon lacks: lazy loading, `noInline()`, reactive `atom`, optional inlined
`target`.

### 4.3 Relations

ECHO has a **first-class** relation kind (`EntityKind.Relation`, with `relationSource`/`relationTarget` in the
schema and a dedicated `Query.sourceOf`/`targetOf`/`source`/`target` traversal API). Lexicon has **no relation
concept** — a "relation" is just a record with `at-uri`/strong-ref fields, indexed by an AppView. Lowering
ECHO relations to Lexicon means emitting them as ordinary `record` defs with two ref-typed properties and
losing the directional traversal semantics at the protocol layer.

---

## 5. Record keys & instance identity

| | Lexicon | ECHO |
| --- | --- | --- |
| Instance id | `at://<did>/<collection-nsid>/<record-key>` | `echo:/<EntityId>` (ULID-style, e.g. `01KKKG2…`) |
| Key types | `tid` (timestamp-sortable), `record-key` (general), literal keys | Single opaque `EntityId`; no collection/rkey split |
| Collection | The record's NSID *is* the collection | Typename via `system.type`; objects live in a space, not a per-type collection |
| `$type` on instance | **Mandatory** on every record | `system.type` URI (functionally equivalent, different field) |

To be Lexicon-addressable, ECHO objects need: (a) a deterministic **record-key** (could derive a `tid` from
the EntityId or mint one), (b) a **collection = typename** convention, and (c) a `$type` field mirroring
`system.type` as a bare NSID.

---

## 6. Query mechanism comparison

**Critical asymmetry: Lexicon has no data-query language.** In Lexicon, `query` and `procedure` are
*HTTP/XRPC endpoint definitions* (read = `query`, write = `procedure`) with typed `parameters` (a `params`
node), typed `output`/`input` bodies (MIME `encoding` + optional `schema`), and an `errors[]` list.
`subscription` defines a WebSocket event stream (`message` union). Actual data retrieval in atproto is:

- **Repo primitives**: `getRecord`, `listRecords(collection, limit, cursor, reverse)` — paginate one
  collection by record-key range. No filtering by field, no joins, no traversal.
- **Firehose** (`subscribeRepos`): consume all commits; an **AppView** builds its own (typically SQL) indexes.
- **AppView XRPC**: app-defined `query` endpoints (e.g. `app.bsky.feed.getTimeline`) whose richness lives in
  server code, **not** in Lexicon.

ECHO, by contrast, ships a **serializable graph-query AST** executed by the client/host.

### 6.1 ECHO query surface

`Query`/`Filter` (`Query.ts`, `Filter.ts`) compile to `QueryAST` (`echo-protocol/src/query/ast.ts`):

- **Filters** (`QueryAST.Filter` union): `object` (typename + per-prop predicates + `id`/`foreignKeys`/`metaKey`/`metaVersion`),
  `compare` (`eq`/`neq`/`gt`/`gte`/`lt`/`lte`), `in`, `contains`, `range`, `tag`, `timestamp` (created/updated),
  `text-search` (`full-text`|`vector`), `child-of` (transitive), `not`/`and`/`or`.
- **Query clauses** (`QueryAST.Query` union): `select`, `filter`, `reference-traversal`, `incoming-references`
  (`referencedBy`), `relation` (`sourceOf`/`targetOf`), `relation-traversal` (`source`/`target`),
  `hierarchy-traversal` (`parent`/`children`), `union`, `set-difference` (`without`), `order`, `limit`,
  `options`, `from` (scopes: `space`/`feed`/`registry`, or another query).
- **Order**: `natural`, `property`, `rank` (relevance), `timestamp`.
- AST is itself an Effect Schema (`org.dxos.schema.query`) → serializable, with `visit`/`map`/`fold` walkers.

### 6.2 Side-by-side

| Capability | Lexicon / atproto | ECHO |
| --- | --- | --- |
| Query representation | XRPC endpoint signature (params/output types) | Serializable AST (`QueryAST.Query`) |
| Field predicates | None (AppView-internal SQL) | `compare`/`in`/`range`/`contains`/`tag` |
| Type filter | Collection = NSID (one per call) | `Filter.type(...)`, union of typenames |
| Joins / traversal | None at protocol level | `reference`, `referencedBy`, relation & hierarchy traversal |
| Full-text / vector | AppView-specific | `Filter.text(..., { type })` first-class |
| Ordering | `listRecords` rkey order only (+ `reverse`) | `orderBy` property/rank/timestamp, multi-key |
| Pagination | `cursor`/`limit` | `limit` (+ host paging) |
| Set ops | None | `Query.all` (union), `Query.without` (difference) |
| Scope/federation | Per-PDS/AppView endpoint | `from(space|feed|registry|'all-accessible-spaces')` |
| Live updates | `subscription` firehose | reactive query results (host-side) |

**Implication for interop.** ECHO `Query` cannot round-trip to Lexicon. The realistic mapping:

- `select(Filter.type(T))` with simple prop equality → a generated XRPC `query` def + server that fans out to
  `listRecords` and filters; or a pre-built AppView index.
- Traversals/relations/set-ops/FTS → **bespoke AppView `query` endpoints**; the logic lives in server code, and
  Lexicon only describes the endpoint's params/output shape.
- Conversely, importing a Lexicon `query` endpoint into ECHO means generating param/output **types**, not a
  `Query` — there is nothing to translate into the AST.

---

## 7. Gap analysis — making ECHO objects Lexicon-compatible

Ordered by leverage. "Add" = new ECHO capability; "Map" = serialization/codec work; "Reconcile" = semantic
decision.

### 7.1 New primitives (required)

1. **`bytes`** — add a binary primitive (Effect `Uint8Array` schema + a `TypeFormat.Bytes`), serialize as
   Lexicon `bytes` (base64 in JSON) / DAG-CBOR byte string. Today ECHO has no binary scalar.
2. **`blob`** — add a media/file primitive carrying `{ mimeType, size, ref }` with `accept[]`/`maxSize`
   constraint annotations. Needed for any attachment/media interop; ECHO currently models files outside the
   schema layer.
3. **`cid-link` / content addressing** — introduce a content-addressed link (CID) distinct from `Ref`. ECHO's
   `Ref` is location/identity-addressed (`echo:`/`dxn:`), not content-addressed, so it cannot express
   Lexicon's strong-ref integrity guarantee.
4. **`token`** — add a symbolic-constant type (a named value with no data payload) for open enumerations
   (`knownValues`). Closest current tool is `enum`/`const`, which is not reference-addressable like a token.

### 7.2 New string formats (required for inbound Lexicon)

Add `TypeFormat` members + validators: `at-uri`, `at-identifier`, `handle`, `nsid` (mostly = `DXN` minus
prefix), `cid`, `tid`, `record-key`, `language` (BCP-47). Also **finish** the stubbed ECHO validators
(`Formula`, `Hostname`, `Regex`, and the commented-out `date`/`time`/`datetime` transforms in `date.ts`) and
add `minGraphemes`/`maxGraphemes` (Lexicon counts graphemes; ECHO only has byte/code-unit `minLength`/`maxLength`).

### 7.3 Discriminator & union semantics (required)

5. **`$type` convention** — define a canonical mapping from `system.type` to a Lexicon `$type` (bare NSID, no
   version) stamped on records and union variants. ECHO unions (`anyOf`/`oneOf`) currently lack a discriminator.
6. **`closed` unions** — add a `closed` flag annotation so ECHO can express Lexicon's closed vs. open unions.
7. **`nullable`** — Lexicon distinguishes omitted / `null` / absent via a `nullable[]` array; ECHO uses
   `Schema.optional`/`NullOr`. Add a codec that emits `nullable[]` and `required[]` faithfully.

### 7.4 Identity & record addressing (required)

8. **Record key** — derive/mint a Lexicon `record-key` (or `tid`) per object; expose a `collection = typename`
   view so objects are addressable as `at://…/<nsid>/<rkey>`.
9. **NSID-without-version export** — Lexicon NSIDs carry no version. Decide whether to (a) drop `version` on
   export, (b) encode version into the NSID's final segment, or (c) publish each version as a distinct NSID.
10. **Authority resolver** — bridge DXN authority (registry) ↔ Lexicon authority (`_lexicon.<domain>` DNS TXT
    → DID) so cross-org references resolve.

### 7.5 Evolution semantics (reconcile)

11. **Immutability / additive-only** — adopt (or gate behind a "Lexicon-compat" flag) Lexicon's rule that
    fields are never removed or retyped and only optional fields/defs are added. ECHO's `Type/manipulation.ts`
    freely renames/removes/retypes fields; that is incompatible with a published Lexicon contract.

### 7.6 Codec / representation (map)

12. **Lexicon ↔ JsonSchema translator** — a bidirectional codec: ECHO `JsonSchemaType` (Draft-07 + extensions)
    → Lexicon `defs` dialect and back. Must quarantine ECHO's `annotations` namespace + `propertyOrder` +
    `currency` under a vendor-prefixed def (or drop), and map `entityKind: relation` → a plain `record`.
13. **Relations** — emit ECHO relations as records with two `ref`/strong-ref fields; document the lost
    directional-traversal semantics.

### 7.7 Out of scope as schema (note, don't build)

- `params`, `query`, `procedure`, `subscription`, `permission`/`permission-set` are atproto's **RPC/auth**
  layer, not data schema. ECHO's equivalents are Operations (RPC), the reactive `Query` engine, and the
  Subduction policy (`authorizeConnect`/`Fetch`/`Put`). Aligning these is a separate, larger effort and is not
  required to make ECHO *objects* (records) Lexicon-compatible.

### 7.8 Effort sketch

| Item | Effort | Blocking for round-trip? |
| --- | --- | --- |
| `bytes` primitive | M | Yes |
| `blob` primitive | M | Yes (for media) |
| `cid-link` / CID | L | Only for integrity/strong-ref |
| `token` | S | Only for open enums |
| Identity formats (at-uri/cid/tid/nsid/handle/language) | M | Yes (inbound) |
| `$type` + `nullable` + `closed` codecs | M | Yes |
| record-key / collection view | M | Yes |
| Lexicon↔JsonSchema translator | L | Yes |
| Immutability semantics | M (policy) | Yes (for published contracts) |
| Authority/DNS resolver | M | Only for federation |

---

## 8. Notable convergences (already aligned)

- **NSID naming.** DXN is intentionally an "atproto-style dotted name" (`DXN.ts:11`). `Filter.key(nsid)` already
  queries by NSID.
- **IPLD-style ref envelope.** ECHO `{ "/": … }` mirrors IPLD/`cid-link` `{ "$link": … }`.
- **JSON Schema base.** ECHO already emits Draft-07; Lexicon explicitly aims to be JSON-Schema-translatable.
- **Self-describing instances.** Both stamp a type discriminator on instances (`$type` vs. `system.type`).
- **Optimistic validation.** Both favor preserving unknown fields across schema evolution (ECHO's deprecated-
  field tolerance in `JsonSchemaEchoAnnotations`, Lexicon's "preserve unexpected fields").

---

## 9. References (code)

- Formats: `Format/types.ts:63` (`TypeFormat`), `:138` (`formatToType`); `Format/{string,number,date,object}.ts`.
- JSON Schema: `JsonSchema/json-schema-type.ts:88` (`JsonSchemaType`), `:32` (`JsonSchemaEchoAnnotations`).
- References: `Ref/ref.ts:37` (`JSON_SCHEMA_ECHO_REF_ID`), `:48` (`createSchemaReference`), `:171` (`Ref<T>`), `:593` (`encode`).
- Identity: `keys/src/DXN.ts:11` (grammar); `Type/type-schema.ts:23` (`TypeSchema`); `Annotation/annotations.ts` (`TypeAnnotation`/`TypeMeta`).
- Query: `echo/src/Query.ts`, `echo/src/Filter.ts`, `echo-protocol/src/query/ast.ts`.
- Lexicon spec: <https://atproto.com/specs/lexicon> (fetched 2026-06-30).

---

# Part B — Fastmail vertical protocols (JMAP, IMAP, CardDAV, CalDAV, WebDAV)

## 10. Framing: horizontal schema vs. vertical protocols

Lexicon and ECHO are **horizontal**: a schema language + engine for arbitrary user-defined types. The
Fastmail stack is **vertical**: each protocol ships a _fixed_ domain data model plus the machinery to access,
query, and sync it. There is no schema *language* in these protocols — the schemas are frozen in prose RFCs
(JMAP-Mail RFC 8621, vCard RFC 6350, iCalendar RFC 5545) and the wire formats differ per protocol.

The exception is **JMAP core (RFC 8620)**, which deliberately factors out a _generic_ object + query + sync
layer (`Foo/get`, `Foo/set`, `Foo/query`, `Foo/changes`, `Foo/queryChanges`, state strings, back-references),
and then layers Mail/Contacts/Calendar as capability extensions. That generic core is the part of the whole
Fastmail stack that most resembles ECHO — but it resembles ECHO's **runtime/database/query** layer, not its
**schema** layer.

| Protocol | Domain | Wire format | Schema source | Query | Incremental sync | Transport |
| --- | --- | --- | --- | --- | --- | --- |
| **JMAP core** (8620) | generic | JSON | per-type spec | `Foo/query` (Filter+Comparator) | `Foo/changes` + `Foo/queryChanges` via `state` | HTTP |
| JMAP Mail (8621) | mail | JSON | fixed | as above | as above | HTTP |
| **IMAP** (3501/9051) | mail | text protocol | fixed (RFC 5322) | `SEARCH` | `CONDSTORE`/`QRESYNC` `MODSEQ` (7162) | stateful TCP |
| **CardDAV** (6352) | contacts | vCard (6350) in XML | fixed | `REPORT addressbook-query` | `sync-collection` (6578) + ETag | HTTP/WebDAV |
| **CalDAV** (4791) | calendar | iCalendar (5545) in XML | fixed | `REPORT calendar-query` (time-range) | `sync-collection` + ETag / CTag | HTTP/WebDAV |
| **WebDAV** (4918) | files | XML props / opaque bodies | none (props are dead/live) | `PROPFIND` (depth) | ETag; `sync-collection` if supported | HTTP |

## 11. Schema / data-model comparison

These protocols don't expose a schema *mechanism* to compare against ECHO's `JsonSchemaType`; they expose
**fixed schemas** in **domain serializations**. The interop question is therefore not "translate the schema
language" (as with Lexicon) but "define ECHO types matching the domain model + write a codec for the wire
format":

| Protocol object | Serialization | ECHO equivalent to author | Codec required |
| --- | --- | --- | --- |
| JMAP `Email`/`Mailbox`/`Thread` | JSON object | ECHO `Email`/`Mailbox` types | JSON ↔ ECHO (easy — both JSON object graphs) |
| JMAP `ContactCard` (8621/9610) | JSON object | ECHO `Contact` type | JSON ↔ ECHO |
| vCard (CardDAV) | text (`BEGIN:VCARD…`) | ECHO `Contact` type | vCard ↔ ECHO |
| iCalendar (CalDAV) | text (`BEGIN:VCALENDAR…`) | ECHO `CalendarEvent` type | iCalendar ↔ ECHO (recurrence rules!) |
| RFC 5322 message (IMAP) | MIME text | ECHO `Email` + `blob` attachments | MIME parse ↔ ECHO |
| WebDAV resource + props | opaque body + XML props | ECHO object + `PropertyMeta` | property ↔ annotation map |

Observations:

- ECHO's **JSON-native** object model lines up with JMAP's JSON objects almost 1:1 (both are typed property
  bags with ids and refs). vCard/iCalendar/MIME are text formats needing real parsers (and iCalendar `RRULE`
  recurrence has no ECHO analog today).
- **`blob` again.** Mail attachments and file bodies make the missing `blob`/`bytes` primitive (Part A §7.1)
  a hard requirement for IMAP/JMAP-Mail/WebDAV interop.
- WebDAV "dead properties" (arbitrary name→value props on a resource) map naturally onto ECHO's
  `PropertyMeta` annotation bag.

## 12. Query & sync comparison (the substantive axis)

Unlike Lexicon (which has **no** data query — Part A §6), every Fastmail protocol has a real query + a real
incremental-sync mechanism. This is where ECHO has genuine peers.

### 12.1 Query

| Capability | ECHO `Query`/`Filter` | JMAP `Foo/query` | IMAP `SEARCH` | Card/CalDAV `REPORT` | WebDAV `PROPFIND` |
| --- | --- | --- | --- | --- | --- |
| Representation | serializable AST | JSON `Filter`/`FilterOperator` | text criteria | XML filter element | depth + prop list |
| Boolean ops | `and`/`or`/`not` | `AND`/`OR`/`NOT` operators | `OR`/`NOT`, implicit AND | nested `comp/prop-filter` | — |
| Field predicates | `eq/neq/gt/gte/lt/lte/in/range/contains` | per-type `FilterCondition` | header/flag/date keys | `prop-filter` + `text-match` | — |
| Type/collection scope | `Filter.type(...)`, multi-type union | one object type per call | one mailbox | one collection | one collection |
| Time predicates | `created`/`updated` ranges | per-type date conditions | `SINCE`/`BEFORE`/`SENTSINCE` | `time-range` (CalDAV) | — |
| Full-text / semantic | `text(..., {full-text\|vector})` | server text conditions | `TEXT`/`BODY` | `text-match` | — |
| Sort | `orderBy` (property/rank/timestamp, multi-key) | `Comparator[]` (multi, collation) | `SORT` ext (RFC 5256) | — (client sorts) | — |
| Pagination | `limit` (+ host) | `position`/`limit`/`anchor` + `total` | sequence/UID ranges | — | — |
| Joins / traversal | `reference`/`referencedBy`/relations/hierarchy | **back-references** (`ResultReference`, `#`-path) chain calls | `THREAD` (limited) | — | — |
| Set ops | `Query.all` / `Query.without` | — (compose via back-refs) | — | — | — |

Notes:

- **JMAP `Filter`/`FilterOperator` + `Comparator` is a near-exact structural twin of ECHO `Filter` +
  `Order`.** The difference is per-type vs. generic conditions (JMAP `FilterCondition` is defined per object
  type; ECHO predicates are generic over any prop) and that JMAP runs server-side over one type per call,
  whereas ECHO's AST spans types, traversals, relations, and set operations in one tree.
- **JMAP back-references ≈ ECHO query composition.** JMAP chains method calls in one request
  (`Email/query` → feed `#/ids` into `Email/get`); ECHO instead embeds traversal/composition directly in the
  AST (`Query.from(query)`, `reference()`, `referencedBy()`). Same goal (avoid round-trips / express joins),
  different mechanism — JMAP at the RPC-batch layer, ECHO in the query language.
- **DAV `REPORT` queries** are coarser: one collection, XML filter, client does most sorting. **IMAP
  `SEARCH`** is server-side but mail-specific and operates over a single selected mailbox.

### 12.2 Incremental sync — the deeper difference

| Mechanism | Change token | Delta query | Granularity |
| --- | --- | --- | --- |
| **ECHO** | Automerge CRDT heads (per-doc vector of hashes) | reactive query re-eval on mutation; CRDT merge | per-object/property, **multi-writer** |
| **JMAP** | opaque `state` string per type per account | `Foo/changes(sinceState)` → created/updated/destroyed; `Foo/queryChanges` for result-set deltas | per-object; **server-authoritative** |
| **IMAP** | `MODSEQ` (monotonic per-mailbox counter, 7162) | `CHANGEDSINCE`/`QRESYNC` | per-message/flag; server-authoritative |
| **Card/CalDAV** | `sync-token` (6578) + per-resource `ETag` | `REPORT sync-collection(sync-token)` → changed/removed | per-resource; server-authoritative |
| **WebDAV** | `ETag` (+ optional `sync-token`) | conditional GET / `sync-collection` | per-resource; server-authoritative |

The architecturally important split:

- **All Fastmail protocols are server-authoritative.** There is a single source of truth; sync is a client
  pulling a linear delta from a monotonic server clock (`state` string, `MODSEQ`, `sync-token`, `ETag`). The
  token totally orders history.
- **ECHO is local-first / CRDT.** There is no single linear state — Automerge merges concurrent multi-writer
  edits; "state" is a set of document heads, not a server counter. ECHO can *emulate* a JMAP-style monotone
  `state` string per replica (e.g. hash of heads) and *derive* `Foo/changes` deltas, but the semantics
  differ: JMAP assumes the server defines a total order and can refuse with `cannotCalculateChanges`; ECHO
  resolves divergence by merge instead of refusal.
- JMAP's coalescing rules (created+destroyed ⇒ omit, etc.) and "intermediate states for large deltas" are
  presentation choices over a linear log; ECHO's equivalent is materializing CRDT history into a created/
  updated/destroyed view — derivable, but not native.

**Conclusion.** ECHO's reactive query engine subsumes the *capability* of every sync mechanism here, but its
*shape* is CRDT/local-first, not token/server-authoritative. A JMAP facade over ECHO is the most natural fit;
DAV/IMAP facades are possible but fight the grain (they assume server-assigned ETags/UIDs and a single truth).

## 13. Gap analysis — interoperating with the vertical protocols

Distinct from the Lexicon gaps (Part A §7). Two directions:

### 13.1 ECHO as a *client/importer* of these protocols (ingest mail/contacts/calendar/files into ECHO)

1. **Domain types.** Author ECHO schema types mirroring JMAP-Mail / vCard / iCalendar / WebDAV-resource
   models (`Email`, `Mailbox`, `Contact`, `CalendarEvent`, `File`). (Some already exist in plugins, e.g.
   inbox/contacts.)
2. **Format codecs.** vCard ↔ ECHO, iCalendar ↔ ECHO (incl. `RRULE` recurrence — no ECHO analog yet),
   MIME/RFC-5322 ↔ ECHO. JMAP JSON ↔ ECHO is the cheapest.
3. **`blob`/`bytes` primitive** (shared with Part A §7.1) — mandatory for attachments and file bodies.
4. **External-id mapping.** Persist source `ETag`/`MODSEQ`/JMAP-`id`/`sync-token` as ECHO `foreignKeys`
   (`Filter.foreignKeys` already exists) so re-sync is incremental and idempotent.

### 13.2 ECHO as a *server* exposing a JMAP-like facade (serve ECHO data over JMAP)

5. **`state` derivation.** Map ECHO/Automerge heads → an opaque monotone per-type `state` string; implement
   `Foo/changes`/`Foo/queryChanges` by diffing materialized history. Handle the `cannotCalculateChanges`
   case when history is pruned.
6. **`Foo/query` lowering.** ECHO `QueryAST` → JMAP `Filter`/`Comparator` is straightforward for the
   `object`/`compare`/`and`/`or`/`not`/`order`/`limit` subset; traversal/relation/set-difference nodes have
   no JMAP equivalent and would surface as separate batched calls (back-references) or be disallowed.
7. **Batching + back-references.** Implement the `methodCalls`/`methodResponses` envelope, creation-id
   substitution, and `ResultReference` resolution — these are RPC-layer concerns (closest ECHO analog is the
   Operations layer), not schema.
8. **Capability negotiation.** Advertise ECHO types as JMAP capabilities (`using`/`accountCapabilities`).

### 13.3 Effort sketch

| Item | Effort | Notes |
| --- | --- | --- |
| ECHO domain types (mail/contacts/calendar/file) | M | partly exists in plugins |
| `blob`/`bytes` primitive | M | shared with Lexicon gap |
| JMAP JSON codec | S | JSON-native both sides |
| vCard / iCalendar / MIME codecs | L | text parsers; iCal recurrence is the hard part |
| `state`/`changes` derivation from Automerge | L | CRDT→linear-delta materialization |
| `QueryAST` → JMAP query lowering | M | subset maps cleanly; traversals don't |
| JMAP request envelope + back-refs | M | RPC layer, not schema |
| DAV/IMAP facades | XL | fight the local-first grain; likely not worth it vs. JMAP |

## 14. Cross-cutting takeaways

- **Lexicon and the Fastmail protocols solve disjoint problems.** Lexicon = a horizontal *schema/identity/
  federation* language with no query. JMAP-core = a horizontal *object/query/sync* runtime with no schema
  language. ECHO spans both halves: it has the schema layer (Part A) *and* the query/sync runtime (Part B).
- **JMAP-core is the closest existing standard to ECHO's runtime.** `get/set/query/changes` ≈ ECHO database
  CRUD + `Query` + reactivity; `Filter`/`Comparator` ≈ ECHO `Filter`/`Order`; back-references ≈ ECHO query
  composition. The gap is local-first/CRDT (ECHO) vs. server-authoritative linear `state` (JMAP).
- **`blob`/`bytes` is the single most repeated missing primitive** — required for both Lexicon media and
  every mail/file vertical.
- A pragmatic interop strategy: adopt **Lexicon-style NSID identity** (already true via DXN) for the schema/
  federation layer, and a **JMAP-style facade** for the query/sync layer, rather than trying to bend ECHO to
  the DAV/IMAP server-authoritative model.

## 15. References (Part B)

- Fastmail developer protocols: <https://www.fastmail.com/dev/> (fetched 2026-06-30).
- JMAP core: RFC 8620 <https://www.rfc-editor.org/rfc/rfc8620>; JMAP Mail: RFC 8621.
- IMAP: RFC 3501 / 9051; `CONDSTORE`/`QRESYNC`: RFC 7162.
- CardDAV: RFC 6352; vCard: RFC 6350. CalDAV: RFC 4791; iCalendar: RFC 5545.
- WebDAV: RFC 4918; collection sync: RFC 6578.
- ECHO query/reactivity: `echo/src/Query.ts`, `echo/src/Filter.ts`, `echo-protocol/src/query/ast.ts`;
  foreign keys: `Filter.ts:226` (`foreignKeys`).

---

# Part C — Worked example & landscape

## 16. Worked example: a `Contact` across ECHO, Lexicon, and JMAP

The same domain object — a contact with `name`, `email`, and a reference to an `Organization` — expressed in
each system. This makes the §3/§4 identity-and-reference differences and the §12 query differences concrete.

### 16.1 ECHO — type definition

Following the canonical pattern (`Obj/create-object.ts:58`, `compute/ai/src/testing/test-schema.ts:12`):

```ts
import { DXN, Ref, Type } from '@dxos/echo';
import { Format } from '@dxos/echo';
import * as Schema from 'effect/Schema';

class Contact extends Type.makeObject<Contact>(DXN.make('com.example.type.contact', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    email: Schema.optional(Format.Email),
    organization: Schema.optional(Ref.Ref(Organization)),
  }).pipe(Schema.annotations({ title: 'Contact' })),
) {}
```

### 16.2 ECHO — persisted JSON Schema (`JsonSchemaType`)

```json
{
  "$schema": "https://json-schema.org/draft-07/schema",
  "$id": "dxn:com.example.type.contact:0.1.0",
  "typename": "com.example.type.contact",
  "version": "0.1.0",
  "entityKind": "object",
  "type": "object",
  "title": "Contact",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email", "pattern": "^[a-zA-Z0-9._%+-]+@..." },
    "organization": {
      "$id": "/schemas/echo/ref",
      "$ref": "/schemas/echo/ref",
      "reference": {
        "schema": { "$ref": "dxn:com.example.type.organization" },
        "schemaVersion": "0.1.0"
      }
    }
  },
  "required": ["id", "name"],
  "propertyOrder": ["id", "name", "email", "organization"],
  "annotations": { "labelProp": "name" }
}
```

### 16.3 ECHO — instance (encoded)

```json
{
  "id": "01J8X2K7QF3M9V0ABCDEF12345",
  "@type": "dxn:com.example.type.contact:0.1.0",
  "name": "Alice Example",
  "email": "alice@example.com",
  "organization": { "/": "echo:01J8X2N0RRGZ7T0ORGORGORG00" }
}
```

Note the ref encoding `{ "/": "echo:<EntityId>" }` (instance ref) vs. the schema-level `"$ref": "dxn:…"`.

### 16.4 Lexicon — schema document (`com.example.contact`)

```json
{
  "lexicon": 1,
  "id": "com.example.contact",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name":  { "type": "string", "maxGraphemes": 256 },
          "email": { "type": "string", "format": "uri" },
          "org":   { "type": "ref", "ref": "com.atproto.repo.strongRef" }
        }
      }
    }
  }
}
```

Three teaching points fall out of this:

- **No version in the id.** `com.example.contact`, not `…:0.1.0`. The version lives in immutable evolution
  rules, not the NSID (Part A §3.2).
- **No `email` format.** Lexicon has no email format; the closest is a generic `uri`/`string`. ECHO's
  `format: "email"` round-trips back to ECHO but is invisible to Lexicon validators (Part A §2.4).
- **Reference asymmetry (the subtle one).** ECHO encodes the org pointer inline as
  `{ "/": "echo:…" }`. In Lexicon `type: ref` means a *schema* reference, **not** an instance pointer — an
  instance pointer to another record is an `at-uri` string or a **strong-ref** record
  `com.atproto.repo.strongRef` = `{ uri, cid }` (Part A §4.1 vs §4.2). Shown here as a strong-ref.

### 16.5 Lexicon — record instance

```json
{
  "$type": "com.example.contact",
  "name": "Alice Example",
  "email": "alice@example.com",
  "org": {
    "uri": "at://did:plc:abc123/com.example.organization/3jzfcijpj2z2a",
    "cid": "bafyreid27zk7lbis4zw5fz4podbvbs4fc5ivwji3dmrwa6zggnj4bnd57u"
  }
}
```

Stored at `at://did:plc:abc123/com.example.contact/3k2akwxyz…` (the rkey is a `tid`). `$type` is mandatory;
the `cid` pins an exact version of the target — the content-address guarantee ECHO's `Ref` lacks (Part A §4.2).

### 16.6 JMAP — object + the query that chases the reference

JMAP object (returned by `Contact/get`):

```json
{
  "id": "C8a9e1f0",
  "name": "Alice Example",
  "email": "alice@example.com",
  "organizationId": "Ob3c2d1"
}
```

JMAP foreign keys are plain `Id` strings (`organizationId`), resolved by a follow-up method call. Fetching
contacts-with-email, sorted, then chasing the org in **one batched request** via back-references:

```json
{
  "using": ["urn:ietf:params:jmap:core", "https://example.com/jmap/contacts"],
  "methodCalls": [
    ["Contact/query", {
      "accountId": "A1",
      "filter": { "operator": "AND", "conditions": [{ "hasEmail": true }] },
      "sort":   [{ "property": "name", "isAscending": true }],
      "limit":  50
    }, "0"],
    ["Contact/get", {
      "accountId": "A1",
      "#ids": { "resultOf": "0", "name": "Contact/query", "path": "/ids" }
    }, "1"],
    ["Organization/get", {
      "accountId": "A1",
      "#ids": { "resultOf": "1", "name": "Contact/get", "path": "/list/*/organizationId" }
    }, "2"]
  ]
}
```

### 16.7 The equivalent ECHO query

```ts
// Filter + sort + limit  ≈  Contact/query
const contacts = Query
  .select(Filter.type(Contact, { email: Filter.neq(undefined) }))
  .orderBy(Order.property('name', 'asc'))
  .limit(50);

// Reference traversal  ≈  the Organization/get back-reference in call "2"
const orgs = Query
  .select(Filter.type(Contact, { email: Filter.neq(undefined) }))
  .reference('organization');
```

Same intent three ways: JMAP expresses the join as **back-references across batched RPC calls**; ECHO
expresses it as a **traversal node inside one query AST** (`reference('organization')`); Lexicon cannot
express the join at all — a client fetches the contact, reads the strong-ref `uri`, and issues a separate
`com.atproto.repo.getRecord` (Part A §6).

## 17. Landscape diagram (horizontal vs. vertical)

Two concerns run left-to-right — a **schema/identity** layer and a **query/sync** layer. Systems are
**horizontal** (general, any type) or **vertical** (one fixed domain). ECHO is the only system that covers
both layers of the horizontal column.

```
                    HORIZONTAL (any user-defined type)            VERTICAL (one fixed domain)
                 ┌────────────────────────────────────────┐  ┌──────────────────────────────────┐
                 │                                          │  │                                  │
  SCHEMA /       │   Lexicon            ┌───────────────┐   │  │  (fixed domain schemas:          │
  IDENTITY       │   (NSID identity,    │               │   │  │   JMAP-Mail / vCard /            │
  layer          │    refs, immutable   │               │   │  │   iCalendar — frozen in RFCs,    │
                 │    evolution;        │     ECHO       │   │  │   no schema *language*)          │
                 │    no query)         │               │   │  │                                  │
                 ├──────────────────────┤  schema +     ├───┤  ├──────────────────────────────────┤
                 │                      │  query/sync   │   │  │  IMAP   CardDAV  CalDAV  WebDAV   │
  QUERY /        │   JMAP-core          │  in one       │   │  │  (SEARCH/REPORT/PROPFIND;         │
  SYNC           │   (get/set/query/    │  local-first  │   │  │   MODSEQ / sync-token / ETag;     │
  layer          │    changes; Filter;  │  CRDT engine) │   │  │   server-authoritative)          │
                 │    state strings;    │               │   │  │                                  │
                 │    server-auth)      └───────────────┘   │  │  JMAP-Mail/Contacts/Calendar     │
                 │                                          │  │  (JMAP-core + fixed schema)      │
                 └────────────────────────────────────────┘  └──────────────────────────────────┘

   Lexicon      → horizontal, schema/identity only          (no query, no sync)
   JMAP-core    → horizontal, query/sync only               (generic; schemas are extensions)
   ECHO         → horizontal, BOTH layers                    (local-first / CRDT, not server-authoritative)
   IMAP/DAV     → vertical, query/sync over a fixed schema   (server-authoritative)
   JMAP verticals→ vertical = JMAP-core + a frozen domain schema
```

Reading: Lexicon occupies only the top-left (schema/identity, no query). JMAP-core occupies only the
bottom-left (query/sync, no schema language). The Fastmail verticals occupy the right column (fixed domain +
query/sync). **ECHO spans the entire left column** — it is the only system that is both a horizontal schema
language *and* a horizontal query/sync runtime — with the distinguishing trait that its sync is local-first /
CRDT rather than server-authoritative. A polished rendering of this diagram is available as an artifact.
