# Composer-app startup benchmarks

Auto-recorded by `src/playwright/startup.spec.ts`. One row per scenario per harness run.
`profilerTotal` = `composer.profiler` (`main:start` → `Startup` activated).
`navToReady` = wall-clock from `page.goto` until the user-account testid is visible.
`fcp` = first contentful paint (the boot loader). `bytes` = sum of response bodies.
`top1` = slowest single module activation in this run.

| timestamp (UTC)      | git        | dirty | scenario | browser  | profilerTotal | navToReady | fcp | bytes (MB) | modules | top1                                                      |
| -------------------- | ---------- | :---: | -------- | -------- | ------------: | ---------: | --: | ---------: | ------: | --------------------------------------------------------- |
| 2026-04-26T02:00Z    | f1cda8f    |   ⚠   | cold     | chromium |         11118 |      18054 | 264 |       43.4 |     263 | `org.dxos.plugin.welcome.module.onboarding` (5948)        |
| 2026-04-26T02:00Z    | f1cda8f    |   ⚠   | warm     | chromium |          3166 |       7677 | 172 |       43.1 |     257 | `org.dxos.plugin.observability.module.ClientReady` (1091) |
| 2026-04-26T02:24:54Z | f1cda8f2f8 |   ⚠   | cold     | chromium |          8554 |      13485 | 144 |       41.4 |     263 | `org.dxos.plugin.welcome.module.onboarding` (4917)        |
| 2026-04-26T02:25:14Z | f1cda8f2f8 |   ⚠   | warm     | chromium |          3210 |       7405 | 136 |       40.9 |     257 | `org.dxos.plugin.observability.module.ClientReady` (1068) |
| 2026-04-26T02:35:35Z | e7f390ae3e |   ⚠   | cold     | chromium |          4704 |       9596 | 132 |       41.4 |     263 | `org.dxos.plugin.client.module.Client` (1783)             |
| 2026-04-26T02:35:51Z | e7f390ae3e |   ⚠   | warm     | chromium |          3163 |       7364 | 132 |       40.9 |     257 | `org.dxos.plugin.observability.module.ClientReady` (1066) |
| 2026-04-26T03:01:50Z | 67ec272506 |   ⚠   | cold     | chromium |          4862 |       9810 | 152 |       41.4 |     263 | `org.dxos.plugin.client.module.Client` (1885)             |
| 2026-04-26T03:02:06Z | 67ec272506 |   ⚠   | warm     | chromium |          3211 |       7614 | 136 |       41.3 |     257 | `org.dxos.plugin.observability.module.ClientReady` (1073) |
| 2026-04-26T03:15:22Z | 118261e7e1 | ⚠ | cold | chromium | 5664 | 9780 | 156 | 41.7 | 263 | `org.dxos.plugin.client.module.Client` (1832) |
| 2026-04-26T03:15:39Z | 118261e7e1 | ⚠ | warm | chromium | 3568 | 7481 | 124 | 41.3 | 257 | `org.dxos.plugin.observability.module.ClientReady` (868) |
| 2026-04-26T03:29:27Z | 697d645631 | ⚠ | cold | chromium | 5480 | 9532 | 156 | 41.7 | 263 | `org.dxos.plugin.client.module.Client` (1715) |
| 2026-04-26T03:29:43Z | 697d645631 | ⚠ | warm | chromium | 3555 | 7341 | 116 | 41.7 | 257 | `org.dxos.plugin.observability.module.ClientReady` (878) |
