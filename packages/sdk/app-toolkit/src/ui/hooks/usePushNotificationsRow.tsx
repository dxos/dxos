//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type ReactNode, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';

// eslint-disable-next-line @dxos/rules/import-as-namespace
import type * as AppPush from '../../app/AppPush.ts';

export type PushNotificationsRowProps = {
  push: AppPush.Notifications;
  /** Translator for the caller's own namespace, which owns the `settings.notifications.*` strings. */
  t: (key: string, options?: Record<string, unknown>) => string;
};

export type PushNotificationsRowContent = {
  /** Shown above the row while push is unavailable, blocked or failed; turning on only disables the toggle. */
  notice?: { valence: 'info' | 'error'; message: string; detail?: string };
  toggle: ReactNode;
  /** The test control, offered only while notifications are on. */
  test?: { description: string; button: ReactNode };
};

type TestState = AppPush.TestResult | 'idle' | 'sending';

/** A local notification answers at once; the sending message waits this long so the row does not flash. */
const SENDING_DELAY = 300;

/**
 * The notifications toggle and its test control, driven by {@link AppPush.Notifications}. Shared like the update row,
 * so every platform's settings read the same; returns content rather than a laid-out row.
 */
export const usePushNotificationsRow = ({ push, t }: PushNotificationsRowProps): PushNotificationsRowContent => {
  const status = useAtomValue(push.status);
  const error = useAtomValue(push.error);
  const enabled = useAtomValue(push.enabled);
  const [test, setTest] = useState<TestState>('idle');
  const [busy, setBusy] = useState(false);

  const notice: PushNotificationsRowContent['notice'] =
    status === 'unsupported' || status === 'denied' || status === 'failed'
      ? {
          valence: status === 'failed' ? 'error' : 'info',
          message: t(`settings.notifications.${status}.message`),
          detail: status === 'failed' ? error : undefined,
        }
      : undefined;

  const toggle = (
    <Input.Switch
      checked={enabled && status !== 'unsupported'}
      disabled={status === 'unsupported' || status === 'pending'}
      onCheckedChange={({ checked }) => {
        setTest('idle');
        void (checked ? push.enable() : push.disable());
      }}
    />
  );

  const runTest = async () => {
    setBusy(true);
    const sending = setTimeout(() => setTest('sending'), SENDING_DELAY);
    try {
      setTest(await push.sendTest());
    } finally {
      clearTimeout(sending);
      setBusy(false);
    }
  };

  return {
    notice,
    toggle,
    test:
      status === 'on'
        ? {
            description: t(`settings.notifications.test.${test}.message`),
            button: (
              <Button.Root disabled={busy} onClick={() => void runTest()}>
                {t('settings.notifications.test.label')}
              </Button.Root>
            ),
          }
        : undefined,
  };
};
