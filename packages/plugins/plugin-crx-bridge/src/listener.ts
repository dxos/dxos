//
// Copyright 2026 DXOS.org
//

import * as Either from 'effect/Either';
import * as Schema from 'effect/Schema';

import { type Capabilities, type CapabilityManager } from '@dxos/app-framework';
import { getActiveSpace } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';

import { Clip } from '#types';

import { mapClip } from './mapping';

type Invoker = Capabilities.OperationInvoker;

/**
 * Handle a single incoming clip event. Returns an Ack describing the outcome.
 *
 * Kept as a pure async function so it can be unit-tested with an in-memory
 * capability manager and a stub invoker.
 *
 * Decode is two-pass so a `version: 2` payload can respond with
 * `unsupportedVersion` instead of the generic `invalidPayload`:
 *
 *   1. Loose envelope decode — validates that `detail` is an object with a
 *      numeric `version`. Anything else is `invalidPayload`.
 *   2. Version check against the known supported version. A newer version
 *      from a future extension becomes `unsupportedVersion`.
 *   3. Strict V1 payload decode. Anything that still fails here is
 *      `invalidPayload`.
 */
export const handleClipEvent = async (
  detail: unknown,
  capabilities: CapabilityManager.CapabilityManager,
  invoker: Invoker,
): Promise<Clip.Ack> => {
  const envelope = Schema.decodeUnknownEither(Clip.Envelope)(detail);
  if (Either.isLeft(envelope)) {
    // Do NOT log `detail` — it can contain clipped page text/HTML which we
    // treat as sensitive user content.
    log.info('rejected invalid clip envelope');
    return { ok: false, error: 'invalidPayload' };
  }

  if (envelope.right.version !== 1) {
    log.info('rejected unsupported clip version', { version: envelope.right.version });
    return { ok: false, error: 'unsupportedVersion' };
  }

  const decoded = Schema.decodeUnknownEither(Clip.Clip)(detail);
  if (Either.isLeft(decoded)) {
    log.info('rejected invalid clip payload');
    return { ok: false, error: 'invalidPayload' };
  }
  const clip = decoded.right;

  if (!Clip.SUPPORTED_KINDS.includes(clip.kind)) {
    log.info('rejected unsupported clip kind', { kind: clip.kind });
    return { ok: false, error: 'unsupportedKind' };
  }

  const object = mapClip(clip);
  if (!object) {
    // `mapClip` mirrors `SUPPORTED_KINDS`; this branch is defensive.
    return { ok: false, error: 'unsupportedKind' };
  }

  const client = capabilities.get(ClientCapabilities.Client);
  const space = getActiveSpace(client, capabilities);
  if (!space) {
    return { ok: false, error: 'noSpace' };
  }

  try {
    const { data, error } = await invoker.invokePromise(SpaceOperation.AddObject, {
      object,
      target: space.db,
    });
    if (error || !data) {
      log.info('add-object failed', { error });
      return { ok: false, error: 'internal' };
    }
    log.info('created object from clip', { kind: clip.kind, id: data.id });
    return { ok: true, id: data.id };
  } catch (err) {
    log.catch(err);
    return { ok: false, error: 'internal' };
  }
};

/**
 * Attach the `composer:clip` window event listener. Returns a disposer.
 *
 * On every incoming event, regardless of outcome, a `composer:clip:ack`
 * CustomEvent is dispatched so the extension's bridge receiver can resolve
 * its pending promise. The optional `onResult` callback receives the raw
 * (untyped) event detail alongside the ack so callers can surface feedback
 * that depends on payload shape (e.g., kind-specific toasts) without having
 * to re-parse the payload.
 */
export const installClipListener = (
  capabilities: CapabilityManager.CapabilityManager,
  invoker: Invoker,
  onResult?: (ack: Clip.Ack, detail: unknown) => void,
): (() => void) => {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    // `handleClipEvent` is defensive internally, but wrap here so any
    // unexpected rejection (future refactor, transport error, etc.) still
    // produces an ack — the extension waits on `composer:clip:ack` and
    // would otherwise time out silently.
    void handleClipEvent(detail, capabilities, invoker)
      .catch((err): Clip.Ack => {
        log.catch(err);
        return { ok: false, error: 'internal' };
      })
      .then((ack) => {
        window.dispatchEvent(new CustomEvent(Clip.CLIP_ACK_EVENT, { detail: ack }));
        try {
          onResult?.(ack, detail);
        } catch (err) {
          log.catch(err);
        }
      });
  };

  window.addEventListener(Clip.CLIP_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(Clip.CLIP_EVENT, handler as EventListener);
  };
};
