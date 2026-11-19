---
title: Triggers
description: What starts an operation without a person asking.
---

A trigger starts an [operation](/docs/edge/concepts/operations/) when something happens: a schedule comes round, objects
change, a feed gets new items, or a message arrives from outside. A trigger is an ECHO object in the space, so it syncs
to every member and you edit it like any other object.

## Model

On a server, you would write a cron job for a schedule, a webhook handler for a request from outside, and a database
hook for a change. A trigger covers each of these with one kind of object.

A trigger names the operation to run, a spec for when to run it, and an input template. It also holds whether it is
enabled, whether it runs on EDGE, and how many runs may be in flight at once. By default, one run is in flight at a
time.

**Kinds.** The spec's kind says what fires the trigger:

| Kind           | Fires when                                           | Settings                                                      |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| `timer`        | A cron schedule comes round                          | The cron expression                                           |
| `subscription` | Objects matching an ECHO query are created or change | The query, whether nested changes count, and a debounce delay |
| `feed`         | A feed receives new items                            | The feed, and how many items each run gets, up to 100         |
| `email`        | An email arrives at the space's address              | None                                                          |
| `webhook`      | An HTTP request arrives at the trigger's URL         | The HTTP method                                               |
| `direct`       | Something invokes it                                 | None                                                          |

**Input template.** The trigger builds the operation's input from its template:

- A value can name part of the event that fired the trigger, such as `{{event.item}}` for the new feed item.
- A fixed value, such as a reference to a mailbox, is passed as it is.

**Routines.** In Composer, a **routine** pairs an operation with the triggers that start it. It is an app-level object,
and EDGE sees only the triggers.

## Behavior

- A trigger runs locally unless you mark it remote. A local trigger fires only while an app with the space open is
  running. A remote trigger fires on EDGE whether or not any device is online.
- Every run is a [process](/docs/edge/concepts/processes/) and writes a [trace](/docs/edge/concepts/traces/), so the
  app can show when a trigger last fired and whether the run succeeded.
- You can also run a `timer` or `direct` trigger by hand from the app. A disabled trigger refuses to run.
- An agent can have triggers of its own. Turning the agent off turns its triggers off.

## Limits

- A `subscription` trigger fires on changes that reach the runtime it runs in. A local one sees only what the device
  has synced.
- A remote trigger reads space content on EDGE, so it needs a space that gives EDGE more than `pull` access, the
  lowest access level. See HALO's [Spaces and membership](/docs/halo/concepts/spaces-membership/).
- A feed trigger reads each batch in one query, which is why a batch holds at most 100 items.
