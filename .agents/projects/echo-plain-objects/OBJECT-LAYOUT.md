# ECHO object layout — the V8 objects behind one reactive object

Every node below is one JavaScript object in the heap. Solid arrows are **own property references**
(labelled with the key); dashed arrows are **`[[Prototype]]` links**. State after Stage E
(`cf4c23bf`), where every target carries its own data and one shared four-trap handler serves every
proxy.

**There are two handler classes, not three.** `TypedReactiveHandler` backs in-memory objects and
`EchoReactiveHandler` backs database-backed ones. A _feed_ object is not a third variant: it is an
ordinary typed object with a `FeedObjectCore` sidecar syncing it (see diagram 4).

---

## 1. The skeleton every variant shares

```mermaid
graph TD
  P["<b>Proxy</b> exotic object<br/><i>what the consumer holds</i>"]
  H["<b>REACTIVE_PROXY_HANDLER</b><br/><i>one module singleton for every proxy</i><br/>4 traps: set · defineProperty · deleteProperty · getPrototypeOf<br/>only the 3 write traps dispatch"]
  T["<b>target</b><br/><i>carries the object's data as own properties</i>"]
  HANDLER["<b>handler instance</b><br/>TypedReactiveHandler.instance<br/>or EchoReactiveHandler.instance"]

  P ==>|"[[ProxyTarget]]"| T
  P ==>|"[[ProxyHandler]]"| H
  T -->|"Symbol.for @dxos/echo/Proxy"| P
  T -->|"Symbol.for @dxos/echo/ProxyTarget"| T
  T -->|"Symbol.for @dxos/echo/ReactiveHandler"| HANDLER
  H -.->|"read only on a write"| T
```

A read touches **none** of this. There is no `get`, `has`, `ownKeys` or `getOwnPropertyDescriptor`
trap, so `obj.title`, `'title' in obj`, `Object.keys(obj)`, a spread and a descriptor lookup are all
answered by the engine off the target with no JavaScript call. `getPrototypeOf` is trapped but does
not dispatch. The dashed edge is the only dispatch left, and it is reached only by a mutation.

### Symbols carried on a target

| Symbol                       | Set by                                        | Purpose                                               |
| ---------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| `@dxos/echo/Proxy`           | `createProxy`                                 | identity — `v[sym] === v` iff `v` is a proxy          |
| `@dxos/echo/ProxyTarget`     | `createProxy`                                 | `getProxyTarget(proxy)` (the proxy forwards the read) |
| `@dxos/echo/ReactiveHandler` | `createProxy`, rewritten by `setProxyHandler` | trap dispatch                                         |
| `inspectCustom`              | handler `init`                                | node `util.inspect`                                   |

All are `Symbol.for(...)` registry keys, so a proxy built by one evaluated copy of the module is
fully usable by another.

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
  HANDLER["<b>TypedReactiveHandler.instance</b><br/>_proxyMap: WeakMap&lt;target, proxy&gt;"]
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
  HANDLER["<b>EchoReactiveHandler.instance</b><br/>_proxyMap: WeakMap&lt;target, proxy&gt;<br/>_rawRecords: WeakMap&lt;target, {docHandle, raw}&gt;"]
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
  subgraph write["obj.title = x — the only dispatching path (1 of 4 traps)"]
    W1["proxy [[Set]]"] --> W2["REACTIVE_PROXY_HANDLER.set"] --> W3["read @ReactiveHandler<br/>off the target"] --> W4["handler.set"] --> W5{"isInChangeContext?"}
    W5 -->|"no"| W6["throw<br/>MutationOutsideChangeContextError"]
    W5 -->|"yes"| W7["write the document /<br/>own property, then refresh"]
  end
```

The read path is dispatch-free and trap-free. The write path is where the remaining multiple dispatch
lives — and outside `Obj.update` it always ends in the same throw regardless of variant, which is the
argument for rejecting there too, with no handler lookup at all:

```js
const READONLY_PROXY_HANDLER = {
  set: (target, prop) => {
    throw createPropertySetError(prop);
  },
  defineProperty: (target, prop) => {
    throw createPropertySetError(prop);
  },
  deleteProperty: (target, prop) => {
    throw createPropertyDeleteError(prop);
  },
  getPrototypeOf: (target) => (Array.isArray(target) ? Reflect.getPrototypeOf(target) : Object.prototype),
};
```

The key-set traps are already gone (`cf4c23bf`) — they differed from the raw target in four ways, three
of which were bugs. What remains before the write traps can reject without dispatching: a single
change-context predicate (`change-context.ts` keeps one module-global `currentChangeContext`, so
"is any context open" is an O(1) variant-free check), an exemption for the symbol writes that are
legitimate outside `Obj.update` (`Obj.setParent` stamps `[ParentId]` after every update), and
unifying the two packages' differing error messages.
