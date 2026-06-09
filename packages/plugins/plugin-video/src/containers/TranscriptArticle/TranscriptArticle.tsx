//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Menu } from '@dxos/react-ui-menu';
import { Tabs } from '@dxos/react-ui-tabs';

import { Transcript } from '#components';
import { meta } from '#meta';
import { Video } from '#types';

export type TranscriptArticleProps = AppSurface.ObjectArticleProps<Video.Video>;

export const TranscriptArticle = ({ role, attendableId, subject }: TranscriptArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [view, setView] = useState('transcript');
  const [video] = useObject(subject);
  const uri = Obj.getURI(subject);

  // Set the selection point on the shared attention context; VideoArticle observes it and moves
  // the player to the corresponding offset (the selection id is the seconds offset).
  const handleSeek = useCallback(
    (seconds: number) => {
      void invokePromise(LayoutOperation.Select, {
        contextId: attendableId,
        subject: { mode: 'single', id: String(Math.max(0, Math.floor(seconds))) },
      });
    },
    [attendableId, invokePromise],
  );

  return (
    <Menu.Root>
      <Tabs.Root orientation='horizontal' value={view} attendableId={attendableId} onValueChange={setView}>
        <Panel.Root role={role}>
          <Panel.Toolbar>
            <Toolbar.Root>
              <Tabs.Tablist classNames='p-0'>
                <Tabs.Tab value='transcript'>{t('transcript.tab.label')}</Tabs.Tab>
                <Tabs.Tab value='summary'>{t('summary.tab.label')}</Tabs.Tab>
              </Tabs.Tablist>
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content>
            <Tabs.Viewport classNames='dx-container grid grid-rows-[auto_1fr]'>
              <Tabs.Panel asChild value='transcript' tabIndex={-1}>
                <Transcript id={`${uri}/transcript`} source={video.transcript} onSeek={handleSeek} />
              </Tabs.Panel>
              <Tabs.Panel asChild value='summary' tabIndex={-1}>
                <Transcript id={`${uri}/summary`} source={video.summary} />
              </Tabs.Panel>
            </Tabs.Viewport>
          </Panel.Content>
        </Panel.Root>
      </Tabs.Root>
    </Menu.Root>
  );
};

export default TranscriptArticle;
