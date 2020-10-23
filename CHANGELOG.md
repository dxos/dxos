# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
