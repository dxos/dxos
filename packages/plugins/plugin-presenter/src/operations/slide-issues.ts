//
// Copyright 2026 DXOS.org
//

import { parseSlide } from '#markdown';

/**
 * Problems in slides written by the assistant, one line each, so it can fix and retry; `first` numbers the slides as
 * the user sees them.
 */
export const slideIssues = (slides: readonly string[], first = 1): string[] =>
  slides.flatMap((content, index) =>
    content.trim() === ''
      ? [`Slide ${first + index} is empty.`]
      : parseSlide(content).issues.map((issue) => `Slide ${first + index}: ${issue.message}`),
  );
