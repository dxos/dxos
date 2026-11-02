//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { RecorderCapabilities } from '#types';

import { useStartRecording } from '../../hooks/index.ts';
import { RecorderNamespace } from '../../namespace.ts';

export type RecordButtonProps = {
  subject: Presentation.Presentation;
};

/** The presenter toolbar's Record item: records the whole presentation, a take per slide, presenting from the first. */
export const RecordButton = ({ subject }: RecordButtonProps) => {
  const recorder = Hooks.useOptionalCapability(RecorderCapabilities.Recorder);
  return recorder ? <RecordButtonInner subject={subject} recorder={recorder} /> : null;
};

RecordButton.displayName = 'RecordButton';

const RecordButtonInner = ({ subject, recorder }: RecordButtonProps & { recorder: RecorderCapabilities.Recorder }) => {
  const { t } = UiHooks.useTranslation(RecorderNamespace.key);
  const state = useAtomValue(recorder.state);
  const busy = state.status !== 'idle';
  const handleClick = useStartRecording(recorder, subject);

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
