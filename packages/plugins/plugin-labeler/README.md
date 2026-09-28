# @dxos/plugin-labeler

Labels mailbox messages with the space's own tags, using a decision model rather than a prompt.

Per message it asks three questions in one call:

| Question                                 | `Decision`    | Applied as                                   |
| ---------------------------------------- | ------------- | -------------------------------------------- |
| Does this ask the recipient for a reply? | `probability` | `Needs reply` tag above the threshold        |
| Which of the user's labels fits?         | `classify`    | that tag, if the model is confident enough   |
| How soon does it need dealing with?      | `rate`        | `Urgent` tag for the top band                |

The choices are the space's own user tags plus "none of these" — nothing is invented, and a
low-confidence answer applies nothing rather than a guess.

Two entry points, both from plugin-inbox's own seams:

- **Toolbar action** (`MailboxAction`) — "Label messages" runs it over the whole inbox.
- **Cascade pass** (`MailboxProcessor`, id `label`, after `contacts`) — runs as part of Analyze.

Asks `AiService.decisionModel('ai.typesafe.model.jev.latest')`, which the space serves once TypeSafe
is connected: see `@dxos/plugin-typesafe`. See [docs/DESIGN.md](./docs/DESIGN.md).
