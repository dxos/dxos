---
'@dxos/permission': minor
---

Add the `@dxos/permission` package: the permission DSL and its pure evaluator, with the design document. `Principal` (HALO DID, space or process URI), `Subject` (echo URI or `*`), `Command` (`/`-separated path; a prefix covers its descendants), `Policy` (UCAN predicates as JSON arrays with builders, `evaluate`, `describe`), `Permission` and `Permission.define`, `Requirement` with argument selectors, `Grant` (content-addressed id over canonical JSON, `attenuate`), `Revocation`, `Consent`, and `Check` (`check`, `GrantSource`, `fromGrants`, `merge`). Scenario tests show when a check passes or fails.
