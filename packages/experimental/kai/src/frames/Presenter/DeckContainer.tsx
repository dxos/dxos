//
// Copyright 2022 DXOS.org
//

import React, { FC, useCallback, useEffect, useState } from 'react';

import { Text } from '@dxos/echo-schema';
import { Presentation } from '@dxos/kai-types';
import { useSubscription } from '@dxos/react-client';
import { TextKind } from '@dxos/react-composer';

import { Deck, DeckProps } from '../../components';
import { useAppReducer, useAppState } from '../../hooks';

export const DeckContainer: FC<{ presentation: Presentation } & Pick<DeckProps, 'slide' | 'onSlideChange'>> = ({
  presentation,
  ...rest
}) => {
  const { fullscreen } = useAppState();
  const { setFullscreen } = useAppReducer();
  const [content, setContent] = useState<string[]>([]);

  const handleUpdate = useCallback(() => {
    const texts = presentation.stack.sections
      .map((section) => section.object)
      .map((document) => {
        return document.content?.kind === TextKind.PLAIN ? document.content : undefined;
      })
      .filter(Boolean) as Text[];

    setContent(texts.map((text) => text.content!.toString()) ?? []);
  }, [presentation]);

  // First time.
  useEffect(handleUpdate, []);

  // Get update if stack sections updated.
  useSubscription(handleUpdate, [presentation.stack]);

  // Get update if any text content changed.
  // TODO(burdon): This seems unnecessary?
  useSubscription(handleUpdate, [presentation.stack.sections.map((section) => section.object.content)]);

  return <Deck slides={content} fullscreen={fullscreen} onToggleFullscreen={setFullscreen} {...rest} />;
};
