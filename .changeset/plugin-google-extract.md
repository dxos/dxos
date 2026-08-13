---
'@dxos/plugin-inbox': minor
---

The Google provider moves out of `@dxos/plugin-inbox` into its own headless plugin, `@dxos/plugin-google`, which contributes the Gmail, Google Calendar and Google Contacts connectors along with every sync, send, materialize and discovery operation. Like `@dxos/plugin-jmap`, it is registered in Composer and enabled by default alongside the Inbox, so connecting a Google account is unchanged for users. Both providers declare `dependsOn: ['org.dxos.plugin.inbox']` in their plugin profile.

With that, `plugin-inbox` no longer has an `apis/` or `services/` directory: every provider wrapper and its Effect service now lives with the provider that owns it. `Mailbox`, `Calendar`, `InboxOperation` and the inbox skills are unaffected — provider operation definitions still live in `InboxOperation`.

Two changes visible to test code: `seedMailboxBinding` from `@dxos/plugin-inbox/testing/sync` now requires `source` and `connectorId` (they previously defaulted to Gmail's, which a provider-neutral harness cannot name), and the Gmail fixtures (`generateGmailDataset`, `GmailDataset`) move to `@dxos/plugin-google/testing`. `@dxos/plugin-inbox/testing` also drops its `node` export condition, which existed only to serve those fixtures.
