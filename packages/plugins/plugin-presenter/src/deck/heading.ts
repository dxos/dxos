//
// Copyright 2026 DXOS.org
//

import { frontmatterTitle } from '@dxos/react-ui-slides/dialect';

const HEADING = /^#{1,6}[ \t]+(.+?)[ \t#]*$/;
const FENCE = /^[ \t]{0,3}(`{3,}|~{3,})/;

/** First markdown heading of the content, skipping fenced code blocks so `# comment` in code is not a title. */
export const firstHeading = (content: string): string | undefined => {
  let fence: string | undefined;
  for (const line of content.split('\n')) {
    const marker = line.match(FENCE)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) {
        fence = undefined;
      }
      continue;
    }
    if (marker) {
      fence = marker;
      continue;
    }
    const heading = line.match(HEADING)?.[1];
    if (heading) {
      return heading;
    }
  }
  return undefined;
};

/**
 * The title a slide's content gives it: the one its frontmatter states (`title: Roadmap`), else its first heading.
 * The frontmatter comes first so a slide whose first heading is not its name (a cover's product name, a card's
 * caption) can still say what it is called.
 */
export const contentTitle = (content: string): string | undefined => frontmatterTitle(content) ?? firstHeading(content);
