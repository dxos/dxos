---
'@dxos/plugin-inbox': minor
---

The JMAP mail provider moves out of `@dxos/plugin-inbox` into its own headless plugin, `@dxos/plugin-jmap`, which contributes the JMAP connector, its credential form, and the sync/send/materialize operations. It is registered in Composer and enabled by default alongside the Inbox, so connecting a JMAP account is unchanged for users.

`@dxos/plugin-inbox` gains two export subpaths in the process: `./sync`, the provider-agnostic mail-sync harness and its `MailSyncProvider` contract (previously an internal module under `operations/`), and `./testing/sync`, the shared sync-test harness a provider plugin's own tests build on. Provider operation _definitions_ stay in `InboxOperation`, so no consumer of `Mailbox`, `InboxOperation`, or the inbox skills is affected.

Consumers of `@dxos/plugin-inbox/testing` that used the JMAP fixtures (`generateJmapDataset`, `JmapDataset`, `Jmap`) should import them from `@dxos/plugin-jmap/testing` instead.
