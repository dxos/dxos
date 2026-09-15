//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';

import { proxyFetchLegacy } from '@dxos/edge-client';
import type * as GenerationService from '@dxos/plugin-studio/GenerationService';

import {
  HIGGSFIELD_CONNECTOR_ID,
  HIGGSFIELD_DEFAULT_IMAGE_MODEL,
  HIGGSFIELD_DEFAULT_VIDEO_MODEL,
  HIGGSFIELD_ID,
  HIGGSFIELD_SOURCE,
} from '../constants.ts';
import { type HiggsfieldOutput, type HiggsfieldRequestStatus } from './higgsfield-provider-types.ts';
import { type HiggsfieldJob, HiggsfieldProvider } from './higgsfield-provider.ts';
import {
  HIGGSFIELD_DEFAULT_ASPECT_RATIO,
  HiggsfieldImageConfig,
  HiggsfieldVideoConfig,
  decodeImageConfig,
  decodeVideoConfig,
} from './higgsfield-request.ts';

// api.higgsfield.ai is server-side only (no browser CORS), so route through the DXOS edge CORS proxy;
// it remaps `Authorization` to `X-Cors-Proxy-Authorization` and restores it on the way out.
const proxyFetch: typeof globalThis.fetch = (input, init) =>
  proxyFetchLegacy(new URL(typeof input === 'string' ? input : input.toString()), init);

const credentialString = (apiKey?: Redacted.Redacted<string>): string => (apiKey ? Redacted.value(apiKey) : '');

const STATUS_LABELS: Record<HiggsfieldRequestStatus, string> = {
  queued: 'Queued',
  in_progress: 'Generating',
  completed: 'Completed',
  failed: 'Failed',
  nsfw: 'Rejected',
  canceled: 'Canceled',
};

/** A Higgsfield provider wired to the edge CORS proxy (shared by the image and video services). */
export const makeHiggsfieldProvider = (): HiggsfieldProvider => new HiggsfieldProvider({ fetch: proxyFetch });

/** Maps a completed request's outputs to variants; the mime follows the media actually produced. */
export const toVariants = (output: HiggsfieldOutput): GenerationService.VariantData[] => {
  const generation = { provider: HIGGSFIELD_ID };
  switch (output.kind) {
    case 'image':
      return output.urls.map((url) => ({ contentType: 'image/jpeg', url, generation }));
    case 'video':
      return [{ contentType: 'video/mp4', url: output.url, generation }];
    case 'audio':
      return output.urls.map((url) => ({ contentType: 'audio/mpeg', url, generation }));
  }
};

/** Everything a service shares; only the request handling differs per kind. */
const common = {
  id: HIGGSFIELD_ID,
  label: 'Higgsfield',
  source: HIGGSFIELD_SOURCE,
  connectorId: HIGGSFIELD_CONNECTOR_ID,
} as const;

const credentials = (apiKey?: Redacted.Redacted<string>, signal?: AbortSignal) => ({
  credential: credentialString(apiKey),
  signal,
});

/**
 * Image model paths offered in the form. The public API has no catalogue endpoint (models are
 * per account), so this is the documented set; the combobox still accepts any path typed in.
 */
const IMAGE_MODELS: readonly GenerationService.FieldOption[] = [
  { value: 'higgsfield-ai/soul/v2/standard', label: 'Soul v2 (standard)', secondaryLabel: 'text-to-image' },
  { value: 'higgsfield-ai/soul/standard', label: 'Soul (standard)', secondaryLabel: 'text-to-image' },
];

/** Video (image-to-video) model paths, cheapest first; verified against the estimate endpoint. */
const VIDEO_MODELS: readonly GenerationService.FieldOption[] = [
  { value: 'higgsfield-ai/dop/lite', label: 'DoP (lite)', secondaryLabel: 'image-to-video' },
  { value: 'higgsfield-ai/dop/turbo', label: 'DoP (turbo)', secondaryLabel: 'image-to-video' },
  { value: 'higgsfield-ai/dop/standard', label: 'DoP (standard)', secondaryLabel: 'image-to-video' },
];

/**
 * The studio persists one opaque job id per pending variant; ours is the API's `status_url`, so a
 * poll resumed after a remount hits the endpoint the submission named rather than a reconstruction.
 */
const toJob = ({ statusUrl }: HiggsfieldJob) => ({ jobId: statusUrl });

/**
 * The Higgsfield `kind: 'image'` service: `enqueue` posts the prompt to the model path and yields
 * the status URL as the job id, `awaitResult` polls it to completion and maps the produced URLs to
 * variants. Defaults to the documented Soul v2 text-to-image model.
 */
export const makeHiggsfieldImageService = (
  provider: HiggsfieldProvider = makeHiggsfieldProvider(),
): GenerationService.GenerationService => ({
  ...common,
  kind: 'image',
  contentType: 'image/jpeg',
  requestSchema: HiggsfieldImageConfig,
  defaultRequest: { model: HIGGSFIELD_DEFAULT_IMAGE_MODEL, aspectRatio: HIGGSFIELD_DEFAULT_ASPECT_RATIO },
  fieldOptions: { model: async () => IMAGE_MODELS },
  // Async so a config decode failure surfaces as a rejection, not a synchronous throw.
  enqueue: async (request, { apiKey, signal }) => {
    const config = decodeImageConfig(request);
    // A request seeded from a video config names a DoP model, which the API rejects for want of an
    // `image_url`; an image is always a text-to-image job, so the still generator stands in.
    const model = VIDEO_MODELS.some((option) => option.value === config.model)
      ? HIGGSFIELD_DEFAULT_IMAGE_MODEL
      : config.model;
    const job = await provider.enqueue(
      { model, body: { prompt: config.prompt, aspect_ratio: config.aspectRatio } },
      credentials(apiKey, signal),
    );
    return toJob(job);
  },
  awaitResult: async (jobId, { apiKey, signal, onProgress }) => {
    const output = await provider.awaitResult(jobId, {
      ...credentials(apiKey, signal),
      onStatus: (status) => onProgress?.({ status: STATUS_LABELS[status] }),
    });
    return { variants: toVariants(output) };
  },
});

/**
 * The Higgsfield `kind: 'video'` service. The video models animate a still, so `enqueue` first
 * produces one from the prompt (unless the config names an `imageUrl`) — a synchronous Soul job
 * inside the enqueue, since the studio persists only one job id — then submits the animation, whose
 * status URL is what `awaitResult` polls.
 */
export const makeHiggsfieldVideoService = (
  provider: HiggsfieldProvider = makeHiggsfieldProvider(),
): GenerationService.GenerationService => ({
  ...common,
  kind: 'video',
  contentType: 'video/mp4',
  requestSchema: HiggsfieldVideoConfig,
  defaultRequest: {
    model: HIGGSFIELD_DEFAULT_VIDEO_MODEL,
    imageModel: HIGGSFIELD_DEFAULT_IMAGE_MODEL,
    aspectRatio: HIGGSFIELD_DEFAULT_ASPECT_RATIO,
  },
  fieldOptions: { model: async () => VIDEO_MODELS, imageModel: async () => IMAGE_MODELS },
  enqueue: async (request, { apiKey, signal, onProgress, load }) => {
    const config = decodeVideoConfig(request);
    const options = credentials(apiKey, signal);
    let imageUrl = config.imageUrl;
    // A reference artifact contributes its cover: the still the animation continues from.
    if (!imageUrl && config.imageArtifact && load) {
      const reference = await load(config.imageArtifact);
      const cover = reference.cover ? await load(reference.cover) : undefined;
      if (!cover?.url) {
        throw new Error('The reference image has no produced cover to animate.');
      }
      imageUrl = cover.url;
    }
    if (!imageUrl) {
      onProgress?.({ status: 'Generating still' });
      const still = await provider.enqueue(
        {
          model: config.imageModel ?? HIGGSFIELD_DEFAULT_IMAGE_MODEL,
          body: { prompt: config.prompt, aspect_ratio: config.aspectRatio },
        },
        options,
      );
      const output = await provider.awaitResult(still.statusUrl, options);
      if (output.kind !== 'image') {
        throw new Error(`Higgsfield still model returned ${output.kind}, expected an image.`);
      }
      imageUrl = output.urls[0];
    }
    const job = await provider.enqueue(
      { model: config.model, body: { prompt: config.prompt, image_url: imageUrl } },
      options,
    );
    return toJob(job);
  },
  awaitResult: async (jobId, { apiKey, signal, onProgress }) => {
    const output = await provider.awaitResult(jobId, {
      ...credentials(apiKey, signal),
      onStatus: (status) => onProgress?.({ status: STATUS_LABELS[status] }),
    });
    return { variants: toVariants(output) };
  },
});
