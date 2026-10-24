//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import * as MediaArtifact from '@dxos/plugin-studio/MediaArtifact';
import * as StudioOperation from '@dxos/plugin-studio/StudioOperation';

import { applyEdit, parseSlide, setFrontmatter } from '#markdown';
import { Presentation, PresenterOperation } from '#types';

/** Layouts that already place the slide's image. */
const IMAGE_LAYOUTS = new Set(['cover', 'image', 'image-left', 'image-right']);

const handler: Operation.WithHandler<typeof PresenterOperation.GenerateSlideImage> =
  PresenterOperation.GenerateSlideImage.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ slide: slideRef, prompt, provider }) {
        const slide = yield* Database.load(slideRef);
        const artifact = yield* Database.add(MediaArtifact.make({ name: prompt, kind: 'image' }));
        Obj.update(slide, (slide) => {
          slide.image = Ref.make(artifact);
        });
        // The artifact belongs to the slide (after the ref, which the parent edge expects), so deleting the slide
        // deletes its image.
        Obj.setParent(artifact, slide);

        // A markdown slide shows the image only in a layout that places one.
        const content = yield* Database.load(slide.content);
        if (Presentation.isOwnedContent(slide, content)) {
          const markdown = content.content;
          if (!IMAGE_LAYOUTS.has(parseSlide(markdown).layout)) {
            Obj.update(content, (content) => {
              content.content = applyEdit(markdown, setFrontmatter(markdown, { layout: 'image' }));
            });
          }
        }
        yield* Database.flush();

        // A refused generation (credentials, moderation) is a result the caller reads, not a failure of the tool; a
        // provider failure reaches the invoker as a defect, hence `Effect.exit` rather than a typed catch.
        const exit = yield* Effect.exit(
          Operation.invoke(StudioOperation.Generate, { artifact: Ref.make(artifact), provider, config: { prompt } }),
        );
        if (Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)) {
          return yield* Effect.failCause(exit.cause);
        }
        return {
          artifact: Ref.make(artifact),
          ...(Exit.isFailure(exit) ? { error: Cause.pretty(exit.cause) } : {}),
        };
      }),
    ),
  );

export default handler;
