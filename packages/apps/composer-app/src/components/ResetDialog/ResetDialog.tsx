//
// Copyright 2022 DXOS.org
//

import React, { type ComponentProps, useCallback, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { FeedbackForm } from '@dxos/plugin-support/components';
import type * as SupportOperation from '@dxos/plugin-support/SupportOperation';
import { useFileDownload, useMediaQuery, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form/next';
import { Next } from '@dxos/react-ui/next';

import { RECOVERY_PATH, composerLogFileName, exportManualLogDownload, setSafeModeUrl } from '../../util/index.ts';

// TODO(burdon): Factor out.
type AlertDialogRootProps = ComponentProps<typeof Next.AlertDialog.Root>;

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
  /** Files the report. Absent when nothing can file one, which hides the feedback affordance. */
  onSubmitReport?: (report: SupportOperation.SupportRequest) => Promise<void>;
  needRefresh?: boolean;
  onRefresh?: () => void;
  onReset?: () => Promise<void>;
};

export const ResetDialog = ({
  error: errorProp,
  logStore,
  onSubmitReport,
  needRefresh,
  defaultOpen,
  open,
  onOpenChange,
  onRefresh,
  onReset,
}: ResetDialogProps) => {
  const { t } = useTranslation('composer');
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

  const handleCopyError = useCallback(() => JSON.stringify(error), [error]);

  const handleDownloadLogs = useCallback(async () => {
    const file = await exportManualLogDownload(logStore);
    download(file, composerLogFileName());
  }, [download, logStore]);

  const handleSaveFeedback = useCallback(
    async (values: SupportOperation.SupportRequest) => {
      if (!onSubmitReport) {
        return false;
      }

      setFeedbackOpen(false);
      try {
        await onSubmitReport(values);
        setFeedbackSent(true);
        return true;
      } catch (err) {
        // The dialog is already showing a fatal error; a second one helps nobody, so the only
        // signal is that the sent confirmation never appears.
        log.warn('crash report not filed', { err });
        return false;
      }
    },
    [onSubmitReport],
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
    <Next.AlertDialog.Root
      {...(typeof defaultOpen === 'undefined' && typeof open === 'undefined' && typeof onOpenChange === 'undefined'
        ? { defaultOpen: true }
        : { defaultOpen, open, onOpenChange })}
    >
      <Next.AlertDialog.Content size='md' data-testid='resetDialog'>
        <Next.AlertDialog.Header>
          <Next.AlertDialog.Title>{t(error ? error.title : 'reset-dialog.label')}</Next.AlertDialog.Title>
        </Next.AlertDialog.Header>
        <Next.AlertDialog.Body>
          <Next.AlertDialog.Description>
            {t(error ? error.message : 'reset-dialog.message')}
          </Next.AlertDialog.Description>
          {error && (
            <>
              <div>
                <div className='flex items-center justify-between py-3'>
                  <Next.Button
                    icon={showStack ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
                    variant='ghost'
                    classNames='flex items-center'
                    label={t('show-stack.label')}
                    onClick={() => setShowStack((showStack) => !showStack)}
                    data-testid='resetDialog.showStackTrace'
                  />
                  <div className='flex items-center gap-1'>
                    <Next.SystemButton.Clipboard iconOnly label={t('copy-error.label')} onCopy={handleCopyError} />
                    <Next.Button
                      icon='ph--download-simple--regular'
                      iconOnly
                      label={t('download-logs.label')}
                      onClick={handleDownloadLogs}
                    />
                  </div>
                </div>
              </div>
              {showStack && (
                <Next.Banner.Root key={error.message}>
                  <Next.Banner.Body asChild>
                    <pre className='text-xs max-h-[136px]' data-testid='resetDialog.stackTrace'>
                      {error.stack}
                    </pre>
                  </Next.Banner.Body>
                </Next.Banner.Root>
              )}
            </>
          )}
        </Next.AlertDialog.Body>

        <Next.AlertDialog.Footer>
          <Next.Button
            variant='primary'
            icon='ph--barricade--regular'
            iconOnly={!isNotMobile}
            label={t('safe-mode.label')}
            onClick={handleSafeMode}
          />
          <Next.Button
            icon='ph--stethoscope--regular'
            iconOnly={!isNotMobile}
            label={t('recovery.label')}
            onClick={handleRecovery}
            data-testid='resetDialog.recovery'
          />
          {onReset && (
            <Next.Menu.Root>
              <Next.Menu.Trigger asChild>
                <Next.Button
                  icon='ph--trash--regular'
                  iconOnly
                  label={t('reset-app.label')}
                  data-testid='resetDialog.reset'
                  variant='destructive'
                />
              </Next.Menu.Trigger>
              <Next.Menu.Content side='top'>
                <Next.Menu.Item data-testid='resetDialog.confirmReset' onClick={onReset}>
                  {t('reset-app-confirm.label')}
                </Next.Menu.Item>
              </Next.Menu.Content>
            </Next.Menu.Root>
          )}

          <div className='flex-grow' />
          {onSubmitReport &&
            isNotMobile &&
            (feedbackSent ? (
              <Next.Button icon='ph--check--regular' label={t('feedback-sent.label')} disabled />
            ) : (
              <Next.Popover.Root open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <Next.Popover.Trigger asChild>
                  <Next.Button icon='ph--paper-plane-tilt--regular' label={t('feedback.label')} />
                </Next.Popover.Trigger>
                <Next.Popover.Content>
                  <Next.Popover.Body>
                    <FeedbackForm.Root onSubmit={handleSaveFeedback}>
                      <Form.Viewport>
                        <Form.Content>
                          <Form.Fields />
                          <FeedbackForm.Submit />
                        </Form.Content>
                      </Form.Viewport>
                    </FeedbackForm.Root>
                  </Next.Popover.Body>
                </Next.Popover.Content>
              </Next.Popover.Root>
            ))}
          <Next.Button
            icon='ph--arrow-clockwise--regular'
            iconOnly={!!isNotMobile}
            label={t(needRefresh ? 'update-and-reload-page.label' : 'reload-page.label')}
            onClick={handleRefresh}
          />
        </Next.AlertDialog.Footer>
      </Next.AlertDialog.Content>
    </Next.AlertDialog.Root>
  );
};
