//
// Copyright 2026 DXOS.org
//

// Review-store helpers: slug derivation, and read/write of REVIEW.md frontmatter.
// REVIEW.md frontmatter is a flat scalar block, so a small serializer suffices.

import { readFileSync } from 'node:fs';

import { parseFrontmatter } from './frontmatter.mjs';

export const REVIEWS_DIR = '.agents/reviews';

/**
 * Derive a review slug from a branch name and short commit: the branch with any
 * `claude/` prefix removed, slashes flattened, suffixed with the short sha.
 */
export const reviewSlug = (branch, short) => {
  const base = branch.replace(/^claude\//, '').replace(/[^A-Za-z0-9._-]+/g, '-');
  return `${base}-${short}`;
};

/** Serialize a flat object into a REVIEW.md frontmatter block. */
export const renderFrontmatter = (data) => {
  const lines = Object.entries(data)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join('\n')}\n---\n`;
};

/** Read a REVIEW.md file into `{ data, body }`; returns null if unreadable. */
export const readReview = (path) => {
  try {
    return parseFrontmatter(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};
