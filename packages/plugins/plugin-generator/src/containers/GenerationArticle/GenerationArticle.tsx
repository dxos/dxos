//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useAtomCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { MediaPlayer, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { type ActionGraphProps, Menu, MenuBuilder, useMenuActions } from '@dxos/react-ui-menu';

import { PromptEditor } from '#components';
import { meta } from '#meta';
import { HeyGenProvider, type GenerationProvider, MissingApiKeyError } from '#services';
import { type Generation, GeneratorCapabilities } from '#types';

export type GenerationArticleProps = AppSurface.ObjectArticleProps<Generation.Generation>;

type GenerationState = { status: 'idle' } | { status: 'busy' } | { status: 'error'; message: string };

export const GenerationArticle = ({ role, subject, attendableId }: GenerationArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [generation] = useObject(subject);
  const settings = useAtomCapability(GeneratorCapabilities.Settings);
  const apiKey = settings?.apiKey;
  const provider = useGenerationProvider();
  const [state, setState] = useState<GenerationState>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = useCallback(async () => {
    if (state.status === 'busy') {
      return;
    }
    if (!apiKey) {
      setState({ status: 'error', message: t('api-key-missing.message') });
      return;
    }

    const prompt = subject.prompt.target?.content ?? '';
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: 'busy' });
    try {
      const result = await provider.generate(
        {
          type: generation.type,
          prompt,
          avatarId: generation.avatarId,
          voiceId: generation.voiceId,
        },
        { apiKey, signal: controller.signal },
      );
      Obj.update(subject, (subject) => {
        subject.url = result.url;
      });
      setState({ status: 'idle' });
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      log.catch(err);
      const message =
        err instanceof MissingApiKeyError
          ? t('api-key-missing.message')
          : err instanceof Error
            ? err.message
            : t('generation-failed.message');
      setState({ status: 'error', message });
    }
  }, [state.status, apiKey, provider, subject, generation.type, generation.avatarId, generation.voiceId, t]);

  const handleDelete = useCallback(() => {
    abortRef.current?.abort();
    Obj.update(subject, (subject) => {
      subject.url = undefined;
    });
    setState({ status: 'idle' });
  }, [subject]);

  const busy = state.status === 'busy';
  const hasMedia = Boolean(generation.url);
  // Run is disabled while busy OR until we have enough to attempt a generation.
  // Without an apiKey HeyGen always 400s, so surface that as disabled rather than
  // letting the user fire a request that's guaranteed to fail.
  const canGenerate = !busy && Boolean(apiKey);

  const actionsAtom = useMemo(
    () =>
      Atom.make(
        (): ActionGraphProps =>
          MenuBuilder.make()
            .action(
              'generate',
              {
                label: [busy ? 'generating.label' : 'generate.label', { ns: meta.id }],
                icon: busy ? 'ph--spinner-gap--regular' : 'ph--play--regular',
                iconOnly: true,
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
      ),
    [busy, canGenerate, handleGenerate, handleDelete, hasMedia],
  );
  const menuActions = useMenuActions(actionsAtom);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar>
        <Menu.Root {...menuActions} attendableId={attendableId}>
          <Menu.Toolbar />
        </Menu.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='grid grid-rows-[1fr_auto]'>
        {generation.prompt.target && (
          <PromptEditor id={generation.prompt.dxn.toString()} text={generation.prompt.target} />
        )}
        {generation.url && <MediaPlayer src={generation.url} kind={generation.type} />}
      </Panel.Content>
      {state.status === 'error' && (
        <Panel.Statusbar asChild>
          <Toolbar.Root>
            <Toolbar.Text classNames='text-error-text'>{state.message}</Toolbar.Text>
          </Toolbar.Root>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};

/** Resolves the active GenerationProvider. The default is the HeyGen adapter. */
const useGenerationProvider = (): GenerationProvider => useMemo(() => new HeyGenProvider(), []);
