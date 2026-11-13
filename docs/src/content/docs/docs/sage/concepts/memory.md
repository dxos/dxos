---
title: Memory
description: What an agent keeps between turns, as ECHO objects the user can read.
---

An agent remembers by writing objects: its chats, the notes it keeps and the facts it extracts. They are stored in the
space beside the user's own data, so they sync to members, show up in queries, and can be read, edited and deleted like
anything else the user owns.

## Model

**Chats.** A chat's messages are a [feed](/docs/echo/concepts/feeds/) in the space. Each turn appends the person's
message, the model's reply and every operation call with its result. A process that stopped and resumed rebuilds its
context by reading the chat.

**Memories.** A memory is a small object with a title and content: something the agent learned and wants to keep, such
as a preference or a decision. An agent writes memories through an operation and finds them again with a query.

**Facts.** Text that passes through the space, such as messages, email or transcripts, can be read for facts: who said
what about whom, and when. Each fact keeps the source it came from, so an agent can show why it believes something.

**Goals.** An agent can hold goals written as rules over those facts, such as "when someone in this chat asks for a
review, start one". The rules decide when the agent wakes. A goal fires when a new fact matches it, when it is
achieved, or when one of its sub-goals changes state.

## Behavior

- Memory is shared with the space. Every member can see the agent's chats and memories, and so can every agent in the
  space.
- The rules that wake an agent run on EDGE, beside its process, so a new fact can wake an agent while every device is
  offline.
- Deleting a memory or a message removes it from what the agent reads next.

## Limits

- An agent's chats and memories are as private as the space they are in. Keep work that should not be shared in a
  space of its own.
- What an agent sends a model in a turn is a selection of its memory, not all of it, so a long chat can be summarized
  or cut to fit the model's context.
