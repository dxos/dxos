# ECHO object layout — the V8 objects behind one reactive object

Every node below is one JavaScript object in the heap. Solid arrows are **own property references**
(labelled with the key); dashed arrows are **`[[Prototype]]` links**. State as merged (`0cde959956`),
where every target carries its own data, one shared five-trap handler serves every read-only proxy,
and a second handler backs the mutable view an `Obj.update` callback is handed.

**There are two handler classes, not three.** `TypedReactiveHandler` backs in-memory objects and
`EchoReactiveHandler` backs database-backed ones. A _feed_ object is not a third variant: it is an
ordinary typed object with a `FeedObjectCore` sidecar syncing it (see diagram 4).

---

## 1. The skeleton every variant shares

```mermaid
graph TD
  P["<b>Proxy</b> exotic object<br/><i>what the consumer holds — read-only</i>"]
  H["<b>REACTIVE_PROXY_HANDLER</b><br/><i>one module singleton for every proxy</i><br/>5 traps: set · defineProperty · deleteProperty · ownKeys · getPrototypeOf<br/>none of them dispatch for user data"]
  T["<b>target</b><br/><i>carries the object's data as own properties</i>"]
  MV["<b>mutable view</b> Proxy<br/><i>what an Obj.update callback is handed</i>"]
  MH["<b>MUTABLE_PROXY_HANDLER</b><br/>get twins nested proxies · writes dispatch"]
  HANDLER["<b>handler instance</b><br/>TypedReactiveHandler.instance<br/>or EchoReactiveHandler.instance"]

  P ==>|"[[ProxyTarget]]"| T
  P ==>|"[[ProxyHandler]]"| H
  MV ==>|"[[ProxyTarget]]"| T
  MV ==>|"[[ProxyHandler]]"| MH
  T -->|"Symbol.for @dxos/echo/Proxy"| P
  T -->|"Symbol.for @dxos/echo/ProxyTarget"| T
  T -->|"Symbol.for @dxos/echo/MutableProxy"| MV
  T -->|"Symbol.for @dxos/echo/ReactiveHandler"| HANDLER
  MH -.->|"read on a write"| T
  MH -.->|"the only dispatch"| HANDLER
```

A read touches **none** of the read-only path. There is no `get`, `has` or
`getOwnPropertyDescriptor` trap, so `obj.title`, `'title' in obj`, a spread and a descriptor lookup
are all answered by the engine off the target with no JavaScript call. Two traps exist but never
dispatch: `getPrototypeOf` is one `Array.isArray`, and `ownKeys` is one `Reflect.ownKeys` plus a
filter that hides configurable symbols (a generic walker that read `[symbolReactiveHandler]` or
`[symbolInternals]` and recursed would reach `Function.prototype.caller` and throw — this is what
`Object.keys`, spread and structural hashing go through; `Reflect.ownKeys` on the **raw** target
still shows everything).

Writability belongs to the **reference**, not to a dynamic extent. The read-only proxy's write traps
throw before consulting any handler (`assertReadOnly`, O(1), fail-closed), so the proxy named outside
`Obj.update` stays read-only for the callback's whole duration. All variant dispatch is now reached
only through the mutable view.

### Symbols carried on a target

| Symbol                       | Set by                                        | Purpose                                                                  |
| ---------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| `@dxos/echo/Proxy`           | `createProxy`                                 | identity — `v[sym] === v` iff `v` is a proxy; also the target→proxy memo |
| `@dxos/echo/ProxyTarget`     | `createProxy`                                 | `getProxyTarget(proxy)` (the proxy forwards the read)                    |
| `@dxos/echo/ReactiveHandler` | `createProxy`, rewritten by `setProxyHandler` | trap dispatch                                                            |
| `@dxos/echo/MutableProxy`    | `getMutableProxy` (lazily, on first update)   | the target's mutable view; `canonicalOf` keeps one out of the graph      |
| `inspectCustom`              | handler `init`                                | node `util.inspect`                                                      |

All are `Symbol.for(...)` registry keys, so a proxy built by one evaluated copy of the module is
fully usable by another.

`[ChangeKeyId]` (`@dxos/live-object/ChangeKey`) is not stamped on the target — it is an **accessor on
the behaviour prototype**, resolving to the root target (typed) or the `ObjectCore` (echo). It is the
one key the array and text gates read, which is why `assertMutable` needs no variant dispatch.

---

## 2. Typed (in-memory) object — `Obj.make(Person, {...})`

```mermaid
graph TD
  P["<b>Proxy</b>"]
  H["REACTIVE_PROXY_HANDLER"]
  T["<b>target</b> — the user's own object<br/>own data: name, age<br/>own: nested → sub-proxy, items → array proxy"]
  IS["<b>instanceState</b> = Object.create(TypedObjectPrototype)<br/>[EventId] (root only) · [ObjectDeletedId]<br/>[SchemaId] · [TypeId] · [TypeEntityId] · [StaticTypeSchemaSlot]"]
  TP["<b>TypedObjectPrototype</b> <i>(one per process)</i><br/>[symbolReactivePrototype] · [objectData] · [ChangeId]"]
  OP["Object.prototype"]
  HANDLER["<b>TypedReactiveHandler.instance</b><br/><i>stateless — the memo lives on the target</i>"]
  EV["Event"]
  NP["<b>Proxy</b> (nested record)"]
  NT["<b>target</b> (nested record)<br/>own data"]
  AP["<b>Proxy</b> (array)"]
  AT["<b>ReactiveArray</b> target<br/>own: 0,1,2 … length"]

  P ==>|"[[ProxyTarget]]"| T
  P ==>|"[[ProxyHandler]]"| H
  T -.->|"[[Prototype]]"| IS
  IS -.->|"[[Prototype]]"| TP
  TP -.->|"[[Prototype]]"| OP
  T -->|"@ReactiveHandler"| HANDLER
  IS -->|"[EventId]"| EV
  T -->|"nested"| NP
  NP ==>|"[[ProxyTarget]]"| NT
  T -->|"items"| AP
  AP ==>|"[[ProxyTarget]]"| AT
```

User data lives directly on the target as ordinary own properties. Nested records and arrays are
stored **already wrapped** — `init` wraps what is there and `_prepareValueForAssignment` wraps what
is assigned later — which is what lets reads be forwarded.

---

## 3. Database-backed object — `db.add(Obj.make(...))`

```mermaid
graph TD
  P["<b>Proxy</b>"]
  H["REACTIVE_PROXY_HANDLER"]
  T["<b>target</b> = {} filled by the refresh<br/>own data mirrors the document:<br/>title (decoded) · assignee (Ref) · nested → sub-proxy<br/><b>id</b> (own, from the core — not the document)"]
  IS["<b>instanceState</b> = Object.create(EchoRootPrototype)<br/>[symbolInternals] · [symbolNamespace]='data'<br/>[symbolPath]=[] · [EventId]"]
  ER["<b>EchoRoot.prototype</b><br/>id · [SchemaId] · [TypeId] · [MetaId] · [ParentId] · toJSON"]
  ERC["<b>EchoRecord.prototype</b> <i>(base)</i>"]
  OP["Object.prototype"]
  HANDLER["<b>EchoReactiveHandler.instance</b><br/>_rawRecords: WeakMap&lt;target, {docHandle, raw}&gt;"]
  CORE["<b>ObjectCore</b><br/>id · docHandle · targetsMap · linkCache<br/>refreshTargets · updates: Event"]
  DH["<b>DocHandleProxy</b>"]
  DOC["<b>automerge doc</b> (frozen)<br/>objects/&lt;id&gt;/data · /meta"]
  REF["<b>RefImpl</b><br/>#uri · #resolver → CoreRefResolver"]
  NT["<b>target</b> (nested record)<br/>[symbolPath]=['nested']"]
  NP["<b>Proxy</b> (nested)"]
  AT["<b>EchoArray</b> target<br/>own: 0,1,2 … length"]
  AP["<b>Proxy</b> (array)"]
  MT["<b>target</b> (meta root)<br/>[symbolNamespace]='meta'"]

  P ==>|"[[ProxyTarget]]"| T
  P ==>|"[[ProxyHandler]]"| H
  T -.->|"[[Prototype]]"| IS
  IS -.->|"[[Prototype]]"| ER
  ER -.->|"[[Prototype]]"| ERC
  ERC -.->|"[[Prototype]]"| OP
  T -->|"@ReactiveHandler"| HANDLER
  IS -->|"[symbolInternals]"| CORE
  CORE -->|"docHandle"| DH
  DH -->|"doc()"| DOC
  T -->|"assignee"| REF
  REF -->|"#resolver"| CORE
  T -->|"nested"| NP
  NP ==>|"[[ProxyTarget]]"| NT
  T -->|"items"| AP
  AP ==>|"[[ProxyTarget]]"| AT
  CORE -->|"targetsMap['data:nested']"| NT
  CORE -->|"targetsMap['data:items']"| AT
  CORE -->|"targetsMap['meta:']"| MT
  HANDLER -.->|"_rawRecords[target].raw"| DOC
```

The document is the source of truth; the target is a **materialized mirror** of it, refreshed on
every change. `_rawRecords` holds the raw record the target was last filled from — automerge shares
untouched subtrees structurally, so an unchanged record is the identical object and the refresh is a
pointer compare.

`targetsMap` is the core's index of every target it has handed out, which is what the refresh walks.

---

## 4. Feed-backed object — a typed object with a sidecar

```mermaid
graph TD
  subgraph identical["identical to diagram 2 — no third handler exists"]
    P["<b>Proxy</b>"]
    T["<b>target</b> (user's object)"]
    HANDLER["TypedReactiveHandler.instance"]
  end
  FC["<b>FeedObjectCore</b> <i>(sidecar)</i><br/>#state: digest · #version · #dirty<br/>#pendingAppend"]
  FH["<b>FeedHandle</b><br/>flush loop, reconciliation"]
  REG["FeedCoreRegistry<br/>WeakMap&lt;Entity, FeedObjectCore&gt;"]

  P ==>|"[[ProxyTarget]]"| T
  T -->|"@ReactiveHandler"| HANDLER
  FC -->|"entity"| P
  FC -.->|"Entity.subscribe → marks dirty"| P
  FH -->|"owns"| FC
  REG -->|"id → core"| FC
```

`FeedObjectCore` never participates in the proxy at all: it subscribes to the object, digests
`Entity.toJSON(entity)`, and appends blocks. So the benchmark's "feed" rows measure the **typed**
read path plus feed sync — not a distinct object layout.

---

## 5. What a read and a write actually traverse

```mermaid
graph LR
  subgraph read["obj.title — no JavaScript runs"]
    R1["proxy [[Get]]"] --> R2["no get trap<br/>→ engine reads the target"] --> R3["own property<br/>~2-20 ns"]
  end
  subgraph reject["obj.title = x outside Obj.update — no dispatch at all"]
    X1["proxy [[Set]]"] --> X2["REACTIVE_PROXY_HANDLER.set"] --> X3{"typeof property"}
    X3 -->|"string"| X4["throw<br/>createPropertySetError"]
    X3 -->|"symbol"| X5["allowed — system bookkeeping<br/>([ParentId], [SelfURIId], schema slot)"]
  end
  subgraph write["Obj.update(obj, (obj) => obj.title = x) — the only dispatching path"]
    W1["mutable view [[Set]]"] --> W2["MUTABLE_PROXY_HANDLER.set"] --> W3["normalizeForStorage<br/><i>no view may enter the graph</i>"] --> W4["read @ReactiveHandler<br/>off the target"] --> W5["handler.set"] --> W6["write the document /<br/>own property, then refresh"]
  end
```

The read path is dispatch-free and trap-free. Rejection is now constant-cost and **fail-closed**:
there is no state to be wrong about, which is what a context lookup could not promise. Symbols are
exempt because they are never user data — the system stamps `[ParentId]` and friends on objects
consumers hold read-only, outside any update.

Dispatch survives in exactly one place, the mutable view, and the change context still exists — but
only to batch notifications and to gate the mutations a proxy cannot intercept (`Array` methods, text
CRDT ops), which call `assertMutable(target, name, …)` directly against `[ChangeKeyId]`.

Two invariants hold the design together:

- **A mutable view must never enter the graph.** Storing one would hand a permanent write capability
  to every later reader and break identity for anyone holding the read-only reference. `canonicalOf`
  maps a view back to its read-only twin; `normalizeForStorage` applies it through the literal being
  assigned (`obj.rows = [obj.rec]`), descending only into plain containers and writing back only
  where normalization changed something — an unconditional write throws on a frozen constant.
  `Array.prototype.sort`/`reverse` return `canonicalOf(this)` for the same reason.
- **`isProxy` still answers true for a view**, with no knowledge of views: the `get` trap twins every
  proxy-valued read, so `view[symbolProxy] === view` holds. `[symbolTarget]` is not a proxy, so it
  answers the raw target and `getRawTarget` unwraps a view correctly.

Enforcement is fail-closed rather than advisory, which is what surfaced five latent defects during
the change (nested arrays ungated, `toJsonSchema` mutating live schema, a view leaking through a
literal, three sites mutating references captured outside their callback). The
`consistent-update-param` lint rule catches the last of those **only when the callback body is
written at the `Obj.update` call site** — two of the three were structurally invisible to it.
