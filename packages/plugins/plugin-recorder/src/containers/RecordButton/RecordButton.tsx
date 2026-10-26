//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Obj } from '@dxos/echo';
import type * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as PresenterOperation from '@dxos/plugin-presenter/PresenterOperation';
import * as SlideViewState from '@dxos/plugin-presenter/SlideViewState';
import { useViewStateActions } from '@dxos/react-ui-attention';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';
import { RecorderCapabilities } from '#types';

export type RecordButtonProps = {
  subject: Presentation.Presentation;
};

/** The presenter toolbar's Record item: starts a take and presents the deck from its first slide. */
export const RecordButton = ({ subject }: RecordButtonProps) => {
  const recorder = Hooks.useOptionalCapability(RecorderCapabilities.Recorder);
  return recorder ? <RecordButtonInner subject={subject} recorder={recorder} /> : null;
};

RecordButton.displayName = 'RecordButton';

const RecordButtonInner = ({ subject, recorder }: RecordButtonProps & { recorder: RecorderCapabilities.Recorder }) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const { update } = useViewStateActions(SlideViewState.aspect, Obj.getURI(subject));
  const state = useAtomValue(recorder.state);
  const busy = state.status !== 'idle';

  const handleClick = useCallback(async () => {
    // Started first and inside the click: the media prompts and the AudioContext need its activation.
    if (await recorder.start(subject)) {
      update((state) => ({ ...state, index: 0 }));
      await invokePromise(PresenterOperation.SetPresenting, { object: subject, state: true });
    }
  }, [recorder, subject, update, invokePromise]);

  return (
    <Button.Root
      data-testid='recorder.record'
      icon={state.error && !busy ? 'ph--warning--regular' : 'ph--record--regular'}
      iconOnly
      variant='ghost'
      disabled={busy}
      label={state.error && !busy ? t('record-failed.label', { error: state.error }) : t('record.label')}
      classNames='text-error-text'
      onClick={() => void handleClick()}
    />
  );
};
