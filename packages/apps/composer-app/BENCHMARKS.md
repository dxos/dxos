# Composer-app startup benchmarks

Auto-recorded by `src/playwright/startup.spec.ts`. One row per scenario per harness run.
`profilerTotal` = `composer.profiler` (`main:start` → `Startup` activated).
`navToReady` = wall-clock from `page.goto` until the user-account testid is visible.
`fcp` = first contentful paint (the boot loader). `bytes` = sum of response bodies.
`top1` = slowest single module activation in this run.

| timestamp (UTC)      | git        | dirty | scenario  | browser  | profilerTotal | navToReady |  fcp | bytes (MB) | modules | top1                                                                 |
| -------------------- | ---------- | :---: | --------- | -------- | ------------: | ---------: | ---: | ---------: | ------: | -------------------------------------------------------------------- |
| 2026-04-26T02:00Z    | f1cda8f    |   ⚠   | cold      | chromium |         11118 |      18054 |  264 |       43.4 |     263 | `org.dxos.plugin.welcome.module.onboarding` (5948)                   |
| 2026-04-26T02:00Z    | f1cda8f    |   ⚠   | warm      | chromium |          3166 |       7677 |  172 |       43.1 |     257 | `org.dxos.plugin.observability.module.ClientReady` (1091)            |
| 2026-04-26T02:24:54Z | f1cda8f2f8 |   ⚠   | cold      | chromium |          8554 |      13485 |  144 |       41.4 |     263 | `org.dxos.plugin.welcome.module.onboarding` (4917)                   |
| 2026-04-26T02:25:14Z | f1cda8f2f8 |   ⚠   | warm      | chromium |          3210 |       7405 |  136 |       40.9 |     257 | `org.dxos.plugin.observability.module.ClientReady` (1068)            |
| 2026-04-26T02:35:35Z | e7f390ae3e |   ⚠   | cold      | chromium |          4704 |       9596 |  132 |       41.4 |     263 | `org.dxos.plugin.client.module.Client` (1783)                        |
| 2026-04-26T02:35:51Z | e7f390ae3e |   ⚠   | warm      | chromium |          3163 |       7364 |  132 |       40.9 |     257 | `org.dxos.plugin.observability.module.ClientReady` (1066)            |
| 2026-04-26T03:01:50Z | 67ec272506 |   ⚠   | cold      | chromium |          4862 |       9810 |  152 |       41.4 |     263 | `org.dxos.plugin.client.module.Client` (1885)                        |
| 2026-04-26T03:02:06Z | 67ec272506 |   ⚠   | warm      | chromium |          3211 |       7614 |  136 |       41.3 |     257 | `org.dxos.plugin.observability.module.ClientReady` (1073)            |
| 2026-04-26T03:15:22Z | 118261e7e1 |   ⚠   | cold      | chromium |          5664 |       9780 |  156 |       41.7 |     263 | `org.dxos.plugin.client.module.Client` (1832)                        |
| 2026-04-26T03:15:39Z | 118261e7e1 |   ⚠   | warm      | chromium |          3568 |       7481 |  124 |       41.3 |     257 | `org.dxos.plugin.observability.module.ClientReady` (868)             |
| 2026-04-26T03:29:27Z | 697d645631 |   ⚠   | cold      | chromium |          5480 |       9532 |  156 |       41.7 |     263 | `org.dxos.plugin.client.module.Client` (1715)                        |
| 2026-04-26T03:29:43Z | 697d645631 |   ⚠   | warm      | chromium |          3555 |       7341 |  116 |       41.7 |     257 | `org.dxos.plugin.observability.module.ClientReady` (878)             |
| 2026-04-26T03:38:12Z | 6efdeb84e2 |   ⚠   | cold      | chromium |          6316 |      10289 |  188 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1815)                        |
| 2026-04-26T03:38:28Z | 6efdeb84e2 |   ⚠   | warm      | chromium |          3499 |       6561 |  112 |       41.2 |     257 | `org.dxos.plugin.observability.module.ClientReady` (850)             |
| 2026-04-26T03:45:48Z | 562d20e31c |   ⚠   | cold      | chromium |          5366 |       8578 |  160 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1763)                        |
| 2026-04-26T03:52:51Z | 562d20e31c |   ⚠   | cold      | chromium |          5633 |       8940 |  160 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1762)                        |
| 2026-04-26T03:53:06Z | 562d20e31c |   ⚠   | warm      | chromium |          3526 |       6563 |  120 |       41.4 |     257 | `org.dxos.plugin.observability.module.ClientReady` (893)             |
| 2026-04-26T03:57:19Z | 6a3f5f5ac1 |   ⚠   | cold      | chromium |          5556 |       8700 |  148 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1748)                        |
| 2026-04-26T04:04:18Z | 6a3f5f5ac1 |   ⚠   | cold      | chromium |          5428 |       8660 |  164 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1731)                        |
| 2026-04-26T04:10:33Z | 6a3f5f5ac1 |   ⚠   | cold      | chromium |          5559 |       8751 |  160 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1712)                        |
| 2026-04-26T04:10:48Z | 6a3f5f5ac1 |   ⚠   | warm      | chromium |          3501 |       6441 |  128 |       41.2 |     257 | `org.dxos.plugin.observability.module.ClientReady` (859)             |
| 2026-04-26T04:11:07Z | 6a3f5f5ac1 |   ⚠   | warm-cold | chromium |          5704 |       8789 |  132 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1700)                        |
| 2026-04-26T04:15:51Z | 6a3f5f5ac1 |   ⚠   | cold      | chromium |          5577 |       8743 |  160 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1744)                        |
| 2026-04-26T04:18:20Z | 6a3f5f5ac1 |   ⚠   | cold      | chromium |          5618 |       8832 |  180 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1753)                        |
| 2026-04-26T04:18:35Z | 6a3f5f5ac1 |   ⚠   | warm      | chromium |          3677 |       6732 |  108 |       41.4 |     257 | `org.dxos.plugin.observability.module.ClientReady` (934)             |
| 2026-04-26T04:18:54Z | 6a3f5f5ac1 |   ⚠   | warm-cold | chromium |          5134 |       8246 |  108 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1639)                        |
| 2026-04-26T04:24:26Z | 6a3f5f5ac1 |   ⚠   | cold      | chromium |          5475 |       8911 |  148 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1725)                        |
| 2026-04-26T04:25:17Z | 6a3f5f5ac1 |   ⚠   | cold      | chromium |          5632 |       8490 |  140 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1769)                        |
| 2026-04-26T04:25:32Z | 6a3f5f5ac1 |   ⚠   | warm      | chromium |          3645 |       6685 |  152 |       41.2 |     257 | `org.dxos.plugin.observability.module.ClientReady` (942)             |
| 2026-04-26T04:25:50Z | 6a3f5f5ac1 |   ⚠   | warm-cold | chromium |          5090 |       8214 |  108 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1643)                        |
| 2026-04-26T04:32:21Z | 6a3f5f5ac1 |   ⚠   | cold      | chromium |          5538 |       8762 |  156 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1730)                        |
| 2026-04-26T04:33:12Z | 6a3f5f5ac1 |   ⚠   | cold      | chromium |          5634 |       9098 |  148 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1735)                        |
| 2026-04-26T04:34:03Z | 6a3f5f5ac1 |   ⚠   | cold      | chromium |          5551 |       8695 |  124 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1738)                        |
| 2026-04-26T04:44:29Z | ca88ace276 |   ⚠   | cold      | chromium |          5366 |       8703 |  160 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1687)                        |
| 2026-04-26T04:45:20Z | ca88ace276 |   ⚠   | cold      | chromium |          5548 |       8697 |  132 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1718)                        |
| 2026-04-26T04:45:35Z | ca88ace276 |   ⚠   | warm      | chromium |          3649 |       6673 |  116 |       41.0 |     257 | `org.dxos.plugin.observability.module.ClientReady` (933)             |
| 2026-04-26T04:45:54Z | ca88ace276 |   ⚠   | warm-cold | chromium |          5079 |       8229 |  128 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1656)                        |
| 2026-04-26T04:51:04Z | 0b39281ade |   ⚠   | cold      | chromium |          5425 |       8806 |  148 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1725)                        |
| 2026-04-26T04:51:19Z | 0b39281ade |   ⚠   | warm      | chromium |          3497 |       6623 |  128 |       41.2 |     257 | `org.dxos.plugin.observability.module.ClientReady` (832)             |
| 2026-04-26T04:51:37Z | 0b39281ade |   ⚠   | warm-cold | chromium |          5118 |       8272 |  124 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1625)                        |
| 2026-04-26T04:59:56Z | daf09cd61a |   ⚠   | cold      | chromium |          5474 |       8803 |  140 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1711)                        |
| 2026-04-26T05:00:11Z | daf09cd61a |   ⚠   | warm      | chromium |          3484 |       6466 |  108 |       41.2 |     257 | `org.dxos.plugin.observability.module.ClientReady` (863)             |
| 2026-04-26T05:00:29Z | daf09cd61a |   ⚠   | warm-cold | chromium |          5084 |       8173 |  128 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1667)                        |
| 2026-04-26T05:04:57Z | daf09cd61a |   ⚠   | cold      | chromium |          5427 |       8544 |  160 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1711)                        |
| 2026-04-26T05:05:12Z | daf09cd61a |   ⚠   | warm      | chromium |          3444 |       6474 |  120 |       41.4 |     257 | `org.dxos.plugin.observability.module.ClientReady` (858)             |
| 2026-04-26T05:05:31Z | daf09cd61a |   ⚠   | warm-cold | chromium |          5844 |       8878 |  120 |       41.4 |     257 | `org.dxos.plugin.client.module.Client` (1696)                        |
| 2026-04-26T07:07:29Z | 3bac00e81b |   ⚠   | dev-cold  | chromium |          6269 |      17586 |  220 |      123.1 |     258 | `org.dxos.plugin.client.module.Client` (1402)                        |
| 2026-04-26T07:12:10Z | 8df7ba14ea |   ⚠   | dev-cold  | chromium |         11007 |      16180 |  624 |      124.9 |     257 | `org.dxos.plugin.client.module.Client` (4562)                        |
| 2026-04-26T08:08:26Z | 7950fc5492 |   ⚠   | cold      | chromium |          7487 |      13564 |  252 |       41.4 |     259 | `org.dxos.plugin.client.module.Client` (1941)                        |
| 2026-04-26T08:08:45Z | 7950fc5492 |   ⚠   | warm      | chromium |          4934 |       9070 |  160 |       44.2 |     259 | `org.dxos.plugin.observability.module.ClientReady` (1287)            |
| 2026-04-26T08:09:08Z | 7950fc5492 |   ⚠   | warm-cold | chromium |          6404 |      10604 |  128 |       45.0 |     259 | `org.dxos.plugin.client.module.Client` (1671)                        |
| 2026-05-08T18:21:51Z | 881aa268ca |   ⚠   | dev-cold  | all      |          3831 |       8451 |  164 |       35.9 |     280 | `org.dxos.plugin.observability.module.ClientReady` (994)             |
| 2026-05-08T18:23:46Z | 881aa268ca |   ⚠   | cold      | all      |          4434 |       8962 |  132 |       35.9 |     280 | `org.dxos.plugin.observability.module.ClientReady` (1131)            |
| 2026-05-08T18:24:06Z | 881aa268ca |   ⚠   | warm-cold | all      |          4497 |       8701 |  132 |       35.9 |     275 | `org.dxos.plugin.client.module.Client` (1328)                        |
| 2026-05-08T18:28:42Z | 881aa268ca |   ⚠   | cold      | all      |          4026 |       8289 | 3161 |       30.5 |     276 | `org.dxos.plugin.observability.module.ClientReady` (968)             |
| 2026-05-12T17:33:04Z | c28db14a48 |       | dev-cold  | chromium |          4454 |       8707 |  168 |       29.8 |     277 | `org.dxos.plugin.observability.module.ClientReady` (994)             |
| 2026-05-12T17:35:11Z | c28db14a48 |   ⚠   | cold      | chromium |          5327 |       9924 |  212 |       29.8 |     277 | `org.dxos.plugin.observability.module.ClientReady` (1059)            |
| 2026-05-12T17:35:36Z | c28db14a48 |   ⚠   | warm-cold | chromium |          7308 |      11760 |  132 |       30.0 |     273 | `org.dxos.plugin.client.module.Client` (1793)                        |
| 2026-05-14T13:50:35Z | 4272c8ebab |       | dev-cold  | chromium |          4906 |       9137 |  144 |       29.8 |     273 | `org.dxos.plugin.observability.module.ClientReady` (1198)            |
| 2026-05-14T13:52:42Z | 4272c8ebab |   ⚠   | cold      | chromium |          4614 |       8822 |  156 |       29.8 |     273 | `org.dxos.plugin.observability.module.ClientReady` (1097)            |
| 2026-05-14T13:53:02Z | 4272c8ebab |   ⚠   | warm-cold | chromium |          4904 |       8997 |   88 |       29.8 |     273 | `org.dxos.plugin.client.module.Client` (1181)                        |
| 2026-06-08T05:35:01Z | f012425493 |   ⚠   | dev-cold  | chromium |          6931 |       9680 |   48 |      118.1 |     362 | `org.dxos.plugin.client.module.Client` (1370)                        |
| 2026-06-08T05:38:50Z | f012425493 |   ⚠   | dev-cold  | chromium |          7348 |      10231 |   28 |      117.1 |     362 | `org.dxos.plugin.client.module.Client` (1496)                        |
| 2026-06-16T21:43:08Z | 391b48086b |   ⚠   | dev-cold  | chromium |          6537 |      11135 |  140 |       34.3 |     400 | `org.dxos.plugin.duffel.module.org.dxos.plugin.duffel/duffel` (1335) |
| 2026-06-16T21:46:51Z | 391b48086b |   ⚠   | cold      | chromium |          6685 |      11436 |  196 |       34.3 |     399 | `org.dxos.plugin.duffel.module.org.dxos.plugin.duffel/duffel` (1349) |
| 2026-06-16T21:47:19Z | 391b48086b |   ⚠   | warm-cold | chromium |          8900 |      13362 |  116 |       34.2 |     396 | `org.dxos.plugin.client.module.Client` (2659)                        |
