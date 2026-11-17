//
// Copyright 2022 DXOS.org
//

// @import-as-namespace

import React, { type ComponentProps, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { addResources } from '@dxos/i18n';
import { log } from '@dxos/log';
import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Menu from '@dxos/react-ui/Menu';
import * as Popover from '@dxos/react-ui/Popover';
import * as SystemButton from '@dxos/react-ui/SystemButton';

import { NAMESPACE, translations } from './translations.ts';

type AlertDialogRootProps = ComponentProps<typeof AlertDialog.Root>;

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

/** A report form the dialog shows behind its Feedback button; `render` draws the form around `onSubmit`. */
type Feedback<Report> = {
  render: (onSubmit: (report: Report) => Promise<boolean>) => ReactNode;
  submit: (report: Report) => Promise<void>;
};

type ResetDialogProps<Report = unknown> = Pick<AlertDialogRootProps, 'defaultOpen' | 'open' | 'onOpenChange'> & {
  error?: Error;
  needRefresh?: boolean;
  /** Defaults to reloading the page. */
  onRefresh?: () => void;
  onReset?: () => Promise<void>;
  onSafeMode?: () => void;
  onRecovery?: () => void;
  onDownloadLogs?: () => void | Promise<void>;
  feedback?: Feedback<Report>;
};

/**
 * The app's last resort when it cannot start or render: the error with its stack, and the ways out the host offers.
 * Each optional handler adds its button.
 */
const ResetDialog = <Report,>({
  error: errorProp,
  needRefresh,
  defaultOpen,
  open,
  onOpenChange,
  onRefresh,
  onReset,
  onSafeMode,
  onRecovery,
  onDownloadLogs,
  feedback,
}: ResetDialogProps<Report>) => {
  // Rendered outside the plugin tree, which registers every other component's strings.
  useMemo(() => addResources(translations), []);
  const { t } = Hooks.useTranslation(NAMESPACE);
  const [isNotMobile] = Hooks.useMediaQuery('md');
  const error = errorProp && parseError(t, errorProp);
  const [showStack, setShowStack] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    if (!feedbackSent) {
      return;
    }

    const timeout = setTimeout(() => setFeedbackSent(false), 3_000);
    return () => clearTimeout(timeout);
  }, [feedbackSent]);

  // Tag any error that surfaces the fatal dialog so alerts can key off `fatal_dialog: true`.
  // Logging routes through all processors (PostHog + OTEL) unlike captureException.
  useEffect(() => {
    if (!errorProp) {
      return;
    }
    log.error('fatal dialog', { error: errorProp, fatal_dialog: true });
  }, [errorProp]);

  const handleCopyError = useCallback(() => JSON.stringify(error), [error]);

  const handleSaveFeedback = useCallback(
    async (report: Report) => {
      if (!feedback) {
        return false;
      }

      setFeedbackOpen(false);
      try {
        await feedback.submit(report);
        setFeedbackSent(true);
        return true;
      } catch (err) {
        // The dialog is already showing a fatal error; a second one helps nobody, so the only
        // signal is that the sent confirmation never appears.
        log.warn('crash report not filed', { err });
        return false;
      }
    },
    [feedback],
  );

  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      location.reload();
    }
  }, [onRefresh]);

  return (
    <AlertDialog.Root
      {...(typeof defaultOpen === 'undefined' && typeof open === 'undefined' && typeof onOpenChange === 'undefined'
        ? { defaultOpen: true }
        : { defaultOpen, open, onOpenChange })}
    >
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
                  <Button.Root
                    icon={showStack ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
                    variant='ghost'
                    classNames='flex items-center'
                    label={t('show-stack.label')}
                    onClick={() => setShowStack((showStack) => !showStack)}
                    data-testid='resetDialog.showStackTrace'
                  />
                  <div className='flex items-center gap-1'>
                    <SystemButton.Clipboard iconOnly label={t('copy-error.label')} onCopy={handleCopyError} />
                    {onDownloadLogs && (
                      <Button.Root
                        icon='ph--download-simple--regular'
                        iconOnly
                        label={t('download-logs.label')}
                        onClick={onDownloadLogs}
                      />
                    )}
                  </div>
                </div>
              </div>
              {showStack && (
                <Banner.Root key={error.message}>
                  <Banner.Body asChild>
                    <pre className='text-xs max-h-[136px] overflow-auto' data-testid='resetDialog.stackTrace'>
                      {error.stack}
                    </pre>
                  </Banner.Body>
                </Banner.Root>
              )}
            </>
          )}
        </AlertDialog.Body>

        <AlertDialog.Footer>
          {onSafeMode && (
            <Button.Root
              variant='primary'
              icon='ph--barricade--regular'
              iconOnly={!isNotMobile}
              label={t('safe-mode.label')}
              onClick={onSafeMode}
            />
          )}
          {onRecovery && (
            <Button.Root
              icon='ph--stethoscope--regular'
              iconOnly={!isNotMobile}
              label={t('recovery.label')}
              onClick={onRecovery}
              data-testid='resetDialog.recovery'
            />
          )}
          {onReset && (
            <Menu.Root positioning={{ placement: 'top' }}>
              <Menu.Trigger asChild>
                <Button.Root
                  icon='ph--trash--regular'
                  iconOnly
                  label={t('reset-app.label')}
                  data-testid='resetDialog.reset'
                  variant='destructive'
                />
              </Menu.Trigger>
              <Menu.Content>
                <Menu.Item
                  data-testid='resetDialog.confirmReset'
                  onClick={onReset}
                  item={{ value: t('reset-app-confirm.label'), label: t('reset-app-confirm.label') }}
                />
              </Menu.Content>
            </Menu.Root>
          )}

          <div className='flex-grow' />
          {feedback &&
            isNotMobile &&
            (feedbackSent ? (
              <Button.Root icon='ph--check--regular' label={t('feedback-sent.label')} disabled />
            ) : (
              <Popover.Root open={feedbackOpen} onOpenChange={({ open }) => setFeedbackOpen(open)}>
                <Popover.Trigger asChild>
                  <Button.Root icon='ph--paper-plane-tilt--regular' label={t('feedback.label')} />
                </Popover.Trigger>
                <Popover.Content>
                  <Popover.Body>{feedback.render(handleSaveFeedback)}</Popover.Body>
                </Popover.Content>
              </Popover.Root>
            ))}
          <Button.Root
            icon='ph--arrow-clockwise--regular'
            iconOnly={!!isNotMobile}
            label={t(needRefresh ? 'update-and-reload-page.label' : 'reload-page.label')}
            onClick={handleRefresh}
            data-testid='resetDialog.reload'
          />
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
};

export type { Feedback, ResetDialogProps as RootProps };

export { ResetDialog as Root };
