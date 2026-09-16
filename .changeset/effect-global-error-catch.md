---
'@dxos/errors': patch
'@dxos/protocols': patch
'@dxos/plugin-blogger': patch
'@dxos/plugin-trip': patch
---

`BaseError.extend(...).wrap()` carries the wrapped error's message instead of substituting the class default, so a wrapper no longer hides what went wrong; an explicit `message` still wins. `messageOf` duck-types `message` rather than testing `instanceof Error`, so a cross-realm or error-shaped value reads the same as a local `Error`.

Errors raised from `catch` callbacks are tagged rather than bare `Error`s, so callers can discriminate them by `_tag`. A thrown value reaching a service RPC is rebuilt under its own `name` and stack rather than cast, so a `TypeError` or an `InvariantViolation` still reaches the client as itself.

`Publisher.MissingCredentialError` is a sibling of `PublisherError` rather than a subclass, since a renaming subclass breaks `catchTag` for both; match either with `Publisher.isFailure`. `BookingSearch.BookingProviderError` and `Routing.MissingApiKeyError` are tagged, with `BookingSearch.isFailure` and `Routing.isFailure` alongside them.
