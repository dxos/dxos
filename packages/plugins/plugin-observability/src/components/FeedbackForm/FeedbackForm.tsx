//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form, type FormRootProps, type FormSubmitProps } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { UserFeedback } from '#operations';

export type FeedbackFormProps = Pick<FormRootProps<UserFeedback>, 'onSave'> &
  Pick<FormSubmitProps, 'disabled'> & {
    /** Optional handler — when supplied a "Download logs" button is rendered below the submit action. */
    onDownloadLogs?: () => void | Promise<void>;
  };

const defaultValues: UserFeedback = {
  message: '',
  includeLogs: true,
};

export const FeedbackForm = ({ onSave, disabled, onDownloadLogs }: FeedbackFormProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <Form.Root schema={UserFeedback} defaultValues={defaultValues} onSave={onSave}>
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet />
          <Form.Submit icon='ph--paper-plane-tilt--regular' label={t('send-feedback.label')} disabled={disabled} />
          {onDownloadLogs && (
            <div role='none' className='flex w-full pt-form-padding'>
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
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
