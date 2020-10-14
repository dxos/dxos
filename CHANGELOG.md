# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
