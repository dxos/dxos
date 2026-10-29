---
'@dxos/app-toolkit': minor
---

Role tokens now live in the headless `@dxos/app-toolkit/AppRole` module (still re-exported as `AppSurface.*`), and `AppCapability.surface({ roles })` takes role tokens instead of NSID strings. Breaking: pass `[AppRole.Article]` rather than `['org.dxos.role.article']`.
