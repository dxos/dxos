//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, { useRef } from 'react';

import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { ScrollContainer, type ScrollController } from '@dxos/react-ui-components';

import { Timeline } from '../../components';
import { useExecutionGraph } from '../../hooks';
import { meta } from '../../meta';
import { Assistant } from '../../types';

import { type ComponentProps } from './types';

export const LoggingContainer = ({ space }: ComponentProps) => {
  const { t } = useTranslation(meta.id);
  const [chat] = useQuery(space, Filter.type(Assistant.Chat));
  const { branches, commits } = useExecutionGraph(chat?.traceQueue);
  const scrollerRef = useRef<ScrollController>(null);

  return (
    <div className='flex flex-col h-full'>
      <Toolbar.Root classNames='density-coarse border-b border-subduedSeparator'>
        <Toolbar.IconButton
          icon='ph--arrow-down--regular'
          iconOnly
          label={t('button scroll down')}
          onClick={() => scrollerRef.current?.scrollToBottom()}
        />
      </Toolbar.Root>
      <ScrollContainer ref={scrollerRef}>
        <Timeline branches={branches} commits={commits} />
      </ScrollContainer>
    </div>
  );
};
