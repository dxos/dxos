//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Relation } from '@dxos/echo';
import * as CodeOperation from '@dxos/plugin-code/CodeOperation';
import * as Showcase from '@dxos/plugin-code/Showcase';

import { Presentation } from '#types';

/**
 * Implements plugin-code's showcase operation here, since only this plugin can make a deck: the write-up is the
 * first slide and each artifact a linked slide after it.
 */
const handler: Operation.WithHandler<typeof CodeOperation.CreateShowcase> = CodeOperation.CreateShowcase.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, content, targets = [], items = [], artifacts = [] }) {
      // Resolved before any write, so a stale ref leaves no orphaned deck behind.
      const resolvedTargets = [];
      for (const targetRef of targets) {
        resolvedTargets.push(yield* Database.load(targetRef));
      }
      const resolvedItems = [];
      for (const { spec, item } of items) {
        resolvedItems.push({ spec: yield* Database.load(spec), item });
      }
      const resolvedArtifacts = [];
      for (const artifactRef of artifacts) {
        resolvedArtifacts.push(yield* Database.load(artifactRef));
      }

      const presentation = yield* Database.add(
        Presentation.make({ name, slides: [content.trim() === '' ? `# ${name}` : content] }),
      );
      for (const artifact of resolvedArtifacts) {
        Presentation.link(presentation, artifact);
      }
      for (const target of resolvedTargets) {
        yield* Database.add(Showcase.makeDemonstrates({ [Relation.Source]: presentation, [Relation.Target]: target }));
      }
      for (const { spec, item } of resolvedItems) {
        yield* Database.add(
          Showcase.makeDemonstrates({ [Relation.Source]: presentation, [Relation.Target]: spec, item }),
        );
      }
      yield* Database.flush();
      return { showcase: presentation };
    }),
  ),
);

export default handler;
