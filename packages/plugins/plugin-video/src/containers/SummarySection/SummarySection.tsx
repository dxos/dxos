//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';

import { Pending, Summary } from '#components';
import { meta } from '#meta';
import { Video, VideoOperation } from '#types';

// TODO(burdon): Use AppSurface.Section.
export type SummarySectionProps = {
  subject: Video.Video;
  attendableId: string;
};

/**
 * Section/tabpanel surface that renders the editable {@link Summary}, or a pending indicator while it
 * is generated. The summary is generated on demand once a transcript exists.
 *
 * Renders the editor via the local {@link Summary} component (not a generic Surface) so the
 * CodeMirror `EditorView` is never carried in a React prop — see {@link Summary} for why that crashes
 * alongside the cross-origin player iframe.
 */
export const SummarySection = ({ subject }: SummarySectionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const [video] = useObject(subject);
  const uri = Obj.getURI(subject);
  // Resolve the summary's target so we know whether to show the editor or the pending state.
  useObject(subject.summary);
  const summary = subject.summary?.target;
  // Resolve the transcript so we can gate summary generation on it actually having content (an empty
  // transcript would make Summarize throw "Transcript is empty").
  useObject(subject.transcript);
  const hasTranscript = (subject.transcript?.target?.content?.trim().length ?? 0) > 0;

  // Auto-generate the summary once a non-empty transcript exists. The `running` ref guards against
  // re-entrancy across the async gap before the reactive `video.summary` field updates.
  const runningRef = useRef(false);
  useEffect(() => {
    if (!hasTranscript || video.summary || runningRef.current || !invokePromise) {
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
        notify: { error: ['summarize-error.message', { ns: meta.profile.key }] },
      },
    ).finally(() => {
      runningRef.current = false;
    });
  }, [hasTranscript, video.summary, invokePromise, subject]);

  if (!summary) {
    // Don't imply generation is underway when there is no transcript to summarize.
    return <Pending label={t(hasTranscript ? 'summarizing.pending.label' : 'no-transcript.pending.label')} />;
  }

  return <Summary id={`${uri}/summary`} source={subject.summary} />;
};

SummarySection.displayName = 'SummarySection';
