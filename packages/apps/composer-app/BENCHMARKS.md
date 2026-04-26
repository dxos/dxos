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
| 2026-04-26T03:38:12Z | 6efdeb84e2 | ⚠ | cold | chromium | 6316 | 10289 | 188 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1815) |
| 2026-04-26T03:38:28Z | 6efdeb84e2 | ⚠ | warm | chromium | 3499 | 6561 | 112 | 41.2 | 257 | `org.dxos.plugin.observability.module.ClientReady` (850) |
| 2026-04-26T03:45:48Z | 562d20e31c | ⚠ | cold | chromium | 5366 | 8578 | 160 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1763) |
| 2026-04-26T03:52:51Z | 562d20e31c | ⚠ | cold | chromium | 5633 | 8940 | 160 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1762) |
| 2026-04-26T03:53:06Z | 562d20e31c | ⚠ | warm | chromium | 3526 | 6563 | 120 | 41.4 | 257 | `org.dxos.plugin.observability.module.ClientReady` (893) |
| 2026-04-26T03:57:19Z | 6a3f5f5ac1 | ⚠ | cold | chromium | 5556 | 8700 | 148 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1748) |
| 2026-04-26T04:04:18Z | 6a3f5f5ac1 | ⚠ | cold | chromium | 5428 | 8660 | 164 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1731) |
| 2026-04-26T04:10:33Z | 6a3f5f5ac1 | ⚠ | cold | chromium | 5559 | 8751 | 160 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1712) |
| 2026-04-26T04:10:48Z | 6a3f5f5ac1 | ⚠ | warm | chromium | 3501 | 6441 | 128 | 41.2 | 257 | `org.dxos.plugin.observability.module.ClientReady` (859) |
| 2026-04-26T04:11:07Z | 6a3f5f5ac1 | ⚠ | warm-cold | chromium | 5704 | 8789 | 132 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1700) |
| 2026-04-26T04:15:51Z | 6a3f5f5ac1 | ⚠ | cold | chromium | 5577 | 8743 | 160 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1744) |
| 2026-04-26T04:18:20Z | 6a3f5f5ac1 | ⚠ | cold | chromium | 5618 | 8832 | 180 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1753) |
| 2026-04-26T04:18:35Z | 6a3f5f5ac1 | ⚠ | warm | chromium | 3677 | 6732 | 108 | 41.4 | 257 | `org.dxos.plugin.observability.module.ClientReady` (934) |
| 2026-04-26T04:18:54Z | 6a3f5f5ac1 | ⚠ | warm-cold | chromium | 5134 | 8246 | 108 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1639) |
| 2026-04-26T04:24:26Z | 6a3f5f5ac1 | ⚠ | cold | chromium | 5475 | 8911 | 148 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1725) |
| 2026-04-26T04:25:17Z | 6a3f5f5ac1 | ⚠ | cold | chromium | 5632 | 8490 | 140 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1769) |
| 2026-04-26T04:25:32Z | 6a3f5f5ac1 | ⚠ | warm | chromium | 3645 | 6685 | 152 | 41.2 | 257 | `org.dxos.plugin.observability.module.ClientReady` (942) |
| 2026-04-26T04:25:50Z | 6a3f5f5ac1 | ⚠ | warm-cold | chromium | 5090 | 8214 | 108 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1643) |
| 2026-04-26T04:32:21Z | 6a3f5f5ac1 | ⚠ | cold | chromium | 5538 | 8762 | 156 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1730) |
| 2026-04-26T04:33:12Z | 6a3f5f5ac1 | ⚠ | cold | chromium | 5634 | 9098 | 148 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1735) |
| 2026-04-26T04:34:03Z | 6a3f5f5ac1 | ⚠ | cold | chromium | 5551 | 8695 | 124 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1738) |
| 2026-04-26T04:44:29Z | ca88ace276 | ⚠ | cold | chromium | 5366 | 8703 | 160 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1687) |
| 2026-04-26T04:45:20Z | ca88ace276 | ⚠ | cold | chromium | 5548 | 8697 | 132 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1718) |
| 2026-04-26T04:45:35Z | ca88ace276 | ⚠ | warm | chromium | 3649 | 6673 | 116 | 41.0 | 257 | `org.dxos.plugin.observability.module.ClientReady` (933) |
| 2026-04-26T04:45:54Z | ca88ace276 | ⚠ | warm-cold | chromium | 5079 | 8229 | 128 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1656) |
| 2026-04-26T04:51:04Z | 0b39281ade | ⚠ | cold | chromium | 5425 | 8806 | 148 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1725) |
| 2026-04-26T04:51:19Z | 0b39281ade | ⚠ | warm | chromium | 3497 | 6623 | 128 | 41.2 | 257 | `org.dxos.plugin.observability.module.ClientReady` (832) |
| 2026-04-26T04:51:37Z | 0b39281ade | ⚠ | warm-cold | chromium | 5118 | 8272 | 124 | 41.4 | 257 | `org.dxos.plugin.client.module.Client` (1625) |
