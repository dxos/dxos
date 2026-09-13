//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Collection, Obj } from '@dxos/echo';

import { ImageVariant, MediaArtifactCard, VideoVariant } from '#components';
import { GalleryArticle, LightboxArticle, MediaArtifactArticle, StoryboardArticle } from '#containers';
import { VariantRenderer } from '#surfaces';
import { Lightbox, MediaArtifact, Storyboard } from '#types';

const isArtifact = Obj.instanceOf(MediaArtifact.MediaArtifact);

/** A Collection is a studio gallery when its (loaded) members are all Artifacts and at least one is. */
const isArtifactCollection = (collection?: Collection.Collection): boolean => {
  const objects = collection?.objects ?? [];
  let sawArtifact = false;
  for (const ref of objects) {
    const target = ref.target;
    if (!target) {
      continue;
    }
    if (!isArtifact(target)) {
      return false;
    }
    sawArtifact = true;
  }
  return sawArtifact;
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'artifactArticle',
        filter: AppSurface.object(AppSurface.Article, MediaArtifact.MediaArtifact),
        component: MediaArtifactArticle,
        // `nodeId` rides along for an article nested in another (a storyboard frame) — see the article.
        props: ({ role, data: { subject, attendableId, nodeId } }) => ({ role, subject, attendableId, nodeId }),
      }),
      Surface.create({
        id: 'storyboardArticle',
        filter: AppSurface.object(AppSurface.Article, Storyboard.Storyboard),
        component: StoryboardArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'galleryArticle',
        filter: AppSurface.object(AppSurface.Article, Collection.Collection, (data) =>
          isArtifactCollection(data.subject),
        ),
        component: GalleryArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),

      Surface.create({
        id: 'lightboxArticle',
        filter: AppSurface.object(AppSurface.Article, Lightbox.Lightbox),
        component: LightboxArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),

      // Card rendering of a MediaArtifact (cover thumbnail) — composes Artifacts into collections/boards.
      Surface.create({
        id: 'artifactCard',
        filter: AppSurface.object(AppSurface.CardContent, MediaArtifact.MediaArtifact),
        component: MediaArtifactCard,
        props: ({ data: { subject } }) => ({ subject }),
      }),

      // Default variant renderers (image/*, video/*), overridable per contentType via Position.first.
      Surface.create({
        id: 'imageVariant',
        filter: Surface.makeFilter(
          VariantRenderer,
          (data) => typeof data.contentType === 'string' && data.contentType.startsWith('image/'),
        ),
        component: ImageVariant,
        props: ({ data: { variant } }) => ({ variant }),
      }),
      Surface.create({
        id: 'videoVariant',
        filter: Surface.makeFilter(
          VariantRenderer,
          (data) => typeof data.contentType === 'string' && data.contentType.startsWith('video/'),
        ),
        component: VideoVariant,
        props: ({ data: { variant } }) => ({ variant }),
      }),
    ]),
  ),
);
