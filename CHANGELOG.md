# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### [2.6.8](https://www.github.com/dxos/echo/compare/v2.6.7...v2.6.8) (2020-12-02)


### Bug Fixes

* wait for properties item ([#338](https://www.github.com/dxos/echo/issues/338)) and make it possible to read title of a closed Party ([#337](https://www.github.com/dxos/echo/issues/337)) ([#341](https://www.github.com/dxos/echo/issues/341)) ([f9bd12a](https://www.github.com/dxos/echo/commit/f9bd12a7852f60f03185371efc184ae5451f466a))

### [2.6.7](https://www.github.com/dxos/echo/compare/v2.6.6...v2.6.7) (2020-11-26)


### Bug Fixes

* trigger the subscription for JoinedParties if there is one already ([#335](https://www.github.com/dxos/echo/issues/335)) ([35779cf](https://www.github.com/dxos/echo/commit/35779cff275c2f8dbf8108704ed37f2db89430a7))

### [2.6.6](https://www.github.com/dxos/echo/compare/v2.6.5...v2.6.6) (2020-11-25)


### Bug Fixes

* Use PublicKey in Contacts getter ([#333](https://www.github.com/dxos/echo/issues/333)) ([da4ffae](https://www.github.com/dxos/echo/commit/da4ffae1d5c763a22b5e43a28500a7cd847100b9))

### [2.6.5](https://www.github.com/dxos/echo/compare/v2.6.4...v2.6.5) (2020-11-23)


### Bug Fixes

* Add public entrypoint for creating halo invitation ([#330](https://www.github.com/dxos/echo/issues/330)) ([a19270d](https://www.github.com/dxos/echo/commit/a19270dfe95ecb327a2002b299aad80e7bba8768))
* Different protobuf & async versions ([24a7d4a](https://www.github.com/dxos/echo/commit/24a7d4ae0e68885f40a31d08183d4fe3b27ee7cc))
* Latest HALO ([#327](https://www.github.com/dxos/echo/issues/327)) ([80b6326](https://www.github.com/dxos/echo/commit/80b6326b03ccee5f70ed63133da3cd4b94ce5522))
* latest halo and crypto ([#310](https://www.github.com/dxos/echo/issues/310)) ([e1a173d](https://www.github.com/dxos/echo/commit/e1a173dc708ce399c4528db2348ac7c6f8e9c448))

### [2.6.4](https://www.github.com/dxos/echo/compare/v2.6.3...v2.6.4) (2020-11-12)


### Bug Fixes

* Release identityReady event ([c9e3b59](https://www.github.com/dxos/echo/commit/c9e3b594e58f9494e948528b19633c119ba06853))

### [2.6.3](https://www.github.com/dxos/echo/compare/v2.6.2...v2.6.3) (2020-11-10)


### Bug Fixes

* Use debug warning instead of console ([#318](https://www.github.com/dxos/echo/issues/318)) ([24d4e5e](https://www.github.com/dxos/echo/commit/24d4e5ec6ea4b4e16aad3dfe48d02dea1dbcfaa2))

### [2.6.2](https://www.github.com/dxos/echo/compare/v2.6.1...v2.6.2) (2020-11-06)


### Bug Fixes

* Echo story ([1524330](https://www.github.com/dxos/echo/commit/15243304534e36b923c4c0d834faeddf1be8a5c8))

### [2.6.1](https://www.github.com/dxos/echo/compare/v2.6.0...v2.6.1) (2020-11-04)


### Bug Fixes

* Entrypoints for offline invitations flow ([#301](https://www.github.com/dxos/echo/issues/301)) ([b93ee92](https://www.github.com/dxos/echo/commit/b93ee928a89c4e9186b893731fe0484108cb491c))
* Expose joinHalo/recoverHalo on the ECHO object. ([#299](https://www.github.com/dxos/echo/issues/299)) ([edc1422](https://www.github.com/dxos/echo/commit/edc1422f51df309ce6988cefda914c15741cf12a))

## [2.6.0](https://www.github.com/dxos/echo/compare/v2.5.2...v2.6.0) (2020-11-03)


### Features

* Offline Invitations ([#288](https://www.github.com/dxos/echo/issues/288)) ([cab99fb](https://www.github.com/dxos/echo/commit/cab99fb6c7eb76e7db8b28974a30a8e0481c7525))


### Bug Fixes

* Apply database snapshots only after party open ([53b101a](https://www.github.com/dxos/echo/commit/53b101a7f8575a375f986632f87f3f0f781159ae))
* Ignore unknown models on snapshot restore ([cc13a44](https://www.github.com/dxos/echo/commit/cc13a441b0e0aecd875ffd8fc9a68dfe641677c0))
* minor refactoring of function name for consistency ([b51be37](https://www.github.com/dxos/echo/commit/b51be37a30f1c26ecd96d32cd75e3fd143ece56a))
* Optimize message selector ([cd42db1](https://www.github.com/dxos/echo/commit/cd42db196868445ab892338864fc6c7fd2e17c48))

### [2.5.2](https://www.github.com/dxos/echo/compare/v2.5.1...v2.5.2) (2020-10-30)


### Bug Fixes

* Export text model ([94f25fd](https://www.github.com/dxos/echo/commit/94f25fd561b2440c97b35f0cbf9a1bb2c2fb6f33))

### [2.5.1](https://www.github.com/dxos/echo/compare/v2.5.0...v2.5.1) (2020-10-30)


### Bug Fixes

* Ignore processing of items with unknown models ([#283](https://www.github.com/dxos/echo/issues/283)) ([87505e2](https://www.github.com/dxos/echo/commit/87505e2fec7fb2f331ba301fdc68c25e390361b2))
* Make HALO recovery a little more secure by checking signatures before creating the responder. ([#279](https://www.github.com/dxos/echo/issues/279)) ([2a54c3a](https://www.github.com/dxos/echo/commit/2a54c3ac84bd223e4a7126925ea4ab7972a006d0))

## [2.5.0](https://www.github.com/dxos/echo/compare/v2.4.0...v2.5.0) (2020-10-29)


### Features

* Allow joining the HALO using the recovery seed phrase. ([#275](https://www.github.com/dxos/echo/issues/275)) ([25abc5b](https://www.github.com/dxos/echo/commit/25abc5b6a0599c02f49cc5ebcde86d87079b2d9f))
* Party snapshots ([#250](https://www.github.com/dxos/echo/issues/250)) ([abf6bf9](https://www.github.com/dxos/echo/commit/abf6bf95549c1283a062c94a78f753bddf2494e7))

## [2.4.0](https://www.github.com/dxos/echo/compare/v2.3.0...v2.4.0) (2020-10-27)


### Features

* Auto-join parties on other devices ([#264](https://www.github.com/dxos/echo/issues/264)) ([9cf413b](https://www.github.com/dxos/echo/commit/9cf413bc0262c842e1f3cd5c6311efac0bbe0ad5))


### Bug Fixes

* simplify readiness check ([#267](https://www.github.com/dxos/echo/issues/267)) ([cfdf6e7](https://www.github.com/dxos/echo/commit/cfdf6e7ff176d4d0e63cd90de8b2657fc14cd446))

## [2.3.0](https://www.github.com/dxos/echo/compare/v2.2.1...v2.3.0) (2020-10-23)


### Features

* Multi-device support (internally, no public API yet). ([#257](https://www.github.com/dxos/echo/issues/257)) ([8834adb](https://www.github.com/dxos/echo/commit/8834adbda37b3c9c55f4513dd05644747c108cca))


### Bug Fixes

* Update Party member ResultSet when IdentityInfo is updated. ([#261](https://www.github.com/dxos/echo/issues/261)) ([8c65a94](https://www.github.com/dxos/echo/commit/8c65a948549b686960aa73a804920617ff0501f7))

### [2.2.1](https://www.github.com/dxos/echo/compare/v2.2.0...v2.2.1) (2020-10-23)


### Bug Fixes

* Make replicator._openFeed synchronized ([ecd3068](https://www.github.com/dxos/echo/commit/ecd30685c5dcfd3552e1cefca1acdeaf81fa44e6))

## [2.2.0](https://www.github.com/dxos/echo/compare/v2.1.2...v2.2.0) (2020-10-22)


### Features

* Use Device KeyChains instead of Identity keys for signing. ([#253](https://www.github.com/dxos/echo/issues/253)) ([5d86454](https://www.github.com/dxos/echo/commit/5d8645420da7ca3e0a520539e965e1328aaef6f7))


### Bug Fixes

* Wait for party settings item to be loaded in party.open() ([9db398a](https://www.github.com/dxos/echo/commit/9db398a983a3dd6c3b30fc3a50d62ebc297b207a))

### [2.1.2](https://www.github.com/dxos/echo/compare/v2.1.1...v2.1.2) (2020-10-20)


### Bug Fixes

* Make party.getProperty synchronous ([5a87630](https://www.github.com/dxos/echo/commit/5a876307d8861bd7fca1ca5b59cbe82a98536c7c))

### [2.1.1](https://www.github.com/dxos/echo/compare/v2.1.0...v2.1.1) (2020-10-16)


### Bug Fixes

* lockfile-lint ([31998db](https://www.github.com/dxos/echo/commit/31998db6f553db87e5efca5ec5d274e9d4b9a213))
* lockfile-lint, add github ([d2cbf33](https://www.github.com/dxos/echo/commit/d2cbf33102c0e492be705516b150e545e743efea))
* missing displayName ([#242](https://www.github.com/dxos/echo/issues/242)) ([038f87f](https://www.github.com/dxos/echo/commit/038f87fab4522214226d9e979104c10972fc7907))

## [2.1.0](https://www.github.com/dxos/echo/compare/v2.0.0...v2.1.0) (2020-10-14)


### Features

* Enable builds. ([9e0e855](https://www.github.com/dxos/echo/commit/9e0e8554ebf6230a150107f47fb9c39b9c2f41c7))

## [2.0.0](https://www.github.com/dxos/echo/compare/v1.0.0...v2.0.0) (2020-10-14)


### ⚠ BREAKING CHANGES

* Bump major

### Features

* Bump major ([a2c7781](https://www.github.com/dxos/echo/commit/a2c77819203bdf97382a5e0f85f0ad097ac0eb70))

## 1.0.0 (2020-10-14)


### ⚠ BREAKING CHANGES

* Publish to NPM.

### Features

* Initial release-please ([087c595](https://www.github.com/dxos/echo/commit/087c595fea97751f809c853a72273beea3a37076))
* Publish to NPM. ([50ded92](https://www.github.com/dxos/echo/commit/50ded92943df570faa02bb9e38f2d4a9eecb16f0))


### Bug Fixes

* Fix package name. ([0940235](https://www.github.com/dxos/echo/commit/0940235a49fb2846d92555c6f541349281c79f14))
* Iterator stalling ([#234](https://www.github.com/dxos/echo/issues/234)) ([c502674](https://www.github.com/dxos/echo/commit/c502674b05b3c63603fab39eb5dcced6641e39b0))
* Move release-please to main ([cd8071d](https://www.github.com/dxos/echo/commit/cd8071d7b4a8453ad2786e111d9fc90bcd47ad7d))
* publishConfig for scoped packages. ([07a1103](https://www.github.com/dxos/echo/commit/07a11034da9481763319fc91a06d1db299a2387d))


### Reverts

* Revert "Publish to `dev` channel with `0-dev` preid" ([18d9f8a](https://www.github.com/dxos/echo/commit/18d9f8a188ae6139dedd784ede9420f3c0858f10))

## [Unreleased]

### Added

- [08-17-23] Separeate repos under experimental workspace.
- [08-17-19] Party properties (via special item).
- [08-17-19] PartyManager real-time update and coldstart.
- [08-17-20] Pipeline with feed-store-iterator (using party-processor).
- [08-17-20] Pipeline with basic party-procesor.
- [08-17-20] Working spacetime message order.
- [08-16-20] Set/append mutations.
- [08-16-20] Inbound/outbound Pipeline.
- [08-15-20] Spacetime module and tests.
- [08-15-20] Inbound/outbound pipeline with optional loggers.
- [08-14-20] Database/Party/Item/Model structure.

## Next

- Replay testing for feed-store-iterator.
- Pipeline and tests with party-procesor that manages admit message (using replay feed-store).

### Backlog

- Reactive components (Database, Party, Item, Model) with event propagation.
- Event handlers: global state to warn of leaks when system shuts down (show graph).

### Clean-up

- Typescript namespace merging (see import { dxos as xxx_dxos }).
- Ensure streams are closed when objects are destroyed (on purpose or on error); error handling. Asserts vs Errors?
- BUG: Stream error if transformer async callback throws error.
- Consistent error logging.
- Pipeline logging/metrics.
- Consistent async functions (latch, trigger, etc.)
- WRN model/item formats.
- Rewrite FeedStore (remove hypertrie, path, etc.)

NOTE: Issue with each module generating overlapping protobuf TS definitions.
Local module (e.g., object-store) has to import namespace as xxx_dxos.
