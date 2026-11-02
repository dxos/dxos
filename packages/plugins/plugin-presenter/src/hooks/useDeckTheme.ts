//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { useObject } from '@dxos/echo-react';

import { type SlideSource } from '#deck';
import { parseHeadmatterTheme } from '#markdown';
import { type SlideTheme } from '#types';

/**
 * A deck's theme: the given settings, falling back to the first slide's `theme:` headmatter for the base theme.
 */
export const useDeckTheme = (slides: SlideSource[], settings?: SlideTheme.Settings): SlideTheme.Settings => {
  const first = slides[0];
  const [textContent] = useObject(first?.kind === 'text' ? first.text : undefined, 'content');
  const content = first?.kind === 'markdown' ? first.content : textContent;
  const headmatter = useMemo(() => (content === undefined ? undefined : parseHeadmatterTheme(content)), [content]);
  return useMemo(() => ({ ...settings, base: settings?.base ?? headmatter }), [settings, headmatter]);
};
