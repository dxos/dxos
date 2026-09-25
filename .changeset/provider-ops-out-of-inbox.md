---
'@dxos/plugin-inbox': minor
'@dxos/app-toolkit': minor
'@dxos/react-ui': minor
'@dxos/react-ui-card': minor
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

`ScanMailbox` is now `AnalyzeMailbox`, and its progress meters name their phase as well as their
mailbox ("Syncing Inbox", "Analyzing Inbox") — two meters run over one mailbox, so the bare name left
the user unable to tell which was moving.

A card header's leading depiction is now contributable per type via the `AppSurface.CardIcon` role.
Hosts wrap their existing default in `CardIconSlot`, which renders a contributed surface when one
matches and the default otherwise — `Surface`'s own `fallback` is the error boundary, and unlike
`CardContent` a miss here cannot render nothing. Scoped to cards deliberately: a 6-unit card block
affords initials or a photograph where a 16px navtree row does not, so non-card surfaces keep
resolving `IconAnnotation` through `Obj.getIcon`. `ObjectAvatar` now derives its initials' hue from the
object's label rather than its type, since a type declaring a single hue put every instance on the same
disc; it is no longer a card's default depiction, only what a type opts into.

**`@dxos/react-ui` breaking:** `Message` is renamed to `Banner` — `Message.Root`/`Content`/`Title` are
now `Banner.*`, the `message.*` theme keys are `banner.*`, and the `Callout` alias is removed. A new
`Deferred` holds a fallback back until a pending state has lasted `delay`, then keeps it for at least
`minDuration`, so a momentary empty state is never rendered as the answer.
