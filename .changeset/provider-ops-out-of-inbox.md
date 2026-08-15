---
'@dxos/plugin-inbox': minor
---

Mail and calendar providers now own their own operations. `GoogleMailSync`, `GmailSend`,
`MaterializeGmailTarget`, `GetGoogleCalendars`, `GoogleCalendarSync`, `MaterializeGoogleCalendarTarget`
(was `MaterializeCalendarTarget`), `CreateGoogleCalendarEvent`, `GetGoogleContactGroups` and
`GoogleContactsSync` move from `@dxos/plugin-inbox/InboxOperation` to
`@dxos/plugin-google/GoogleOperation`; `JmapSync`, `MaterializeJmapTarget` and `JmapSend` move to
`@dxos/plugin-jmap/JmapOperation`. Their operation DXNs change accordingly.

The Inbox, Inbox (Send) and Calendar skills no longer name a provider: their tools are resolved from
the connectors and send providers a deployment actually installs. A JMAP-only deployment previously
advertised Gmail tools it could not run and had no sync tool of its own.

A draft calendar event is now one carrying no foreign key from any provider, rather than none from
Google — events synced by any other calendar connector were reported as perpetual drafts.
