# @dxos/plugin-atproto

A generic, annotation-driven publishing companion for the AT Protocol (atproto).

It appears beside any ECHO object whose _type_ carries an `AtprotoRecordAnnotation` (from
`@dxos/schema`) when the object's space holds an atproto `Connection`. It renders the object's public
projection with per-field private/public markers, shows publish/sync status, and reconciles records
(publish / re-publish / unpublish) on the user's PDS via the Edge-proxied XRPC path.

The wire layer is an Effect service (`AtprotoRepo`) with a live implementation (real
`com.atproto.repo.putRecord`/`deleteRecord`) and an in-memory mock used by tests and storybook.
