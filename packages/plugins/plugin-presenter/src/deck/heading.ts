//
// Copyright 2026 DXOS.org
//

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
