//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Collection, Obj } from '@dxos/echo';

import { ArtifactCard, ImageVariant, VideoVariant } from '#components';
import { ArtifactArticle, ArtifactsArticle, GalleryArticle, LightboxArticle } from '#containers';
import { VariantRenderer } from '#surfaces';
import { Artifact, Lightbox } from '#types';

import { ARTIFACTS_NODE_DATA } from '../constants';

const isArtifact = Obj.instanceOf(Artifact.Artifact);

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
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'artifactArticle',
        filter: AppSurface.object(AppSurface.Article, Artifact.Artifact),
        component: ArtifactArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),

      // Virtual "Artifacts" navtree node → the browse/create hub (bound by data sentinel, not an object).
      Surface.create({
        id: 'artifactsArticle',
        filter: Surface.makeFilter(AppSurface.Article, (data) => data.subject === ARTIFACTS_NODE_DATA),
        component: ArtifactsArticle,
        props: ({ role, data: { attendableId, properties } }) => ({ role, attendableId, properties }),
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

      // Card rendering of an Artifact (cover thumbnail) — composes Artifacts into collections/boards.
      Surface.create({
        id: 'artifactCard',
        filter: AppSurface.object(AppSurface.CardContent, Artifact.Artifact),
        component: ArtifactCard,
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
