//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu/next';
import { Next } from '@dxos/react-ui/next';
import { Video } from '@dxos/types';

import { meta } from '#meta';
import { VideoOperation } from '#types';

export type VideoArticleProps = AppSurface.ObjectArticleProps<Video.Video>;

/**
 * Composes the video layout from three independent surfaces (player, transcript, summary).
 * Each part lives in its own surface so the cross-origin player iframe and the CodeMirror editors never share a
 * component/prop graph.
 * The transcript/summary are shown in a tab panel below the player on large form factors.
 */
export const VideoArticle = ({ role, attendableId, subject }: VideoArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const [video] = useObject(subject);
  const [tab, setTab] = useState('transcript');
  const [summarizing, setSummarizing] = useState(false);
  // Resolve the transcript so summary regeneration can be gated on it actually having content.
  useObject(subject.transcript);
  const hasTranscript = (subject.transcript?.target?.content?.trim().length ?? 0) > 0;

  const handleOpenOriginal = useCallback(() => {
    if (isExternalHttpUrl(video.url)) {
      window.open(video.url, '_blank', 'noopener,noreferrer');
    }
  }, [video.url]);

  // Auto-populate the description from the source page when empty (scraped via the FetchDescription
  // op). `running` guards re-entrancy across the async gap before the reactive `video.description`
  // field updates; on failure the deps are unchanged so it does not retry in a loop.
  const fetchingDescriptionRef = useRef(false);
  useEffect(() => {
    if (!invokePromise || !video.url || video.description?.trim() || fetchingDescriptionRef.current) {
      return;
    }
    fetchingDescriptionRef.current = true;
    void invokePromise(
      VideoOperation.FetchDescription,
      { video: Ref.make(subject) },
      {
        spaceId: Obj.getDatabase(subject)?.spaceId,
        notify: { error: ['fetch-description-error.message', { ns: meta.profile.key }] },
      },
    ).finally(() => {
      fetchingDescriptionRef.current = false;
    });
  }, [invokePromise, subject, video.url, video.description]);

  // Manual summary regeneration (the summary surface generates it automatically when first missing).
  const handleRegenerate = useCallback(() => {
    if (!invokePromise || !hasTranscript) {
      return;
    }
    setSummarizing(true);
    void invokePromise(
      VideoOperation.Summarize,
      { video: Ref.make(subject) },
      {
        spaceId: Obj.getDatabase(subject)?.spaceId,
        notify: { error: ['summarize-error.message', { ns: meta.profile.key }] },
      },
    ).finally(() => setSummarizing(false));
  }, [invokePromise, subject, hasTranscript]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'openOriginal',
          {
            label: ['open-original.label', { ns: meta.profile.key }],
            icon: 'ph--arrow-square-out--regular',
            disabled: !isExternalHttpUrl(video.url),
            disposition: 'toolbar',
            testId: 'video.toolbar.open-original',
          },
          () => handleOpenOriginal(),
        )
        .build(),
    [video.url, handleOpenOriginal],
  );

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Next.Panel.Header>
      <Next.Panel.Body classNames='grid grid-rows-[auto_1fr]'>
        <Surface.Surface
          type={AppSurface.Section}
          data={{
            subject,
            attendableId,
            part: 'player',
          }}
          limit={1}
        />
        <TranscriptTabs
          attendableId={attendableId}
          subject={subject}
          role={role}
          tab={tab}
          onTabChange={setTab}
          onRegenerate={handleRegenerate}
          isRegenerateDisabled={!hasTranscript || summarizing}
          isSummarizing={summarizing}
        />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

const isExternalHttpUrl = (value?: string): boolean => {
  try {
    const { protocol } = new URL(value ?? '');
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
};

type TranscriptTabsProps = {
  attendableId: string;
  subject: Video.Video;
  role: string | undefined;
  tab: string;
  isRegenerateDisabled: boolean;
  isSummarizing: boolean;
  onTabChange: (tab: string) => void;
  onRegenerate: () => void;
};

const TranscriptTabs = ({
  attendableId,
  subject,
  role,
  tab,
  isRegenerateDisabled,
  isSummarizing,
  onTabChange,
  onRegenerate,
}: TranscriptTabsProps) => {
  const { t } = useTranslation(meta.profile.key);
  // The selected tab reads as primary while this article has attention.
  const { hasAttention } = useAttention(attendableId);

  // The tablist only needs the `Tabs.Root` context, which wraps the whole panel.
  const tabs = useMemo(
    () => (
      <Next.Tabs.List>
        <Next.Tabs.Trigger value='transcript'>{t('transcript.tab.label')}</Next.Tabs.Trigger>
        <Next.Tabs.Trigger value='summary'>{t('summary.tab.label')}</Next.Tabs.Trigger>
      </Next.Tabs.List>
    ),
    [t],
  );

  // Tabs first, then a growing gap, then the regenerate action: rendered through the same graph
  // (rather than as `ActionToolbar`'s `children`) so DOM/focus order matches the visual left-to-right
  // order — `ActionToolbar` always renders its graph items before its children slot. `disabled`/`spin`
  // on `regenerate` are read off the action's own properties (the same model `ActionToolbarItem`
  // renders elsewhere) rather than wired by hand, so this toolbar composes the same way the outer one does.
  const regenerateActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'tabs',
          { variant: 'custom', label: ['transcript.tab.label', { ns: meta.profile.key }], render: () => tabs },
          () => {},
        )
        .separator()
        .action(
          'regenerate',
          {
            label: ['regenerate.label', { ns: meta.profile.key }],
            icon: 'ph--arrows-clockwise--regular',
            disposition: 'toolbar',
            hidden: tab !== 'summary',
            disabled: isRegenerateDisabled,
            spin: isSummarizing,
            testId: 'video.toolbar.regenerate',
          },
          () => onRegenerate(),
        )
        .build(),
    [tabs, tab, isRegenerateDisabled, isSummarizing, onRegenerate],
  );

  return (
    <Next.Panel.Root asChild role={role}>
      <Next.Tabs.Root
        orientation='horizontal'
        value={tab}
        selectedVariant={hasAttention ? 'primary' : 'default'}
        onValueChange={onTabChange}
      >
        <Next.Panel.Header>
          {/* `alwaysActive`: the tablist is navigation, not an attention-gated action, and `disabled`
              would otherwise cascade `*:opacity-20` onto it as a direct child of the toolbar root. */}
          <ActionToolbar {...regenerateActions} attendableId={attendableId} alwaysActive />
        </Next.Panel.Header>
        <Next.Panel.Body>
          <Next.Tabs.Content value='transcript' tabIndex={-1} classNames='overflow-hidden'>
            <Surface.Surface
              type={AppSurface.Tabpanel}
              data={{ subject, attendableId, part: 'transcript' }}
              limit={1}
            />
          </Next.Tabs.Content>
          <Next.Tabs.Content value='summary' tabIndex={-1} classNames='overflow-hidden'>
            <Surface.Surface type={AppSurface.Tabpanel} data={{ subject, attendableId, part: 'summary' }} limit={1} />
          </Next.Tabs.Content>
        </Next.Panel.Body>
      </Next.Tabs.Root>
    </Next.Panel.Root>
  );
};

VideoArticle.displayName = 'VideoArticle';
