# @dxos/errors

## 0.12.0

### Minor Changes

- 782a442: `BaseError.extend(...).wrap()` carries the wrapped error's message instead of substituting the class default, so a wrapper no longer hides what went wrong; an explicit `message` still wins. `messageOf` duck-types `message` rather than testing `instanceof Error`, so a cross-realm or error-shaped value reads the same as a local `Error`.

  Errors raised from `catch` callbacks are tagged rather than bare `Error`s, so callers can discriminate them by `_tag`. A thrown value reaching a service RPC is rebuilt under its own `name` and stack rather than cast, so a `TypeError` or an `InvariantViolation` still reaches the client as itself.

  `Publisher.MissingCredentialError` is a sibling of `PublisherError` rather than a subclass, since a renaming subclass breaks `catchTag` for both; match either with `Publisher.isFailure`. `BookingSearch.BookingProviderError` and `Routing.MissingApiKeyError` are tagged, with `BookingSearch.isFailure` and `Routing.isFailure` alongside them.

  Each new error class gets a unique tag, so `BaseError.is` and `Effect.catchTag` can tell them apart: `FetchError` becomes `VideoFetchError`, `BookmarkFetchError` and `CommerceFetchError`; `OAuthFlowError` becomes `ConnectorOAuthFlowError` and `OnboardingOAuthFlowError`; and plugin-trip's two `MissingApiKeyError` classes become `RoutingMissingApiKeyError` and `BookingSearchMissingApiKeyError`. The exported class names are unchanged, so `Routing.MissingApiKeyError` still reads the same; only `error.name` and the tag differ.

  `ExtendedError` builds its `super` options explicitly rather than spreading the caller's, so a present-but-`undefined` `message` can no longer clobber the class default.

- 78e5596: A user dismissing the passkey prompt no longer reports at error severity.

  WebAuthn signals a dismissed (or timed-out) prompt as a `NotAllowedError` `DOMException`, and an aborted signal as `AbortError`. Both reached the production error stream at ERROR — from the process runtime's FAILED transition and from the welcome screen — where they accounted for roughly half of Composer's remaining error-severity logs and hid real regressions.

  `@dxos/errors` gains `isCancellation`, which walks an error's `cause` chain for those two `DOMException` names or for the `Cancellation` marker a domain error sets to declare itself a user cancellation. `PasskeyError.Dismissed` now carries that marker, the process runtime reports a cancelled process at `info` under `lifecycle: cancelled`, and the welcome screen reports a dismissal at `info`. Every other failure, including every other `DOMException`, still reports at `error`; no UI behaviour changes.

## 0.11.1

## 0.11.0
