//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { WidgetType } from '@codemirror/view';

import { type LinkWidgetProps, linkWidgets, matchPattern } from '@dxos/ui-editor';

/** `https://github.com/owner/repo/pull/123` or `/issues/123`, with an optional fragment or query. */
const GITHUB_LINK = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/(pull|issues)\/(\d+)(?:[/?#].*)?$/;

export type GitHubLink = {
  owner: string;
  repo: string;
  kind: 'pull' | 'issue';
  number: number;
  url: string;
};

/** The parts of a pull request or issue URL, or undefined for any other URL. */
export const parseGitHubLink = (url: string): GitHubLink | undefined => {
  const match = GITHUB_LINK.exec(url);
  if (!match) {
    return undefined;
  }
  const [, owner, repo, kind, number] = match;
  return { owner, repo, kind: kind === 'pull' ? 'pull' : 'issue', number: Number(number), url };
};

/**
 * A pull request or issue link as a chip: `owner/repo#123` with the kind's icon, opening on GitHub.
 * A native widget so the chip renders synchronously from the URL alone, with no portal.
 */
export class GitHubLinkWidget extends WidgetType {
  constructor(readonly link: GitHubLink) {
    super();
  }

  override eq(other: this): boolean {
    return other instanceof GitHubLinkWidget && other.link.url === this.link.url;
  }

  override toDOM(): HTMLElement {
    const { owner, repo, kind, number, url } = this.link;
    const anchor = document.createElement('a');
    anchor.className = 'dx-tag dx-tag--anchor';
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.dataset.github = kind;
    const icon = document.createElement('dx-icon');
    icon.setAttribute('icon', kind === 'pull' ? 'ph--git-pull-request--regular' : 'ph--circle-dot--regular');
    anchor.append(icon, `${owner}/${repo}#${number}`);
    return anchor;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

/**
 * Renders GitHub pull request and issue links as chips. The worked example of `linkWidgets`: a
 * matcher on the URL's shape rather than its scheme, with a widget that needs no object behind it.
 */
export const githubLinks = (): Extension =>
  linkWidgets({
    match: matchPattern(GITHUB_LINK),
    link: {
      factory: ({ url }: LinkWidgetProps) => {
        const link = parseGitHubLink(url);
        return link ? new GitHubLinkWidget(link) : null;
      },
    },
  });
