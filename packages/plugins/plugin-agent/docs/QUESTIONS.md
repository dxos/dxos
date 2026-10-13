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
3. **Can memories go, leaving only facts? Or should memories move into the brain?** Today there are two
   representations of what the agent knows, and nothing keeps them in sync (`TASKS.md` asks what facts replace in
   `MEMORY.md`).
   - **Memories** (`Memory`, ECHO): a sentence with a kind (fact, preference, goal, commitment, relationship, event),
     a status (active, superseded, retracted), `HasSubject` links to the `Person`/`Organization` objects it is about,
     and the message it came from. They replicate with the space, people can read and correct them, and the profile
     panel is built from them.
   - **Facts** (`RDF.Fact`, EDGE `BrainObject` SQLite): a reified triple with factuality, quote, extractor and
     attribution. Append-only (forgetting one is the only change), entities are slugs rather than ECHO references
     (pipeline-rdf's `Entity.ref`, meant for the ECHO object, is never set), and the rules (watches, goals) run on them.
   - **Facts only** needs: entities resolved to ECHO objects, a readable rendering for people, supersede and retract
     (or an append-only equivalent), and the profile rebuilt from facts.
   - **Memories into the brain** would cost what makes memories useful: replication with the space, space
     permissions, and people correcting them in Composer. It only makes sense if the brain's record is itself in ECHO
     (question 2).
   - Leaning: one representation, facts, with ECHO feeds as the record (`BRAIN.md`) and the brain's SQLite as the
     index; then `recordMemory` becomes a push of facts and `Memory` is removed. This decides question 2 at the same
     time.

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
