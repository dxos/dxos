//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';

import { type SlideSource, contentTitle } from '#deck';

/** A slide's caption: its title, else the title its content gives it (or the linked object's label). */
export const useSlideLabel = (source: SlideSource | undefined): string | undefined => {
  const [title] = useObject(!source || source.kind === 'markdown' ? undefined : source.slide, 'title');
  const [content] = useObject(source?.kind === 'text' ? source.text : undefined, 'content');
  if (title) {
    return title;
  }
  switch (source?.kind) {
    case 'text':
      return contentTitle(content ?? '');
    case 'markdown':
      return contentTitle(source.content);
    case 'object':
      return Obj.getLabel(source.object);
    default:
      return undefined;
  }
};
