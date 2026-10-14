//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';

import { proxyFetchLegacy } from '@dxos/edge-client';
import * as GenerationService from '@dxos/plugin-studio/GenerationService';

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

/**
 * Video (image-to-video) model paths, cheapest first; verified against the estimate endpoint. DoP
 * clips are a fixed length; the third-party models take a `duration`.
 */
const VIDEO_MODELS: readonly GenerationService.FieldOption[] = [
  { value: 'higgsfield-ai/dop/lite', label: 'DoP (lite)', secondaryLabel: 'image-to-video' },
  { value: 'higgsfield-ai/dop/turbo', label: 'DoP (turbo)', secondaryLabel: 'image-to-video' },
  { value: 'higgsfield-ai/dop/standard', label: 'DoP (standard)', secondaryLabel: 'image-to-video' },
  { value: 'kling-video/v2.1/standard/image-to-video', label: 'Kling 2.1 (standard)', secondaryLabel: '5s / 10s' },
  { value: 'minimax/hailuo-2.3/standard/image-to-video', label: 'Hailuo 2.3 (standard)', secondaryLabel: '6s / 10s' },
  {
    value: 'kling-video/v2.5-turbo/standard/image-to-video',
    label: 'Kling 2.5 turbo (standard)',
    secondaryLabel: '5s / 10s',
  },
  { value: 'wan-25-preview/image-to-video', label: 'Wan 2.5 (preview)', secondaryLabel: '5s / 10s' },
  { value: 'kling-video/v2.1/pro/image-to-video', label: 'Kling 2.1 (pro)', secondaryLabel: '5s / 10s' },
];

/**
 * Clip lengths each video model family accepts (its OpenAPI enum); DoP's length is fixed, so it
 * takes none. A model outside the table is passed through for the API to validate.
 */
const DURATIONS: readonly { prefix: string; seconds: readonly number[] }[] = [
  { prefix: 'higgsfield-ai/dop/', seconds: [] },
  { prefix: 'kling-video/', seconds: [5, 10] },
  { prefix: 'wan-25-preview/', seconds: [5, 10] },
  { prefix: 'minimax/hailuo-', seconds: [6, 10] },
];

/** The `duration` body field for the model, or an error for a length the model rejects. */
const durationBody = (model: string, duration?: number): { duration?: number } => {
  if (duration === undefined) {
    return {};
  }
  const family = DURATIONS.find(({ prefix }) => model.startsWith(prefix));
  if (family?.seconds.length === 0) {
    return {};
  }
  if (family && !family.seconds.includes(duration)) {
    throw new GenerationService.GenerationError({
      message: `${model} produces clips of ${family.seconds.join(' or ')} seconds, not ${duration}.`,
    });
  }
  return { duration };
};

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
 * The Higgsfield `kind: 'video'` service. The video models animate a still, which is the referenced
 * image artifact's cover (resolved through the op's `load`); the animation's status URL is what
 * `awaitResult` polls.
 */
export const makeHiggsfieldVideoService = (
  provider: HiggsfieldProvider = makeHiggsfieldProvider(),
): GenerationService.GenerationService => ({
  ...common,
  kind: 'video',
  contentType: 'video/mp4',
  requestSchema: HiggsfieldVideoConfig,
  defaultRequest: { model: HIGGSFIELD_DEFAULT_VIDEO_MODEL },
  fieldOptions: { model: async () => VIDEO_MODELS },
  enqueue: async (request, { apiKey, signal, load }) => {
    const config = decodeVideoConfig(request);
    if (!load) {
      throw new GenerationService.GenerationError({ message: 'The reference image cannot be loaded here.' });
    }
    const reference = await load(config.imageArtifact);
    if (reference.kind !== 'image') {
      throw new GenerationService.GenerationError({ message: 'The reference artifact must be an image.' });
    }
    const cover = reference.cover ? await load(reference.cover) : undefined;
    if (!cover?.url) {
      throw new GenerationService.GenerationError({ message: 'The reference image has no produced cover to animate.' });
    }
    if (cover.contentType && !cover.contentType.startsWith('image/')) {
      throw new GenerationService.GenerationError({
        message: `The reference cover is ${cover.contentType}, not an image.`,
      });
    }
    // The same normalization the provider applies at submit, so the duration check sees the path
    // the API will.
    const model = config.model.trim().replace(/^\/+/, '');
    const duration = durationBody(model, config.duration);
    const job = await provider.enqueue(
      { model, body: { prompt: config.prompt, image_url: cover.url, ...duration } },
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
