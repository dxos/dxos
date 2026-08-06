---
'@dxos/plugin-onboarding': patch
---

Reject a signup email that already has an account before creating a local identity.

Both signup paths — the welcome dialog's invitation-code flow and the URL-driven
`?accountInvitationCode=…&email=…` flow — created the local identity first and only
then called `/account/invitation-code/redeem`. Hub correctly rejects a duplicate
email with `email_already_registered`, but the client discarded the typed error and
reported it as `'email'` ("Failed to send verification email."), leaving behind an
identity that can never be bound to an account. Because the welcome dialog dismisses
on identity-presence and its signup handlers are gated on `!identity`, the user was
left with no account, no error, and no way to retry short of a storage reset.

Signup now probes `/account/email/exists` first and stops before any identity is
created, reporting a new `account-exists` error with a link through to email login.

The probe is tri-state: a rate-limited or failed check reports `unavailable` rather
than "free", and that also stops before identity creation with a retriable error —
so no signup path can strand an unbindable identity. The URL-driven flow leaves its
`accountInvitationCode`/`email` params intact in that case so a reload retries.
Redemption failures are additionally mapped by `data.type`, so a collision reaching
the server surfaces the same message rather than the misleading delivery error.
