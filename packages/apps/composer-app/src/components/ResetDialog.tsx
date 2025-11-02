//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { type Observability } from '@dxos/observability';
import { FeedbackForm } from '@dxos/plugin-observability';
import { type UserFeedback } from '@dxos/plugin-observability/types';
import {
  AlertDialog,
  type AlertDialogRootProps,
  Button,
  DropdownMenu,
  IconButton,
  Message,
  Popover,
  useTranslation,
} from '@dxos/react-ui';

import { PARAM_SAFE_MODE } from '../config';

// TODO(burdon): Factor out.
const parseError = (t: (name: string, context?: object) => string, error: Error) => {
  const context = 'context' in error && error.context && typeof error.context === 'object' ? error.context : {};

  const translatedTitle = t(`${error.name} title`, context);
  const title = translatedTitle === `${error.name} title` ? t('fatal error title') : translatedTitle;

  const translatedMessage = t(`${error.name} message`, context);
  const message = translatedMessage === `${error.name} message` ? t('fatal error message') : translatedMessage;

  const cause =
    error.cause instanceof Error ? String(error.cause.stack) : error.cause ? String(error.cause) : undefined;

  // Removes indents.
  const stack = `${String(error.stack)}${cause ? `\nCaused by: ${cause}` : ''}`
    .split('\n')
    .map((text) => text.trim())
    .join('\n');

  return { title, message, stack, context };
};

export type FatalErrorProps = Pick<AlertDialogRootProps, 'defaultOpen' | 'open' | 'onOpenChange'> & {
  error?: Error;
  isDev?: boolean;
  observability?: Promise<Observability>;
};

export const ResetDialog = ({
  error: propsError,
  isDev,
  observability: observabilityPromise,
  defaultOpen,
  open,
  onOpenChange,
}: FatalErrorProps) => {
  const { t } = useTranslation('composer'); // TODO(burdon): Const.
  const error = propsError && parseError(t, propsError);
  const {
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const [showStack, setShowStack] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleCopyError = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(error));
  }, [error]);

  const handleReset = async () => {
    localStorage.clear();
    window.location.href = window.location.origin;
  };

  const handleSaveFeedback = useCallback(
    async (values: UserFeedback) => {
      if (!observabilityPromise) {
        return;
      }

      const observability = await observabilityPromise;
      observability.captureUserFeedback(values.message);
      setFeedbackOpen(false);
    },
    [observabilityPromise],
  );

  const handleReload = useCallback(() => {
    if (needRefresh) {
      void updateServiceWorker(true);
    } else {
      location.reload();
    }
  }, [needRefresh, updateServiceWorker]);

  const handleSafeMode = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set(PARAM_SAFE_MODE, 'true');
    window.location.href = url.toString();
  }, []);

  return (
    <AlertDialog.Root
      {...(typeof defaultOpen === 'undefined' && typeof open === 'undefined' && typeof onOpenChange === 'undefined'
        ? { defaultOpen: true }
        : { defaultOpen, open, onOpenChange })}
    >
      <AlertDialog.Overlay>
        {/* TODO(burdon): Replace max-is-[40rem] with standard size. */}
        <AlertDialog.Content classNames='md:max-is-[40rem]' data-testid='resetDialog'>
          <AlertDialog.Title>{t(error ? error.title : 'reset dialog label')}</AlertDialog.Title>
          <AlertDialog.Description>{t(error ? error.message : 'reset dialog message')}</AlertDialog.Description>
          {error && (
            <>
              <div role='none' className='mbs-4'>
                <IconButton
                  icon={showStack ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
                  variant='ghost'
                  classNames='flex items-center'
                  label={t('show stack label')}
                  onClick={() => setShowStack((showStack) => !showStack)}
                  data-testid='resetDialog.showStackTrace'
                />
              </div>
              {showStack && (
                <Message.Root
                  key={error.message}
                  valence='error'
                  classNames='mlb-4 overflow-auto max-bs-72 relative'
                  data-testid='resetDialog.stackTrace'
                >
                  <pre className='text-xs whitespace-pre-line'>{error.stack}</pre>
                  <IconButton
                    classNames='absolute top-2 right-2'
                    icon='ph--clipboard--duotone'
                    iconOnly
                    label={t('copy error label')}
                    onClick={handleCopyError}
                  />
                </Message.Root>
              )}
            </>
          )}
          <div role='none' className='flex gap-2 mbs-4'>
            {!isDev ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button data-testid='resetDialog.reset' variant='destructive'>
                    {t('reset app label')}
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content side='top'>
                    <DropdownMenu.Viewport>
                      <DropdownMenu.Item data-testid='resetDialog.confirmReset' onClick={handleReset}>
                        {t('reset app confirm label')}
                      </DropdownMenu.Item>
                    </DropdownMenu.Viewport>
                    <DropdownMenu.Arrow />
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : (
              <Button variant='primary' onClick={handleSafeMode}>
                {t('safe mode label')}
              </Button>
            )}

            <div role='none' className='flex-grow' />
            {observabilityPromise && (
              <Popover.Root open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <Popover.Trigger asChild>
                  <IconButton icon='ph--paper-plane-tilt--regular' label={t('feedback label')} />
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content>
                    <Popover.Viewport>
                      <FeedbackForm onSave={handleSaveFeedback} />
                    </Popover.Viewport>
                    <Popover.Arrow />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}
            <IconButton
              icon='ph--arrow-clockwise--regular'
              label={t(needRefresh ? 'update and reload page label' : 'reload page label')}
              onClick={handleReload}
            />
          </div>
        </AlertDialog.Content>
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};
