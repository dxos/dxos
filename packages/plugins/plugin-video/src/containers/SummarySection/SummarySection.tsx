//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';

import { Pending } from '#components';
import { meta } from '#meta';
import { Video, VideoOperation } from '#types';

// TODO(burdon): Use AppSurface.Section.
export type SummarySectionProps = {
  subject: Video.Video;
  attendableId: string;
};

/**
 * Section/tabpanel surface that renders the summary via the markdown editable surface, or a pending
 * indicator while it is generated. The summary is generated on demand once a transcript exists.
 */
export const SummarySection = ({ attendableId, subject }: SummarySectionProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [video] = useObject(subject);
  // Resolve the summary's target so the editable markdown surface receives the live Text object once
  // the ref loads (and re-renders when the summary is first generated).
  useObject(subject.summary);
  const summary = subject.summary?.target;

  // Auto-generate the summary once a transcript exists. The `running` ref guards against re-entrancy
  // across the async gap before the reactive `video.summary` field updates.
  const runningRef = useRef(false);
  useEffect(() => {
    if (!video.transcript || video.summary || runningRef.current || !invokePromise) {
      return;
    }
    runningRef.current = true;
    void invokePromise(
      VideoOperation.Summarize,
      {
        video: Ref.make(subject),
      },
      {
        spaceId: Obj.getDatabase(subject)?.spaceId,
        notify: { error: ['summarize-error.message', { ns: meta.id }] },
      },
    ).finally(() => {
      runningRef.current = false;
    });
  }, [video.transcript, video.summary, invokePromise, subject]);

  if (!summary) {
    return <Pending label={t('summarizing.pending.label')} />;
  }

  return <Surface.Surface role='tabpanel' data={{ subject: summary, attendableId }} limit={1} />;
};
