# Inbox triage

An unsorted morning inbox for the triage demo: Sam Rivera's mail, newest first, none of it read,
labelled or prioritised. Triage (plugin-inbox) is what sorts it.

## Contents

### Mail

Nine messages in one mailbox named Inbox, all tagged `inbox`, dated minutes to hours before the space
is created so the list reads as this morning's mail. Each is its own thread.

| From           | Subject                                           | Asks for                                  |
| -------------- | ------------------------------------------------- | ----------------------------------------- |
| Priya Shah     | Pricing call next week?                           | A 30-minute call, Tuesday or Wednesday    |
| Acme Weekly    | This week in product: 10 tips for faster standups | Nothing (newsletter)                      |
| Lena Fischer   | Interview feedback for Alex Chen                  | Feedback by tomorrow noon                 |
| Figma          | Your receipt from Figma                           | Nothing (receipt)                         |
| Dana Ruiz      | Renewal — need your written OK today              | A reply confirming 40 seats at $18, today |
| Jordan Lee     | Team lunch Thursday                               | A yes or no                               |
| Marta Kowalski | Board deck: slides 4–7                            | Edits to four slides before Wednesday     |
| DevSummit      | Last chance: 40% off DevSummit tickets            | Nothing (promotion)                       |
| Omar Haddad    | FYI: EU latency spike resolved                    | Nothing (FYI)                             |

Dana's renewal sits fifth by date but should land on top: it is due today, it needs a reply, and the
reply itself completes it — which is what lets an agent finish the task on camera.

### Sample mail

A `Connection` named "Sample mail" (connector `org.dxos.plugin-debug.connector.sampleMail`), keyed to
the mailbox. It has no account behind it: plugin-debug's transport delivers a reply locally, giving it
a provider id and the canonical `sent` tag, so a sent reply shows under the message it answers.

## Flows

1. Triage the inbox: every message gets a priority band, the asking ones a needs-reply tag and tasks.
2. Open the top message, assign its task to the agent, allow it to send, and see the reply threaded.

## Checks

- Nine messages, all in the inbox, none tagged anything else.
- One sample-mail connection, keyed to the mailbox.
