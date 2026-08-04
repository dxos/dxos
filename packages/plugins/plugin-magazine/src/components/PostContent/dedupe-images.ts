//
// Copyright 2026 DXOS.org
//

// Kept out of `PostContent.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/**
 * Strips images from a markdown string whose URL is already on the
 * `excluded` list, AND drops any image that appears more than once. The
 * hero `post.imageUrl` is added to `excluded` by the caller so the
 * extracted article body doesn't re-render the same image immediately
 * below the hero. Captures both Markdown image syntax (`![alt](url
 * "title")`) and inline HTML `<img>` tags that defuddle sometimes
 * leaves behind.
 */
export const dedupeImagesInMarkdown = (markdown: string, excluded: ReadonlyArray<string | undefined>): string => {
  const seen = new Set<string>();
  for (const url of excluded) {
    if (url) {
      seen.add(url);
    }
  }

  // Markdown image: `![alt](url)` or `![alt](url "title")`.
  const markdownImg = /!\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
  // HTML image: `<img ... src="url" ...>`.
  const htmlImg = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

  const dedupe = (input: string, regex: RegExp): string =>
    input.replace(regex, (match, url) => {
      if (typeof url !== 'string') {
        return match;
      }
      if (seen.has(url)) {
        return '';
      }
      seen.add(url);
      return match;
    });

  return dedupe(dedupe(markdown, markdownImg), htmlImg);
};

/** Returns true if the markdown contains at least one Markdown or inline HTML image. */
export const contentHasImage = (markdown: string): boolean =>
  /!\[[^\]]*\]\(\s*[^)\s]+/.test(markdown) || /<img\b[^>]*\bsrc=["'][^"']+["']/i.test(markdown);
