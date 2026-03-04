//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useState } from 'react';

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
  useMediaQuery,
  useTranslation,
} from '@dxos/react-ui';

import { setSafeModeUrl } from '../config';

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

export type ResetDialogProps = Pick<AlertDialogRootProps, 'defaultOpen' | 'open' | 'onOpenChange'> & {
  isDev?: boolean;
  error?: Error;
  needRefresh?: boolean;
  onRefresh?: () => void;
  observability?: Promise<Observability.Observability>;
};

export const ResetDialog = ({
  isDev,
  error: propsError,
  needRefresh,
  onRefresh,
  observability: observabilityProp,
  defaultOpen,
  open,
  onOpenChange,
}: ResetDialogProps) => {
  const { t } = useTranslation('composer'); // TODO(burdon): Const.
  const [isNotMobile] = useMediaQuery('md');
  const error = propsError && parseError(t, propsError);
  const [showStack, setShowStack] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleCopyError = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(error));
  }, [error]);

  const handleReset = useCallback(async () => {
    localStorage.clear();
    window.location.href = window.location.origin;
  }, []);

  const handleSaveFeedback = useCallback(
    async (values: UserFeedback) => {
      if (!observabilityProp) {
        return;
      }

      const observability = await observabilityProp;
      observability.feedback.captureUserFeedback(values);
      setFeedbackOpen(false);
    },
    [observabilityProp],
  );

  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      location.reload();
    }
  }, [onRefresh]);

  const handleSafeMode = useCallback(() => {
    window.location.href = setSafeModeUrl(true);
  }, []);

  return (
    <AlertDialog.Root
      {...(typeof defaultOpen === 'undefined' && typeof open === 'undefined' && typeof onOpenChange === 'undefined'
        ? { defaultOpen: true }
        : { defaultOpen, open, onOpenChange })}
    >
      <AlertDialog.Overlay>
        <AlertDialog.Content size='md' data-testid='resetDialog'>
          <AlertDialog.Body>
            <AlertDialog.Title>{t(error ? error.title : 'reset dialog label')}</AlertDialog.Title>
            <AlertDialog.Description>{t(error ? error.message : 'reset dialog message')}</AlertDialog.Description>
            {error && (
              <>
                <div role='none'>
                  <div className='flex items-center justify-between'>
                    <IconButton
                      icon={showStack ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
                      variant='ghost'
                      classNames='flex items-center'
                      label={t('show stack label')}
                      onClick={() => setShowStack((showStack) => !showStack)}
                      data-testid='resetDialog.showStackTrace'
                    />
                    <IconButton
                      icon='ph--clipboard--duotone'
                      iconOnly
                      label={t('copy error label')}
                      onClick={handleCopyError}
                    />
                  </div>
                </div>
                {showStack && (
                  <Message.Root key={error.message} classNames='overflow-auto' data-testid='resetDialog.stackTrace'>
                    <pre className='text-xs max-h-16'>{error.stack}</pre>
                  </Message.Root>
                )}
              </>
            )}
          </AlertDialog.Body>

          <AlertDialog.ActionBar>
            <Button variant='primary' onClick={handleSafeMode}>
              {t('safe mode label')}
            </Button>

            {isDev && (
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
            )}

            <div role='none' className='flex-grow' />
            {observabilityProp && isNotMobile && (
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
              onClick={handleRefresh}
            />
          </AlertDialog.ActionBar>
        </AlertDialog.Content>
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};
