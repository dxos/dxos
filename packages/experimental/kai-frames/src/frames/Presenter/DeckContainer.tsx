//
// Copyright 2022 DXOS.org
//

import React, { type FC, useCallback, useEffect, useState } from 'react';

import { type Presentation } from '@dxos/kai-types';
import { type TextObject, TextKind, useSubscription } from '@dxos/react-client/echo';

import { Deck, type DeckProps } from '../../components';
import { useFrameRouter, useFrameContext } from '../../hooks';

export const DeckContainer: FC<{ presentation: Presentation } & Pick<DeckProps, 'slide' | 'onSlideChange'>> = ({
  presentation,
  ...rest
}) => {
  const router = useFrameRouter();
  const { fullscreen } = useFrameContext();
  const [content, setContent] = useState<string[]>([]);

  const handleUpdate = useCallback(() => {
    const texts = presentation.stack.sections
      .map((section) => section.object)
      .map((document) => {
        return document.content?.kind === TextKind.PLAIN ? document.content : undefined;
      })
      .filter(Boolean) as TextObject[];

    setContent(texts.map((text) => text.content!.toString()) ?? []);
  }, [presentation]);

  const handleToggleFullscreen = (fullscreen: boolean) => {
    router({ fullscreen });
  };

  // First time.
  useEffect(handleUpdate, []);

  // Get update if stack sections updated.
  // TODO(wittjosiah): Remove?
  useSubscription(handleUpdate, [presentation.stack]);

  // Get update if any text content changed.
  // TODO(burdon): This seems unnecessary?
  // TODO(wittjosiah): Remove?
  useSubscription(handleUpdate, [presentation.stack.sections.map((section) => section.object.content)]);

  return <Deck slides={content} fullscreen={fullscreen} onToggleFullscreen={handleToggleFullscreen} {...rest} />;
};
