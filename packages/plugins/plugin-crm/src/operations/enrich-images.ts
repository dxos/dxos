//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { Organization, Person } from '@dxos/types';

import { CrmOperation } from '#types';

import { attachImageToSubject } from './attach-image.ts';
import { organizationImageCandidates, personImageCandidates } from './image-candidates.ts';

type Subject = Person.Person | Organization.Organization;

/** Candidate image URLs for a subject, best first (empty when nothing is derivable). */
const subjectCandidates = (subject: Subject): Effect.Effect<string[]> =>
  Obj.instanceOf(Person.Person, subject)
    ? personImageCandidates(subject)
    : Effect.succeed(organizationImageCandidates(subject as Organization.Organization));

/**
 * Image-enrichment pipeline over the space's contact graph: streams every Person / Organization
 * missing an `image` through candidate resolution (Gravatar / domain logo) and the hardened attach
 * path, first successful candidate wins. A subject whose candidates all fail is skipped, not an
 * error — enrichment is advisory. Idempotent: subjects with an image are excluded up front, so a
 * rerun only retries prior misses.
 */
const handler = CrmOperation.EnrichImages.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ limit, imageServiceUrl }) {
      const { db } = yield* Database.Service;
      const people = yield* Database.query(Filter.type(Person.Person)).run;
      const organizations = yield* Database.query(Filter.type(Organization.Organization)).run;
      const pending = [...people, ...organizations].filter((subject) => !subject.image).slice(0, limit);

      log.info('enrich-images: pipeline start', {
        people: people.length,
        organizations: organizations.length,
        pending: pending.length,
      });

      let updated = 0;
      let skipped = 0;
      yield* Stream.fromIterable(pending as Subject[]).pipe(
        Stage.map('attach-image', (subject: Subject) =>
          Effect.gen(function* () {
            const candidates = yield* subjectCandidates(subject);
            for (const url of candidates) {
              const attached = yield* attachImageToSubject({ subject, url, imageServiceUrl }).pipe(
                Effect.map(() => true),
                // A miss (404 avatar, unknown logo, oversize, wrong type) tries the next candidate.
                Effect.catch((error) => {
                  log.info('enrich-images: candidate failed', { url, error: error.message });
                  return Effect.succeed(false);
                }),
              );
              if (attached) {
                return true;
              }
            }
            return false;
          }),
        ),
        Pipeline.run({
          sink: (attached: boolean) =>
            Effect.sync(() => {
              if (attached) {
                updated += 1;
              } else {
                skipped += 1;
              }
            }),
        }),
      );

      yield* Effect.promise(() => db.flush());
      log.info('enrich-images: pipeline done', { scanned: pending.length, updated, skipped });
      return { scanned: pending.length, updated, skipped };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
