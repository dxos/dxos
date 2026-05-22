//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAtomCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { Carousel, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { PromptEditor } from '#components';
import { meta } from '#meta';
import { HeyGenProvider, type GenerationProvider, MissingApiKeyError } from '#services';
import { type Generation, GeneratorCapabilities } from '#types';

type Status = 'idle' | 'busy' | 'error';

export type GenerationArticleProps = AppSurface.ObjectArticleProps<Generation.Generation>;

export const GenerationArticle = ({ role, subject, attendableId }: GenerationArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [generation] = useObject(subject);
  const settings = useAtomCapability(GeneratorCapabilities.Settings);
  const apiKey = settings?.apiKey;
  const provider = useGenerationProvider();
  const { status, error } = useGenerationProgress(subject, provider, apiKey);
  const urls = generation.urls ?? [];

  const handleGenerate = useCallback(async () => {
    if (status === 'busy' || !apiKey) {
      return;
    }
    const prompt = subject.prompt.target?.content ?? '';
    try {
      const { jobId } = await provider.enqueue(
        { type: generation.type, prompt, avatarId: generation.avatarId, voiceId: generation.voiceId },
        { apiKey },
      );
      // Persisting `jobId` flips `useGenerationProgress` to 'busy' and starts
      // polling; if the user navigates away mid-job the next mount picks the
      // stored id up and resumes.
      Obj.update(subject, (subject) => {
        subject.jobId = jobId;
      });
    } catch (err) {
      log.catch(err);
      const message =
        err instanceof MissingApiKeyError
          ? t('api-key-missing.message')
          : err instanceof Error
            ? err.message
            : t('generation-failed.message');
      setEnqueueError(message);
    }
  }, [status, apiKey, provider, subject, generation.type, generation.avatarId, generation.voiceId, t]);

  const handleDelete = useCallback(() => {
    Obj.update(subject, (subject) => {
      subject.urls = undefined;
      subject.jobId = undefined;
    });
  }, [subject]);

  // Local transient error (e.g. an `enqueue` rejection) — separate from the
  // progress hook's error which covers `awaitResult` failures.
  const [enqueueError, setEnqueueError] = useState<string>();
  // Clear stale enqueue errors as soon as a fresh job is in flight.
  useEffect(() => {
    if (status === 'busy') {
      setEnqueueError(undefined);
    }
  }, [status]);
  const message = enqueueError ?? error;

  const busy = status === 'busy';
  const hasMedia = urls.length > 0;
  const hasPrompt = Boolean(generation.prompt.target?.content?.trim());
  // Run is disabled while busy OR until we have enough to attempt a generation.
  // Without an apiKey HeyGen always 400s, and an empty prompt produces nothing
  // useful, so surface both as disabled rather than letting the user fire a
  // request that's guaranteed to fail.
  const canGenerate = !busy && Boolean(apiKey) && hasPrompt;

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'generate',
          {
            label: [busy ? 'generating.label' : 'generate.label', { ns: meta.id }],
            icon: busy ? 'ph--spinner-gap--regular' : 'ph--play--regular',
            iconOnly: true,
            iconClassNames: busy ? 'animate-spin' : undefined,
            disabled: !canGenerate,
          },
          handleGenerate,
        )
        .action(
          'delete',
          {
            label: ['delete-media.label', { ns: meta.id }],
            icon: 'ph--trash--regular',
            iconOnly: true,
            disabled: !hasMedia || busy,
            hidden: !hasMedia,
          },
          handleDelete,
        )
        .build(),
    [busy, canGenerate, hasMedia, handleGenerate, handleDelete],
  );

  return (
    <Panel.Root role={role}>
      <Menu.Root {...menuActions} attendableId={attendableId}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
      </Menu.Root>
      {/* TODO(burdon): Reactive layout for mobile. */}
      {/*
       * Row 2 is capped at half the panel height (`minmax(0,50%)`) so the gallery
       * never crowds the prompt editor. The carousel fills that row with `h-full`,
       * and `Carousel.Viewport` drops its default `aspect-video` (via `aspect-auto`)
       * + takes `h-full` so the viewport becomes a bounded box. The video inside
       * `MediaPlayer` keeps its own 16:9 (`aspect-video max-w-full max-h-full`),
       * letterboxing within whatever aspect the bounded viewport ends up with.
       */}
      <Panel.Content classNames='dx-container grid grid-rows-[minmax(0,1fr)_minmax(0,50%)]'>
        <PromptEditor id={generation.prompt.uri} text={generation.prompt.target} />
        {urls.length > 0 && (
          // Carousel resets to index 0 (the latest) every time a new url is
          // prepended — `key={urls.length}` forces a fresh mount on growth so
          // the user lands on the new clip without manual navigation.
          <Carousel.Root key={urls.length} count={urls.length} classNames='min-h-0 h-full p-2'>
            <Carousel.Previous />
            <Carousel.Viewport classNames='aspect-auto h-full'>
              {urls.map((url, index) => (
                <Carousel.Slide key={url} index={index} src={url} kind={generation.type} />
              ))}
            </Carousel.Viewport>
            <Carousel.Next />
            <Carousel.Indicators />
          </Carousel.Root>
        )}
      </Panel.Content>
      {(status === 'error' || Boolean(enqueueError)) && message && (
        <Panel.Statusbar asChild>
          <Toolbar.Root>
            <Toolbar.Text classNames='text-error-text'>{message}</Toolbar.Text>
          </Toolbar.Root>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};

/**
 * Watches `subject.jobId`. While it's set, polls the provider for the result;
 * on completion prepends the URL onto `urls` (most-recent-first list) and
 * clears `jobId`. On mount with an existing `jobId` (e.g. after a remount or
 * page reload) resumes polling instead of starting from scratch — that's the
 * whole point of persisting it.
 */
const useGenerationProgress = (
  subject: Generation.Generation,
  provider: GenerationProvider,
  apiKey: string | undefined,
): { status: Status; error?: string } => {
  const [generation] = useObject(subject);
  const jobId = generation.jobId;
  const [status, setStatus] = useState<Status>(jobId ? 'busy' : 'idle');
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!jobId || !apiKey) {
      setStatus('idle');
      setError(undefined);
      return;
    }
    const controller = new AbortController();
    setStatus('busy');
    setError(undefined);
    provider
      .awaitResult(jobId, { apiKey, signal: controller.signal })
      .then(({ url }) => {
        if (controller.signal.aborted) {
          return;
        }
        Obj.update(subject, (subject) => {
          // Prepend so `urls[0]` is always the most recent — matches what the
          // carousel surfaces by default and what users expect after clicking ▶.
          subject.urls = [url, ...(subject.urls ?? [])];
          subject.jobId = undefined;
        });
        setStatus('idle');
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        log.catch(err);
        setError(err instanceof Error ? err.message : 'Generation failed.');
        setStatus('error');
      });
    return () => controller.abort();
  }, [subject, provider, apiKey, jobId]);

  return { status, error };
};

/** Resolves the active GenerationProvider. The default is the HeyGen adapter. */
const useGenerationProvider = (): GenerationProvider => useMemo(() => new HeyGenProvider(), []);
