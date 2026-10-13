# Agent — open questions

Questions raised while building the agent that have no decision yet. Each names what it affects and what is known.
Move a question into the relevant design doc once it is decided, and delete it here.

## Brain and facts

1. **Should predicates be IRIs?** A fact is stored reified (pipeline-rdf `DESIGN.md`, "Reification"), and its
   predicate is a string literal (`sx:predicate "works at"`), not an IRI. Standard RDF tooling cannot query by
   predicate (`?s :worksAt ?o`); joins rely on the normalized string. Minting an IRI from the normalized predicate
   would fix that at the cost of a vocabulary to manage.
2. **What is the store of record for facts?** `BRAIN.md` says ECHO feeds (one per source, one item per fact), with
   SQLite as a derived index. The EDGE `BrainObject` writes only to its own SQLite, so facts do not replicate with the
   space and are lost when EDGE state is wiped.
3. **How do memories and facts relate?** Memories are ECHO objects people read and correct; facts are triples the
   rules run on. Nothing keeps the two in sync, and the Memories tab labels factual memories "Fact", next to a Facts
   tab of triples. `TASKS.md` already asks what facts replace in `MEMORY.md`.

## Discord

1. **Replies as a tool?** The bot posts the agent's replies by reading the chat feed. Posting them through a hosted
   Discord send operation (as proactive sends do) needs hosted tool calls to read a managed bot token, which they
   cannot today (edge interlocutor `DESIGN.md`, follow-up 2).
2. **Should a feed append wake a process?** The bot no longer needs it (it reaches processes through compute-service's
   `AgentProcessEntrypoint`); keep it only if other callers want feed-driven wakes.
3. **One bot token, several environments.** Discord delivers every event to every gateway session on a token, so two
   environments running Kai would both receive and answer every message. Does each environment need its own app?

## Stories

1. **Seeded facts vary.** The Setup story seeds facts with a model call (`readSource`), so the facts differ between
   runs. Is a deterministic seed (facts pushed as written) worth an operation that accepts explicit facts?
