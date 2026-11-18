//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as ToolkitResetDialog from '@dxos/app-toolkit/ResetDialog';
import { type IdbLogStore } from '@dxos/log-store-idb';
import * as FeedbackForm from '@dxos/plugin-support/FeedbackForm';
import type * as SupportOperation from '@dxos/plugin-support/SupportOperation';
import { Form } from '@dxos/react-ui-form';
import * as Hooks from '@dxos/react-ui/Hooks';

import { RECOVERY_PATH, composerLogFileName, exportManualLogDownload, setSafeModeUrl } from '../../util/index.ts';

export type ResetDialogProps = Omit<
  ToolkitResetDialog.RootProps<SupportOperation.SupportRequest>,
  'onSafeMode' | 'onRecovery' | 'onDownloadLogs' | 'feedback'
> & {
  logStore: IdbLogStore;
  /** Files the report. Absent when nothing can file one, which hides the feedback affordance. */
  onSubmitReport?: (report: SupportOperation.SupportRequest) => Promise<void>;
};

/** The shared reset dialog with Composer's safe mode, recovery page, log download and crash report. */
export const ResetDialog = ({ logStore, onSubmitReport, ...props }: ResetDialogProps) => {
  const download = Hooks.useFileDownload();

  const handleDownloadLogs = useCallback(async () => {
    const file = await exportManualLogDownload(logStore);
    download(file, composerLogFileName());
  }, [download, logStore]);

  const handleSafeMode = useCallback(() => {
    window.location.href = setSafeModeUrl(true);
  }, []);

  const handleRecovery = useCallback(() => {
    window.location.href = RECOVERY_PATH;
  }, []);

  const feedback = useMemo<ToolkitResetDialog.Feedback<SupportOperation.SupportRequest> | undefined>(
    () =>
      onSubmitReport && {
        submit: onSubmitReport,
        render: (onSubmit) => (
          <FeedbackForm.Root onSubmit={onSubmit}>
            <Form.Viewport>
              <Form.Content>
                <Form.Fields />
                <FeedbackForm.Submit />
              </Form.Content>
            </Form.Viewport>
          </FeedbackForm.Root>
        ),
      },
    [onSubmitReport],
  );

  return (
    <ToolkitResetDialog.Root
      {...props}
      onSafeMode={handleSafeMode}
      onRecovery={handleRecovery}
      onDownloadLogs={handleDownloadLogs}
      feedback={feedback}
    />
  );
};
