---
'@dxos/client': patch
---

Fix every identity recovery path — passkey, recovery code, email token and OAuth proof — failing in
the client before a request reached EDGE.

`HaloProxy.recoverIdentity` forwarded the caller's `RecoverIdentityArgs` union straight to the rpc,
where the payload codec encodes `RecoverIdentityRequest` and throws on a message whose `request`
oneof was never selected. The proxy maps the union onto that oneof again, as it did before the buf
migration; the public API is unchanged.
