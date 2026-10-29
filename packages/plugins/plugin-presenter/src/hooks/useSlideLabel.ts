//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';

import { type SlideSource, firstHeading } from '#deck';

/** A slide's caption: its title, else its first heading (or the linked object's label). */
export const useSlideLabel = (source: SlideSource | undefined): string | undefined => {
  const [title] = useObject(!source || source.kind === 'markdown' ? undefined : source.slide, 'title');
  const [content] = useObject(source?.kind === 'text' ? source.text : undefined, 'content');
  if (title) {
    return title;
  }
  switch (source?.kind) {
    case 'text':
      return firstHeading(content ?? '');
    case 'markdown':
      return firstHeading(source.content);
    case 'object':
      return Obj.getLabel(source.object);
    default:
      return undefined;
  }
};
