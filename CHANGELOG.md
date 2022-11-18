# Changelog

## [0.1.7](https://github.com/dxos/dxos/compare/v0.1.6...v0.1.7) (2022-11-18)


### Features

* Add support for turning if vault to other apps ([#1919](https://github.com/dxos/dxos/issues/1919)) ([717c3be](https://github.com/dxos/dxos/commit/717c3befd65ff7c489d9c38c5491feeb7a65940a))
* **cli:** Seed default config file if config is missing ([#1916](https://github.com/dxos/dxos/issues/1916)) ([ceb4bc6](https://github.com/dxos/dxos/commit/ceb4bc68c6bb599e2ac6fdda364265ed94e114b0))


### Bug Fixes

* **cli:** Clone created apps from git tag matching the cli version ([#1914](https://github.com/dxos/dxos/issues/1914)) ([8cebf8d](https://github.com/dxos/dxos/commit/8cebf8de26894786a6acb2a169036804f9d3ee5f))
* compiler options in the templates ([#1910](https://github.com/dxos/dxos/issues/1910)) ([eee5096](https://github.com/dxos/dxos/commit/eee50965158ff3e91a8a896e2b0325544198929d))
* Demo feedback responses ([#1918](https://github.com/dxos/dxos/issues/1918)) ([7c990a8](https://github.com/dxos/dxos/commit/7c990a8bcbf5244e1aaebf3a27da04bd51f50ac4))
* Halo invitations ([#1911](https://github.com/dxos/dxos/issues/1911)) ([a7f4ce9](https://github.com/dxos/dxos/commit/a7f4ce97f6780d9e92b3cf38803685827afbbf1d))
* **halo-app:** Fix redirect when creating identity ([#1917](https://github.com/dxos/dxos/issues/1917)) ([e997f6b](https://github.com/dxos/dxos/commit/e997f6b077d101a5a3fd4d0cdda59fb5c55a407d))
* **plate:** Only remove trailing slash from path if it exists ([#1915](https://github.com/dxos/dxos/issues/1915)) ([7cfc396](https://github.com/dxos/dxos/commit/7cfc396c65a64d4f575de7c4cc3fb3f0426dd9a2))

## [0.1.6](https://github.com/dxos/dxos/compare/v0.1.5...v0.1.6) (2022-11-17)


### Features

* Add telemetry to composer & tasks apps ([#1887](https://github.com/dxos/dxos/issues/1887)) ([94baf04](https://github.com/dxos/dxos/commit/94baf049aac94dda6482c691b687e22565e58bc5))
* **client:** halo invitations ([#1897](https://github.com/dxos/dxos/issues/1897)) ([f74a147](https://github.com/dxos/dxos/commit/f74a1473b68a6642ee67149b6b3df16f5be077b5))
* complete HALO invitations ([#1869](https://github.com/dxos/dxos/issues/1869)) ([3cc8bbe](https://github.com/dxos/dxos/commit/3cc8bbe59e3c431870570a172f6c61db9e81ff58))
* **composer-app:** Factor composer app out of halo ([#1879](https://github.com/dxos/dxos/issues/1879)) ([c85cd65](https://github.com/dxos/dxos/commit/c85cd6501bbd1cddbb0ff23ed1408688dc6dc28e))
* Dynamic service resolution for dxRpc & shared-worker error handling ([#1883](https://github.com/dxos/dxos/issues/1883)) ([66aee38](https://github.com/dxos/dxos/commit/66aee38191bcb258d40e584828fba34738afb919))
* **halo-app:** Use real devices list ([#1903](https://github.com/dxos/dxos/issues/1903)) ([fdd9477](https://github.com/dxos/dxos/commit/fdd94778394507207ade4de540858c8acfcb9ff8))
* Integrate iframe service ([#1853](https://github.com/dxos/dxos/issues/1853)) ([73db00f](https://github.com/dxos/dxos/commit/73db00fb23e16dd5b8c0cf207ee85a7210e1da01))
* Invitation design increment ([#1868](https://github.com/dxos/dxos/issues/1868)) ([a836694](https://github.com/dxos/dxos/commit/a836694621e1487ce379a8ff82645b7b9c9f27f1))
* List pattern ([#1881](https://github.com/dxos/dxos/issues/1881)) ([efc482c](https://github.com/dxos/dxos/commit/efc482c4042d2453b2b6bc4fee31d9a6810edd6e))
* Make events fire synchronously ([#1824](https://github.com/dxos/dxos/issues/1824)) ([fd7d6ea](https://github.com/dxos/dxos/commit/fd7d6eab69106152802c35c54ada0fde9aef0c66))
* readme generator ([#1830](https://github.com/dxos/dxos/issues/1830)) ([1e6ef96](https://github.com/dxos/dxos/commit/1e6ef9682910035789e0e328bfc10d499c134736))
* **tasks-app:** Setup application ([#1886](https://github.com/dxos/dxos/issues/1886)) ([6eda038](https://github.com/dxos/dxos/commit/6eda038009b1271ff21d3f82181a8d738c59fa5d))


### Bug Fixes

* Add dev config for apps ([#1901](https://github.com/dxos/dxos/issues/1901)) ([be13bbe](https://github.com/dxos/dxos/commit/be13bbe51b64cbd7832f6d3b28c4dd9512cdab5f))
* App redirects with invitations ([#1904](https://github.com/dxos/dxos/issues/1904)) ([e48fb25](https://github.com/dxos/dxos/commit/e48fb2515b28c9af831d9333967132424b435b22))
* Apps prod vite config ([#1900](https://github.com/dxos/dxos/issues/1900)) ([dda5d8c](https://github.com/dxos/dxos/commit/dda5d8c30249890019f10dea9d7b59ac827fb4fe))
* Apps styles & translations ([#1895](https://github.com/dxos/dxos/issues/1895)) ([f49006a](https://github.com/dxos/dxos/commit/f49006aba9f5194f090f6522f899ef6bbe77d646))
* devices are not admitted after halo-invitation. ([#1871](https://github.com/dxos/dxos/issues/1871)) ([60d8f84](https://github.com/dxos/dxos/commit/60d8f84c37223905f99f60fbd3533d5352a86da5))
* **halo-app:** Ensure shared worker is bundled by vite ([#1907](https://github.com/dxos/dxos/issues/1907)) ([15cf8be](https://github.com/dxos/dxos/commit/15cf8beadd670e421806636587f5ce63a9a17607))
* **hello-template:** vite config template ([#1864](https://github.com/dxos/dxos/issues/1864)) ([2bede71](https://github.com/dxos/dxos/commit/2bede713772f9f6bb4eeb603a31575a1cf1b183d))
* react-list: Reject text updates when an input is focused ([#1908](https://github.com/dxos/dxos/issues/1908)) ([3acdf5d](https://github.com/dxos/dxos/commit/3acdf5da9929d458b1dc3a2bb16f7f7a82286c7e))
* **react-ui:** publish plugin w/ types ([#1865](https://github.com/dxos/dxos/issues/1865)) ([2cea876](https://github.com/dxos/dxos/commit/2cea876adffd9558cbe86d9689943542b9435dd7))

## [0.1.5](https://github.com/dxos/dxos/compare/v0.1.4...v0.1.5) (2022-11-11)


### Bug Fixes

* Publish config ([#1859](https://github.com/dxos/dxos/issues/1859)) ([949c5e8](https://github.com/dxos/dxos/commit/949c5e80a2d406cb27440f915a4c94d72265699f))
* **react-client:** Remove old dependency ([#1860](https://github.com/dxos/dxos/issues/1860)) ([bc06ea9](https://github.com/dxos/dxos/commit/bc06ea9a5beffeab35304284c364397fe3b2ee12))

## [0.1.4](https://github.com/dxos/dxos/compare/v0.1.3...v0.1.4) (2022-11-11)


### Features

* Add ClientIFrameServiceProxy ([#1837](https://github.com/dxos/dxos/issues/1837)) ([7dc67e2](https://github.com/dxos/dxos/commit/7dc67e234111007877e88ed9c2748d9b25933cca))
* Add safeInstanceof decorator ([#1850](https://github.com/dxos/dxos/issues/1850)) ([fd52e2c](https://github.com/dxos/dxos/commit/fd52e2ca25f2778d5d2e5fd4e1d2a88857e8b665))


### Bug Fixes

* Dependency issues when installing cli ([#1852](https://github.com/dxos/dxos/issues/1852)) ([e7e4947](https://github.com/dxos/dxos/commit/e7e494792d4b315354cec0dbf6dabc2d98723946))
* More template fixes ([#1857](https://github.com/dxos/dxos/issues/1857)) ([884b5b7](https://github.com/dxos/dxos/commit/884b5b7ddafe8245cd056dd7ce111e014eea085a))
* realign app templates ([#1856](https://github.com/dxos/dxos/issues/1856)) ([c4054f9](https://github.com/dxos/dxos/commit/c4054f907f9490ae77cf00c2aceeb67b199c1bee))

## [0.1.3](https://github.com/dxos/dxos/compare/v0.1.2...v0.1.3) (2022-11-11)


### Features

* Add config editor to devtools ([#1801](https://github.com/dxos/dxos/issues/1801)) ([72cb750](https://github.com/dxos/dxos/commit/72cb7506d51103e616129f6949b682f1b413960a))
* Add deploy script to app templates ([#1819](https://github.com/dxos/dxos/issues/1819)) ([4042b3c](https://github.com/dxos/dxos/commit/4042b3ce949fa38d6c04ea6d8c24770050c0a48c)), closes [#1636](https://github.com/dxos/dxos/issues/1636)
* add invitations options ([#1846](https://github.com/dxos/dxos/issues/1846)) ([b5e90c5](https://github.com/dxos/dxos/commit/b5e90c5bddd39942e3f68c03faadcae5cd5496e5))
* adds authentication code verification ([#1843](https://github.com/dxos/dxos/issues/1843)) ([f433f09](https://github.com/dxos/dxos/commit/f433f09c461c29952e828993370210123e580644))
* change invitations to request/response initiated from the guest. ([#1832](https://github.com/dxos/dxos/issues/1832)) ([4fa4592](https://github.com/dxos/dxos/commit/4fa459249106ef1b4601a06ee6c53026729489d3))
* Context ([#1836](https://github.com/dxos/dxos/issues/1836)) ([2ceacc7](https://github.com/dxos/dxos/commit/2ceacc7d646988b9229af92eb0e931f2ec2070d6))
* Device and space member lists queries ([#1838](https://github.com/dxos/dxos/issues/1838)) ([13d5214](https://github.com/dxos/dxos/commit/13d52140eb7caba02c57503bf22abdfbaf4d25bb))
* **halo-app:** Toggle telemetry ([#1817](https://github.com/dxos/dxos/issues/1817)) ([511b788](https://github.com/dxos/dxos/commit/511b788bbcf88047c03c7d6d9a0f91ca9842fca0))
* **halo-app:** Wire up baseline telemetry events ([#1786](https://github.com/dxos/dxos/issues/1786)) ([7df380c](https://github.com/dxos/dxos/commit/7df380c7d8b2c13966aa47a4a2e615342bac10e9))
* integration of new invitations service ([#1799](https://github.com/dxos/dxos/issues/1799)) ([717c07f](https://github.com/dxos/dxos/commit/717c07f2964fea20778baca224908e95375ebec6))
* PIN input component ([#1834](https://github.com/dxos/dxos/issues/1834)) ([bb214b3](https://github.com/dxos/dxos/commit/bb214b3cec95d3c07f072ae6d97e486c8bc78d34))
* **react-appkit:** Create package ([#1788](https://github.com/dxos/dxos/issues/1788)) ([d281f38](https://github.com/dxos/dxos/commit/d281f38e0adc422e26eb4c1a446c0ffaf996bc64))
* **react-composer:** Introduce pattern ([#1789](https://github.com/dxos/dxos/issues/1789)) ([fc100b8](https://github.com/dxos/dxos/commit/fc100b899eb147fa924bf6defea7c07e7dfb720d))
* Sync testing. ([#1833](https://github.com/dxos/dxos/issues/1833)) ([3586e63](https://github.com/dxos/dxos/commit/3586e63fa7c3a44cd275955010c96986da7660c5))
* Use ramdisk for CI ([#1840](https://github.com/dxos/dxos/issues/1840)) ([92db0e2](https://github.com/dxos/dxos/commit/92db0e2e208aa0134f0aef5083875575795083df))


### Bug Fixes

* **halo-app:** Use iframe delegated webrtc in shared worker ([#1835](https://github.com/dxos/dxos/issues/1835)) ([35b9c33](https://github.com/dxos/dxos/commit/35b9c33030eaf23a69d661eee613244d4d89c228))
* lib ignore in plate pipeline ([#1825](https://github.com/dxos/dxos/issues/1825)) ([775e21e](https://github.com/dxos/dxos/commit/775e21e8f9257af5efa2f6ca6025b42b862da2b5))

## [0.1.2](https://github.com/dxos/dxos/compare/v0.1.1...v0.1.2) (2022-11-04)


### Features

* **cli:** Reintroduce ([#1804](https://github.com/dxos/dxos/issues/1804)) ([3682a5a](https://github.com/dxos/dxos/commit/3682a5aea64473de45bf04ddedefd72da0c6a3ae))


### Bug Fixes

* **mocha:** Separate nyc_output per project ([#1805](https://github.com/dxos/dxos/issues/1805)) ([a87a266](https://github.com/dxos/dxos/commit/a87a2668338cd88db0aca9b6eb659e596ebe8d94))
* skip existing in PublishRequest. ([#1780](https://github.com/dxos/dxos/issues/1780)) ([9beb849](https://github.com/dxos/dxos/commit/9beb849d735ca63d329dd82006f8bcbc9a005c11))

## [0.1.1](https://github.com/dxos/dxos/compare/v0.1.0...v0.1.1) (2022-11-04)


### Features

* Lists, invitations lifecycle, and other improvements ([#1777](https://github.com/dxos/dxos/issues/1777)) ([ce42706](https://github.com/dxos/dxos/commit/ce427069f71e29addfc42aab0a6d4327c7aa2048))
* updates to async, log and mesh RPC. ([#1798](https://github.com/dxos/dxos/issues/1798)) ([e8110d3](https://github.com/dxos/dxos/commit/e8110d315f3b1eb379ce65c52f5d8cb588d17df8))
