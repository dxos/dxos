//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { SupportOperation } from '#types';

export type FeedbackFormProps = {
  onSave?: (values: SupportOperation.UserFeedback) => void | Promise<void>;
  disabled?: boolean;
  onDiscord?: (values: SupportOperation.UserFeedback) => void | Promise<void>;
  discordPresence?: { teamOnline: number; communityOnline: number };
  /** Optional handler — when supplied a "Download logs" button is rendered below the submit action. */
  onDownloadLogs?: () => void | Promise<void>;
};

const defaultValues: SupportOperation.UserFeedback = {
  message: '',
  includeLogs: true,
};

export const FeedbackForm = ({ onSave, onDiscord, discordPresence, disabled, onDownloadLogs }: FeedbackFormProps) => {
  const { t } = useTranslation(meta.id);
  const actionRef = useRef<'posthog' | 'discord'>('posthog');

  const handleSave = useCallback(
    async (values: SupportOperation.UserFeedback) => {
      if (actionRef.current === 'discord' && onDiscord) {
        await onDiscord(values);
      } else {
        await onSave?.(values);
      }
    },
    [onSave, onDiscord],
  );

  return (
    <Form.Root schema={SupportOperation.UserFeedback} defaultValues={defaultValues} onSave={handleSave}>
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet />
          {onDownloadLogs && (
            <div className='flex w-full pt-form-padding'>
              <IconButton
                classNames='w-full'
                type='button'
                icon='ph--download-simple--regular'
                label={t('download-logs.label')}
                onClick={() => void onDownloadLogs()}
                data-testid='download-logs-button'
              />
            </div>
          )}
          <div onClick={() => (actionRef.current = 'posthog')}>
            <Form.Submit
              icon='ph--paper-plane-tilt--regular'
              label={t('send-feedback.label')}
              disabled={disabled || undefined}
            />
          </div>
          {onDiscord && (
            <>
              <div onClick={() => (actionRef.current = 'discord')}>
                <Form.Submit icon='ph--discord-logo--regular' label={t('ask-for-help.label')} />
              </div>
              {discordPresence && (discordPresence.teamOnline > 0 || discordPresence.communityOnline > 0) && (
                <p className='text-xs text-description text-center px-2'>
                  {[
                    discordPresence.teamOnline > 0 &&
                      t('discord-presence-team.label', { count: discordPresence.teamOnline }),
                    discordPresence.communityOnline > 0 &&
                      t('discord-presence-community.label', { count: discordPresence.communityOnline }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}{' '}
                  {t('discord-presence-online.label')}
                </p>
              )}
            </>
          )}
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
