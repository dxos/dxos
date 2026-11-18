---
title: Triggers
description: What starts an operation without a person asking.
---

A trigger starts an operation when something happens: a schedule comes round, objects change, a feed gets new items, or
a message arrives from outside. A trigger is an ECHO object in the space, so it syncs to every member and is edited like
any other object.

## Model

**A trigger object** names the operation to run, a spec for when to run it, and an input template. It also holds
whether it is enabled, whether it runs on EDGE, and how many runs may be in flight at once (one unless set).

**Kinds.** The spec's kind says what fires it:

| Kind           | Fires when                                           | Settings                                                  |
| -------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `timer`        | A cron schedule comes round                          | The cron expression                                       |
| `subscription` | Objects matching an ECHO query are created or change | The query; whether nested changes count; a debounce delay |
| `feed`         | A feed receives new items                            | The feed; how many items each run gets, up to 100         |
| `email`        | An email arrives at the space's address              | None                                                      |
| `webhook`      | An HTTP request arrives at the trigger's URL         | The HTTP method                                           |
| `direct`       | Something invokes it                                 | None                                                      |

**Input template.** The trigger builds the operation's input from its template. A value can name part of the event
that fired it, such as `{{event.item}}` for the new feed item, and fixed values, such as a reference to a mailbox, are
passed as they are.

**Routines.** In Composer, a routine pairs an operation with the triggers that start it. It is an app-level object;
EDGE sees only the triggers.

## Behavior

- A trigger runs locally unless it is marked remote. A local trigger fires only while an app with the space open is
  running. A remote trigger fires on EDGE whether or not any device is online.
- Every run is a [process](/docs/edge/concepts/processes/) and writes a [trace](/docs/edge/concepts/traces/), so the
  app can show when a trigger last fired and whether the run succeeded.
- A `timer` or `direct` trigger can also be run by hand from the app. A disabled trigger refuses to run.
- An agent can have triggers of its own; turning the agent off turns its triggers off.

## Limits

- A `subscription` trigger fires on changes that reach the runtime it runs in. A local one sees only what the device
  has synced.
- A remote trigger reads space content on EDGE, so it needs a space that gives EDGE more than `pull` access.
- A feed trigger reads each batch in one query, which is why a batch holds at most 100 items.
