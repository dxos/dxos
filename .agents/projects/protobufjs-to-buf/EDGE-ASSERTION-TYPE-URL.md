# The assertion `type_url` form, and why EDGE rejected every websocket upgrade

Post-mortem of the one production regression the buf migration (#12990) shipped, kept here because
the shape of the mistake is the shape of the next one.

## Symptom

Every Composer client looped reconnecting to EDGE at ~1.2 s, forever, having never connected once.
The browser `WebSocket` API hides a non-101 upgrade response, so the console showed only an
ascending connection counter, and `app.log` only this:

```
W  edge connection socket error   edge-ws-connection.ts:173  {}
W  server disconnected            edge-ws-connection.ts:166  { code: 1006, reason: "", classified: "abnormal" }
W  Restart failed                 persistent-lifecycle.ts:84  Error: Edge connection closed.
```

`1006` with an empty reason and an `onerror` carrying no `event.error` is what a server-side upgrade
rejection looks like from the client: indistinguishable from a dead network. The actual error was
only ever visible in EDGE's telemetry — 24,149 occurrences in three days, `httpStatus = 500` on
`/ws/did:halo:<identity>/*`:

```
Error: Unexpected schema: type.googleapis.com/dxos.halo.credentials.Auth
  at getSchema → createPlainObjectAssertion → bufToPlainObjectCredential
  → bufToPlainObjectPresentation → tryVerifiablePresentation → dispatch
```

## Cause

`anyPack` writes a spec-form `type_url` — `type.googleapis.com/<name>`. EDGE's credential codec
(`packages/sdk/edge-protocol/src/credential-codec/assertion.ts` in `dxos/edge`) keys its assertion
registry by **bare** `typeName`:

```ts
const SCHEMA_REGISTRY = Object.fromEntries(SUPPORTED_ASSERTION_SCHEMAS.map((s) => [s.typeName, s]));
```

and reads the incoming url verbatim, so the lookup missed and threw.

Before the migration the assertion was inlined under a bare `@type`, which hit that reader's
`['@type']` fallback. The migration switched the client to a packed `Any`, and nothing on either
side of the boundary asserted which url form crosses it.

Three details made this worse than it looked:

- **It was not specific to `Auth`.** `AuthSchema` is registered (line 71) — the registry was never
  missing the type, so "register the schema" would have been a no-op. All twelve assertion types
  were affected; `Auth` merely rode on every upgrade. EDGE's `typeUrl === XSchema.typeName`
  comparisons for `Epoch`, `DeviceProfile` and `SpaceMember` were silently false too.
- **It was one-directional, which is why nothing caught it.** buf's `typeUrlToName` does
  `slash >= 0 ? substring : url`, so `anyUnpack`/`anyIs` normalize either form and EDGE → client
  always worked. EDGE also emits bare urls itself (`packed.typeUrl.split('/')[1]`), so bare was
  already the de facto contract; the migration made dxos the only party emitting the other form.
- **The client turned a permanent failure into load.** `classifyCloseCode` maps `1006` to
  `abnormal`, which retries at a fixed ~1.2 s with no backoff. A rejected upgrade is not a transient
  network fault, and one stale dev client generated ~24k worker invocations in three days.

## Fix

Emit the form EDGE resolves, so no deploy is needed to unbreak deployed clients:
`anyPackBare` in `@dxos/protocols/buf` packs and then strips the prefix, exactly as EDGE does on its
own write path. Applied at both assertion emitters — `packAssertion` in `credential-factory.ts` (the
choke point for every `createCredential`) and the `ServiceAccess` literal in
`halo-adapter-client/src/identity.ts`. `typeNameOf` moved to the same module so the convention is
stated once, and `signing-shape.ts` uses it rather than a private copy.

## Signatures and ids are unaffected

Both are digests of the same value:

```ts
const signedPayload = getCredentialProofPayload(credential);
credential.proof.value = await signer.sign(signingKey ?? issuer, signedPayload);
credential.id = fromPublicKey(PublicKey.from(await subtleCrypto.digest('SHA-256', signedPayload)));
```

and that payload is blind to the url form twice over: `toSigningShape` normalizes it through
`typeNameOf`, and `canonicalStringify`'s replacer then drops `@type` outright. So the change cannot
invalidate an issued credential, and ids stay stable — only the `Any.type_url` string itself moves,
and nothing derives identity from it. `golden-credential.test.ts` pins this by re-prefixing a signed
credential and asserting the payload is byte-identical and still verifies.

## Still open

- **EDGE should normalize on read** — `typeNameOf` in its `getAssertionType`. Until it does, EDGE
  rejects the spec form, so any other client, or a partial rollback, breaks the same way. One line,
  needs an EDGE deploy.
- **Backoff for a rejected upgrade** — a distinct `ReconnectReason` and exponential backoff, so a
  permanent server-side rejection cannot bill 24k invocations again.
- **A cross-repo contract test.** Nothing exercises dxos-client ↔ EDGE credential verification, which
  is the only reason this reached production. The migration's own risk note called out the wire
  format twice and it shipped anyway; a test is what that note should have been.
