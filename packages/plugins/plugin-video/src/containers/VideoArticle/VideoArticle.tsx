//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Tabs } from '@dxos/react-ui-tabs';

import { meta } from '#meta';
import { Video, VideoOperation } from '#types';

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
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
        <Panel.Content classNames='grid grid-rows-[auto_1fr]'>
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
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
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
  return (
    <Panel.Root asChild role={role}>
      <Tabs.Root orientation='horizontal' value={tab} attendableId={attendableId} onValueChange={onTabChange}>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Tabs.Tablist classNames='p-0'>
              <Tabs.Tab value='transcript'>{t('transcript.tab.label')}</Tabs.Tab>
              <Tabs.Tab value='summary'>{t('summary.tab.label')}</Tabs.Tab>
            </Tabs.Tablist>
            {tab === 'summary' && (
              <IconButton
                iconOnly
                variant='ghost'
                icon='ph--arrows-clockwise--regular'
                label={t('regenerate.label')}
                disabled={isRegenerateDisabled}
                iconClassNames={isSummarizing ? 'animate-spin' : undefined}
                classNames='ml-auto'
                onClick={onRegenerate}
              />
            )}
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content>
          <Tabs.Viewport classNames='dx-container grid grid-rows-[auto_1fr]'>
            <Tabs.Panel value='transcript' tabIndex={-1} classNames='overflow-hidden'>
              <Surface.Surface
                type={AppSurface.Tabpanel}
                data={{ subject, attendableId, part: 'transcript' }}
                limit={1}
              />
            </Tabs.Panel>
            <Tabs.Panel value='summary' tabIndex={-1} classNames='overflow-hidden'>
              <Surface.Surface type={AppSurface.Tabpanel} data={{ subject, attendableId, part: 'summary' }} limit={1} />
            </Tabs.Panel>
          </Tabs.Viewport>
        </Panel.Content>
      </Tabs.Root>
    </Panel.Root>
  );
};
