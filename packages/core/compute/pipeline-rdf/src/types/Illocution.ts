//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Illocutionary force (Searle's speech-act taxonomy, minus `declarative` which does not occur in
 * mail): what the author is *doing* with an utterance, orthogonal to whether its propositional content
 * is true. `assertive` informs (the default — a notification/statement); `directive` seeks an action
 * or an answer from the addressee (requests and questions); `commissive` commits the author to a
 * future action (offers/promises); `expressive` conveys a psychological state (thanks/apology).
 */
export const IllocutionaryForce = Schema.Literal('assertive', 'directive', 'commissive', 'expressive');
export type IllocutionaryForce = Schema.Schema.Type<typeof IllocutionaryForce>;

/**
 * The speech act performed by the source utterance. Absent ⇒ `assertive`, so a plain fact is an
 * assertion (a notification/statement) and every pre-existing fact remains valid. `mood` disambiguates
 * directive sub-types without a separate axis — an `interrogative` directive is a question (the
 * propositional content carries the sought-after unknown, marked `Uu` in factuality); an `imperative`
 * directive is a request (the requested action is not yet true, also `Uu`). `addressee` is who is
 * asked to act or answer (defaults to the message recipient when omitted).
 */
export const Illocution = Schema.Struct({
  force: IllocutionaryForce,
  mood: Schema.optional(Schema.Literal('declarative', 'interrogative', 'imperative')),
  // Kept as a free string rather than a `Term` to avoid a schema cycle; the entity slug or email.
  addressee: Schema.optional(Schema.String),
});
export interface Illocution extends Schema.Schema.Type<typeof Illocution> {}
