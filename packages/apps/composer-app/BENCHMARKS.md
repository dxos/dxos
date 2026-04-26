# Composer-app startup benchmarks

Auto-recorded by `src/playwright/startup.spec.ts`. One row per scenario per harness run.
`profilerTotal` = `composer.profiler` (`main:start` → `Startup` activated).
`navToReady` = wall-clock from `page.goto` until the user-account testid is visible.
`fcp` = first contentful paint (the boot loader). `bytes` = sum of response bodies.
`top1` = slowest single module activation in this run.

| timestamp (UTC) | git | dirty | scenario | browser | profilerTotal | navToReady | fcp | bytes (MB) | modules | top1 |
| --- | --- | :---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 2026-04-26T02:00Z | f1cda8f | ⚠ | cold | chromium | 11118 | 18054 | 264 | 43.4 | 263 | `org.dxos.plugin.welcome.module.onboarding` (5948) |
| 2026-04-26T02:00Z | f1cda8f | ⚠ | warm | chromium | 3166 | 7677 | 172 | 43.1 | 257 | `org.dxos.plugin.observability.module.ClientReady` (1091) |
| 2026-04-26T02:24:54Z | f1cda8f2f8 | ⚠ | cold | chromium | 8554 | 13485 | 144 | 41.4 | 263 | `org.dxos.plugin.welcome.module.onboarding` (4917) |
| 2026-04-26T02:25:14Z | f1cda8f2f8 | ⚠ | warm | chromium | 3210 | 7405 | 136 | 40.9 | 257 | `org.dxos.plugin.observability.module.ClientReady` (1068) |
