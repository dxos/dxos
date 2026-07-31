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
| 2026-07-31T02:42:48Z | 5196ca866a |   ⚠   | cold      | chromium |         13000 |      17456 |  368 |       36.3 |     452 | `org.dxos.plugin.client.module.Client` (4552)                        |
| 2026-07-31T02:43:41Z | 5196ca866a |   ⚠   | cold      | chromium |         12483 |      16836 |  312 |       36.3 |     452 | `org.dxos.plugin.client.module.Client` (4232)                        |
| 2026-07-31T02:44:17Z | 5196ca866a |   ⚠   | warm-cold | chromium |         13238 |      17361 |  344 |       36.5 |     451 | `org.dxos.plugin.client.module.Client` (4518)                        |
| 2026-07-31T02:44:49Z | ef61bb38a3 |   ⚠   | cold      | chromium |         14127 |      18500 |  348 |       36.3 |     452 | `org.dxos.plugin.client.module.Client` (5083)                        |
| 2026-07-31T02:45:28Z | ef61bb38a3 |   ⚠   | warm-cold | chromium |         14406 |      18868 |  432 |       36.4 |     451 | `org.dxos.plugin.client.module.Client` (5003)                        |
| 2026-07-31T02:46:01Z | ef61bb38a3 |   ⚠   | cold      | chromium |         13892 |      18583 |  316 |       36.3 |     452 | `org.dxos.plugin.client.module.Client` (4777)                        |
| 2026-07-31T02:46:39Z | ef61bb38a3 |   ⚠   | warm-cold | chromium |         14899 |      19533 |  404 |       36.3 |     451 | `org.dxos.plugin.client.module.Client` (5222)                        |
| 2026-07-31T02:47:12Z | ef61bb38a3 |   ⚠   | cold      | chromium |         13613 |      18481 |  336 |       36.3 |     452 | `org.dxos.plugin.observability.module.ClientReady` (4687)            |
| 2026-07-31T02:47:53Z | ef61bb38a3 |   ⚠   | warm-cold | chromium |         15131 |      19557 |  396 |       36.4 |     451 | `org.dxos.plugin.observability.module.ClientReady` (5253)            |
| 2026-07-31T02:48:25Z | ef61bb38a3 |   ⚠   | cold      | chromium |         13062 |      17245 |  324 |       36.3 |     452 | `org.dxos.plugin.client.module.Client` (4574)                        |
| 2026-07-31T02:49:02Z | ef61bb38a3 |   ⚠   | warm-cold | chromium |         13294 |      17495 |  388 |       36.5 |     451 | `org.dxos.plugin.client.module.Client` (4580)                        |
| 2026-07-31T02:52:06Z | ef61bb38a3 |   ⚠   | cold      | chromium |         12999 |      17409 |  312 |       36.3 |     452 | `org.dxos.plugin.observability.module.ClientReady` (4565)            |
| 2026-07-31T02:52:44Z | ef61bb38a3 |   ⚠   | warm-cold | chromium |         13279 |      17379 |  388 |       36.5 |     451 | `org.dxos.plugin.observability.module.ClientReady` (4585)            |
| 2026-07-31T02:53:17Z | ef61bb38a3 |   ⚠   | cold      | chromium |         13416 |      18315 |  372 |       36.3 |     452 | `org.dxos.plugin.client.module.Client` (4725)                        |
| 2026-07-31T02:53:56Z | ef61bb38a3 |   ⚠   | warm-cold | chromium |         13961 |      18178 |  432 |       36.5 |     451 | `org.dxos.plugin.observability.module.ClientReady` (4702)            |
| 2026-07-31T12:18:23Z | ebb39a92e3 |   ⚠   | cold      | chromium |          7735 |      12690 |  336 |       31.2 |     382 | `org.dxos.plugin.client.module.Client` (4016)                        |
| 2026-07-31T12:19:01Z | ebb39a92e3 |   ⚠   | warm-cold | chromium |          8242 |      17280 |  352 |       31.6 |     426 | `org.dxos.plugin.client.module.Client` (3957)                        |
| 2026-07-31T12:19:27Z | ebb39a92e3 |   ⚠   | cold      | chromium |          7961 |      12470 |  312 |       31.2 |     382 | `org.dxos.plugin.client.module.Client` (3973)                        |
| 2026-07-31T12:20:06Z | ebb39a92e3 |   ⚠   | warm-cold | chromium |          9017 |      18753 |  388 |       31.5 |     426 | `org.dxos.plugin.client.module.Client` (4409)                        |
| 2026-07-31T12:20:31Z | ebb39a92e3 |   ⚠   | cold      | chromium |          7270 |      12009 |  328 |       31.2 |     381 | `org.dxos.plugin.client.module.Client` (3813)                        |
| 2026-07-31T12:21:04Z | ebb39a92e3 |   ⚠   | warm-cold | chromium |          7928 |      17294 |  456 |       31.3 |     426 | `org.dxos.plugin.client.module.Client` (4192)                        |
| 2026-07-31T12:50:39Z | db867c8116 |       | cold      | chromium |          7784 |      17068 |  360 |       31.3 |     427 | `org.dxos.plugin.space.module.IdentityCreated` (4335)                |
| 2026-07-31T12:51:19Z | db867c8116 |   ⚠   | warm-cold | chromium |          8092 |      20165 |  388 |       31.3 |     424 | `org.dxos.plugin.client.module.Client` (4429)                        |
| 2026-07-31T12:51:49Z | db867c8116 |   ⚠   | cold      | chromium |          7416 |      16993 |  340 |       31.3 |     427 | `org.dxos.plugin.space.module.IdentityCreated` (4224)                |
| 2026-07-31T12:52:27Z | db867c8116 |   ⚠   | warm-cold | chromium |         11695 |      17422 |  368 |       36.5 |     424 | `org.dxos.plugin.observability.module.ClientReady` (5544)            |
| 2026-07-31T12:52:57Z | db867c8116 |   ⚠   | cold      | chromium |          7537 |      17359 |  324 |       31.3 |     427 | `org.dxos.plugin.space.module.IdentityCreated` (4691)                |
| 2026-07-31T12:53:37Z | db867c8116 |   ⚠   | warm-cold | chromium |          7176 |      18987 |  412 |       31.3 |     424 | `org.dxos.plugin.client.module.Client` (3883)                        |
| 2026-07-31T13:03:51Z | a4aedc7f71 |       | cold      | chromium |          7566 |      12666 |  364 |       31.1 |     373 | `org.dxos.plugin.client.module.Client` (4165)                        |
| 2026-07-31T13:04:18Z | a4aedc7f71 |   ⚠   | warm-cold | chromium |          7627 |      12187 |  360 |       31.2 |     372 | `org.dxos.plugin.client.module.Client` (4119)                        |
| 2026-07-31T13:04:44Z | a4aedc7f71 |   ⚠   | cold      | chromium |          7499 |      12951 |  372 |       31.1 |     373 | `org.dxos.plugin.client.module.Client` (3967)                        |
| 2026-07-31T13:05:19Z | a4aedc7f71 |   ⚠   | warm-cold | chromium |         15119 |      20065 |  436 |       31.2 |     372 | `org.dxos.plugin.client.module.Client` (4743)                        |
| 2026-07-31T13:05:47Z | a4aedc7f71 |   ⚠   | cold      | chromium |          8498 |      13886 |  300 |       31.1 |     373 | `org.dxos.plugin.client.module.Client` (4420)                        |
| 2026-07-31T13:06:16Z | a4aedc7f71 |   ⚠   | warm-cold | chromium |          7966 |      12853 |  460 |       31.1 |     371 | `org.dxos.plugin.client.module.Client` (4168)                        |
| 2026-07-31T13:21:58Z | ad7f41f816 |   ⚠   | cold      | chromium |          9803 |      14514 |  360 |       31.2 |     407 | `org.dxos.plugin.client.module.Client` (4498)                        |
| 2026-07-31T13:22:30Z | ad7f41f816 |   ⚠   | warm-cold | chromium |         10902 |      16174 |  388 |       31.4 |     422 | `org.dxos.plugin.client.module.Client` (4451)                        |
| 2026-07-31T13:22:58Z | ad7f41f816 |   ⚠   | cold      | chromium |          9744 |      14746 |  352 |       31.2 |     407 | `org.dxos.plugin.client.module.Client` (4272)                        |
| 2026-07-31T13:23:28Z | ad7f41f816 |   ⚠   | warm-cold | chromium |          9499 |      14066 |  428 |       31.2 |     406 | `org.dxos.plugin.client.module.Client` (4077)                        |
| 2026-07-31T13:23:57Z | ad7f41f816 |   ⚠   | cold      | chromium |         10301 |      15603 |  432 |       31.2 |     407 | `org.dxos.plugin.client.module.Client` (4108)                        |
| 2026-07-31T13:24:29Z | ad7f41f816 |   ⚠   | warm-cold | chromium |         10359 |      15022 |  400 |       31.3 |     406 | `org.dxos.plugin.client.module.Client` (4080)                        |
| 2026-07-31T13:55:13Z | 5539f037e0 |       | cold      | chromium |          6588 |      12282 |  356 |       29.6 |     332 | `org.dxos.plugin.client.module.Client` (3450)                        |
| 2026-07-31T13:55:38Z | 5539f037e0 |   ⚠   | warm-cold | chromium |          6613 |      11093 |  384 |       29.6 |     330 | `org.dxos.plugin.client.module.Client` (3252)                        |
| 2026-07-31T13:56:03Z | 5539f037e0 |   ⚠   | cold      | chromium |          6898 |      13063 |  380 |       29.6 |     331 | `org.dxos.plugin.client.module.Client` (3652)                        |
| 2026-07-31T13:56:29Z | 5539f037e0 |   ⚠   | warm-cold | chromium |          7047 |      11923 |  384 |       29.6 |     330 | `org.dxos.plugin.client.module.Client` (3468)                        |
| 2026-07-31T13:56:55Z | 5539f037e0 |   ⚠   | cold      | chromium |          6581 |      12199 |  328 |       29.6 |     332 | `org.dxos.plugin.client.module.Client` (3452)                        |
| 2026-07-31T13:57:23Z | 5539f037e0 |   ⚠   | warm-cold | chromium |          6400 |      11592 |  424 |       29.6 |     330 | `org.dxos.plugin.client.module.Client` (3222)                        |
| 2026-07-31T14:15:57Z | b8886d064f |       | cold      | chromium |          7347 |      13455 |  444 |       29.7 |     332 | `org.dxos.plugin.client.module.Client` (3696)                        |
| 2026-07-31T14:16:22Z | b8886d064f |   ⚠   | warm-cold | chromium |          6777 |      11252 |  392 |       29.6 |     330 | `org.dxos.plugin.client.module.Client` (3453)                        |
| 2026-07-31T14:16:49Z | b8886d064f |   ⚠   | cold      | chromium |          6858 |      13148 |  352 |       29.7 |     332 | `org.dxos.plugin.client.module.Client` (3397)                        |
| 2026-07-31T14:17:15Z | b8886d064f |   ⚠   | warm-cold | chromium |          7079 |      11939 |  372 |       29.6 |     330 | `org.dxos.plugin.client.module.Client` (3422)                        |
| 2026-07-31T14:42:51Z | 492a7f4675 |       | cold      | chromium |          6713 |      12595 |  344 |       29.7 |     332 | `org.dxos.plugin.client.module.Client` (3439)                        |
| 2026-07-31T14:43:17Z | 492a7f4675 |   ⚠   | warm-cold | chromium |          7260 |      12097 |  364 |       29.6 |     330 | `org.dxos.plugin.client.module.Client` (3789)                        |
| 2026-07-31T15:36:44Z | 6017b2ce78 |       | cold      | chromium |          7826 |      13459 |  316 |       27.5 |     332 | `org.dxos.plugin.client.module.Client` (3627)                        |
| 2026-07-31T15:37:11Z | 6017b2ce78 |   ⚠   | warm-cold | chromium |          7764 |      12436 |  432 |       27.5 |     330 | `org.dxos.plugin.client.module.Client` (3516)                        |
| 2026-07-31T15:37:38Z | 6017b2ce78 |   ⚠   | cold      | chromium |          8221 |      13623 |  336 |       27.5 |     332 | `org.dxos.plugin.client.module.Client` (3925)                        |
| 2026-07-31T15:38:05Z | 6017b2ce78 |   ⚠   | warm-cold | chromium |          7723 |      12115 |  388 |       27.5 |     330 | `org.dxos.plugin.client.module.Client` (3481)                        |
| 2026-07-31T15:38:31Z | 6017b2ce78 |   ⚠   | cold      | chromium |          8413 |      13642 |  320 |       27.5 |     332 | `org.dxos.plugin.client.module.Client` (4011)                        |
| 2026-07-31T15:38:58Z | 6017b2ce78 |   ⚠   | warm-cold | chromium |          7811 |      12237 |  416 |       27.5 |     330 | `org.dxos.plugin.client.module.Client` (3666)                        |
| 2026-07-31T15:40:06Z | a0eaed28c4 |       | cold      | chromium |          8271 |      13858 |  376 |       27.5 |     332 | `org.dxos.plugin.client.module.Client` (3937)                        |
| 2026-07-31T15:40:34Z | a0eaed28c4 |   ⚠   | warm-cold | chromium |          8028 |      12895 |  428 |       27.5 |     330 | `org.dxos.plugin.client.module.Client` (3445)                        |
| 2026-07-31T15:41:00Z | a0eaed28c4 |   ⚠   | cold      | chromium |          8645 |      14134 |  324 |       27.8 |     332 | `org.dxos.plugin.client.module.Client` (4104)                        |
| 2026-07-31T15:41:28Z | a0eaed28c4 |   ⚠   | warm-cold | chromium |          7771 |      12422 |  344 |       27.5 |     330 | `org.dxos.plugin.client.module.Client` (3670)                        |
| 2026-07-31T15:41:53Z | a0eaed28c4 |   ⚠   | cold      | chromium |          7469 |      12679 |  312 |       27.5 |     332 | `org.dxos.plugin.client.module.Client` (3500)                        |
| 2026-07-31T15:42:18Z | a0eaed28c4 |   ⚠   | warm-cold | chromium |          7415 |      11539 |  368 |       27.5 |     330 | `org.dxos.plugin.client.module.Client` (3373)                        |
| 2026-07-31T17:22:47Z | 52e2b889cc |       | cold      | chromium |          7726 |      12756 |  324 |       27.5 |     332 | `org.dxos.plugin.client.module.Client` (3755)                        |
| 2026-07-31T17:23:12Z | 52e2b889cc |   ⚠   | warm-cold | chromium |          6918 |      10686 |  352 |       27.5 |     330 | `org.dxos.plugin.client.module.Client` (3266)                        |
| 2026-07-31T17:23:36Z | 52e2b889cc |   ⚠   | cold      | chromium |          7393 |      12478 |  320 |       27.5 |     332 | `org.dxos.plugin.client.module.Client` (3837)                        |
| 2026-07-31T17:24:01Z | 52e2b889cc |   ⚠   | warm-cold | chromium |          7072 |      11363 |  384 |       27.5 |     330 | `org.dxos.plugin.client.module.Client` (3238)                        |
| 2026-07-31T17:24:25Z | 52e2b889cc |   ⚠   | cold      | chromium |          7132 |      12513 |  320 |       27.5 |     332 | `org.dxos.plugin.client.module.Client` (3422)                        |
| 2026-07-31T17:24:50Z | 52e2b889cc |   ⚠   | warm-cold | chromium |          7110 |      11055 |  312 |       27.5 |     330 | `org.dxos.plugin.client.module.Client` (3186)                        |
