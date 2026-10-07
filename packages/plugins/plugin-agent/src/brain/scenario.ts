//
// Copyright 2026 DXOS.org
//

/**
 * The prototype's acceptance scenario, shared by the local and EDGE tests: Kai (the agent) talks with
 * Alice and Bob in their own private chats.
 */
export const BRAIN_SCENARIO = {
  agent: 'Kai',
  alice: {
    did: 'did:halo:BALICEALICEALICEALICEALICEALICEALI',
    ask: 'Keep me posted about what Bob is working on.',
  },
  bob: {
    did: 'did:halo:BBOBBOBBOBBOBBOBBOBBOBBOBBOBBOBBOB',
    working: "I'm working on the indexer migration.",
    ask: 'Keep me updated about what Alice is working on.',
  },
  /** What a scripted extractor finds in the scenario's messages; quotes are verbatim so facts are attributed. */
  facts: [
    {
      subject: 'Bob',
      predicate: 'works on',
      object: 'indexer migration',
      quote: "I'm working on the indexer migration.",
    },
  ],
  /** The entity id pipeline-rdf gives the work Bob names. */
  workEntity: 'indexer-migration',
  /** The update a scripted composer writes for Alice. */
  composed: 'Update on Bob: he is working on the indexer migration.',
} as const;
