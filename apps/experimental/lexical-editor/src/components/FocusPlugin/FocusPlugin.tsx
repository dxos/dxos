//
// Copyright 2022 DXOS.org
//

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FC, useEffect } from 'react';

import { Event } from '@dxos/async';

// TODO(burdon): Too narrow/specialized.
export const FocusPlugin: FC<{
  eventHandler: Event
}> = ({
  eventHandler
}) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.focus();
    return eventHandler.on(() => {
      console.log('FocusPlugin: focus');
      setTimeout(() => {
        editor.focus(); // TODO(burdon): Not working.
      });
    });
  }, [editor]);

  return null;
};
