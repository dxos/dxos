//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { type Observability } from '@dxos/observability';
import { type SupportOperation } from '@dxos/plugin-support';
import { FeedbackForm } from '@dxos/plugin-support/components';
import {
  type AlertDialogRootProps,
  AlertDialog,
  Button,
  DropdownMenu,
  IconButton,
  Message,
  Popover,
  useFileDownload,
  useMediaQuery,
  useTranslation,
} from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { RECOVERY_PATH, setSafeModeUrl } from '../../util';

// TODO(burdon): Factor out.
const parseError = (t: (name: string, context?: object) => string, error: Error) => {
  const context = 'context' in error && error.context && typeof error.context === 'object' ? error.context : {};

  const translatedTitle = t(`${error.name} title`, context);
  const title = translatedTitle === `${error.name} title` ? t('fatal-error.title') : translatedTitle;

  const translatedMessage = t(`${error.name} message`, context);
  const message = translatedMessage === `${error.name} message` ? t('fatal-error.message') : translatedMessage;

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
  error?: Error;
  logStore: IdbLogStore;
  observability?: Promise<Observability.Observability>;
  needRefresh?: boolean;
  onRefresh?: () => void;
  onReset?: () => Promise<void>;
};

export const ResetDialog = ({
  error: errorProp,
  logStore,
  observability: observabilityProp,
  needRefresh,
  defaultOpen,
  open,
  onOpenChange,
  onRefresh,
  onReset,
}: ResetDialogProps) => {
  const { t } = useTranslation('composer'); // TODO(burdon): Const.
  const [isNotMobile] = useMediaQuery('md');
  const error = errorProp && parseError(t, errorProp);
  const [showStack, setShowStack] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const download = useFileDownload();

  useEffect(() => {
    if (!feedbackSent) {
      return;
    }
    const timeout = setTimeout(() => setFeedbackSent(false), 3_000);
    return () => clearTimeout(timeout);
  }, [feedbackSent]);

  // Tag any error that surfaces the fatal dialog so alerts can key off `fatal_dialog: true`.
  // Logging routes through all processors (PostHog + OTEL/SigNoz) unlike captureException.
  useEffect(() => {
    if (!errorProp) {
      return;
    }
    log.error('fatal dialog', { error: errorProp, fatal_dialog: true });
  }, [errorProp]);

  const handleCopyError = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(error));
  }, [error]);

  const handleDownloadLogs = useCallback(async () => {
    const ndjson = await logStore.export();
    const file = new Blob([ndjson], { type: 'application/x-ndjson' });
    const fileName = `composer-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ndjson`;
    download(file, fileName);
  }, [download, logStore]);

  const handleSaveFeedback = useCallback(
    async (values: SupportOperation.SupportRequest) => {
      if (!observabilityProp) {
        return;
      }

      // Collapse the richer SupportRequest into the legacy `{ message, includeLogs }`
      // shape consumed by Observability. Triage metadata (type/severity/area/version)
      // is embedded as a Markdown trailer so it travels with the message.
      const trailer = [
        `**Type:** ${values.type}`,
        `**Severity:** ${values.severity}`,
        values.area && `**Area:** ${values.area}`,
        values.version && `**Version:** ${values.version}`,
      ]
        .filter(Boolean)
        .join('\n');
      const message = [`# ${values.title}`, values.body, '---', trailer].filter(Boolean).join('\n\n');

      const observability = await observabilityProp;
      void observability.feedback.captureUserFeedback({ message, includeLogs: values.includeLogs });
      setFeedbackOpen(false);
      setFeedbackSent(true);
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

  const handleRecovery = useCallback(() => {
    window.location.href = RECOVERY_PATH;
  }, []);

  return (
    <AlertDialog.Root
      {...(typeof defaultOpen === 'undefined' && typeof open === 'undefined' && typeof onOpenChange === 'undefined'
        ? { defaultOpen: true }
        : { defaultOpen, open, onOpenChange })}
    >
      <AlertDialog.Overlay>
        <AlertDialog.Content size='md' data-testid='resetDialog'>
          <AlertDialog.Header>
            <AlertDialog.Title>{t(error ? error.title : 'reset-dialog.label')}</AlertDialog.Title>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <AlertDialog.Description>{t(error ? error.message : 'reset-dialog.message')}</AlertDialog.Description>
            {error && (
              <>
                <div>
                  <div className='flex items-center justify-between py-3'>
                    <IconButton
                      icon={showStack ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
                      variant='ghost'
                      classNames='flex items-center'
                      label={t('show-stack.label')}
                      onClick={() => setShowStack((showStack) => !showStack)}
                      data-testid='resetDialog.showStackTrace'
                    />
                    <div className='flex items-center gap-1'>
                      <IconButton
                        icon='ph--clipboard--duotone'
                        iconOnly
                        label={t('copy-error.label')}
                        onClick={handleCopyError}
                      />
                      <IconButton
                        icon='ph--download-simple--regular'
                        iconOnly
                        label={t('download-logs.label')}
                        onClick={handleDownloadLogs}
                      />
                    </div>
                  </div>
                </div>
                {showStack && (
                  <Message.Root key={error.message} classNames='overflow-auto' data-testid='resetDialog.stackTrace'>
                    <pre className='text-xs max-h-[136px]'>{error.stack}</pre>
                  </Message.Root>
                )}
              </>
            )}
          </AlertDialog.Body>

          <AlertDialog.ActionBar>
            <IconButton
              variant='primary'
              icon='ph--barricade--regular'
              iconOnly={!isNotMobile}
              label={t('safe-mode.label')}
              onClick={handleSafeMode}
            />
            <IconButton
              icon='ph--stethoscope--regular'
              iconOnly={!isNotMobile}
              label={t('recovery.label')}
              onClick={handleRecovery}
              data-testid='resetDialog.recovery'
            />
            {onReset && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button data-testid='resetDialog.reset' variant='destructive'>
                    {t('reset-app.label')}
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content side='top'>
                    <DropdownMenu.Viewport>
                      <DropdownMenu.Item data-testid='resetDialog.confirmReset' onClick={onReset}>
                        {t('reset-app-confirm.label')}
                      </DropdownMenu.Item>
                    </DropdownMenu.Viewport>
                    <DropdownMenu.Arrow />
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )}

            <div className='flex-grow' />
            {observabilityProp &&
              isNotMobile &&
              (feedbackSent ? (
                <IconButton icon='ph--check--regular' label={t('feedback-sent.label')} disabled />
              ) : (
                <Popover.Root open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                  <Popover.Trigger asChild>
                    <IconButton icon='ph--paper-plane-tilt--regular' label={t('feedback.label')} />
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content>
                      <Popover.Viewport>
                        <FeedbackForm.Root>
                          <Form.Viewport>
                            <Form.Content>
                              <Form.FieldSet />
                              <FeedbackForm.SubmitPosthog onSubmit={handleSaveFeedback} />
                            </Form.Content>
                          </Form.Viewport>
                        </FeedbackForm.Root>
                      </Popover.Viewport>
                      <Popover.Arrow />
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              ))}
            <IconButton
              icon='ph--arrow-clockwise--regular'
              iconOnly={!!isNotMobile}
              label={t(needRefresh ? 'update-and-reload-page.label' : 'reload-page.label')}
              onClick={handleRefresh}
            />
          </AlertDialog.ActionBar>
        </AlertDialog.Content>
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};
