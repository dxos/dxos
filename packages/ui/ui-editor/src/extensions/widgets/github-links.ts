//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { WidgetType } from '@codemirror/view';
import { createElement } from 'react';

import { type LinkWidgetProps, linkWidgets, matchPattern } from './link-widgets';
import { type WidgetDef } from './widgets';

/** `https://github.com/owner/repo/pull/123` or `/issues/123`, with an optional fragment or query. */
const GITHUB_LINK = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/(pull|issues)\/(\d+)(?:[/?#].*)?$/;

export type GitHubLink = {
  owner: string;
  repo: string;
  kind: 'pull' | 'issue';
  number: number;
  url: string;
};

/** A link widget's props, with the URL's parts alongside it. */
export type GitHubLinkProps<TContext = any> = LinkWidgetProps<TContext> & GitHubLink;

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

export type GitHubLinksOptions = {
  /** The inline widget for `[label](https://github.com/…/pull/123)`; the plain chip by default. */
  link?: WidgetDef<GitHubLinkProps>;
};

/**
 * GitHub pull request and issue links as widgets. The worked example of `linkWidgets`: a matcher on
 * the URL's shape rather than its scheme, whose widget gets the parsed parts and needs no object
 * behind it — a host wanting a preview card swaps in an anchor chip as the `link`.
 */
export const githubLinks = ({
  link = {
    factory: (props) => new GitHubLinkWidget(props),
  },
}: GitHubLinksOptions = {}): Extension =>
  linkWidgets({
    match: matchPattern(GITHUB_LINK),
    link: withGitHubLink(link),
  });

/** The definition over link props, with the URL parsed into the parts the GitHub-side code reads. */
const withGitHubLink = (def: WidgetDef<GitHubLinkProps>): WidgetDef<LinkWidgetProps> => {
  const { factory, Component, estimatedHeight, ...rest } = def;
  const githubProps = (props: LinkWidgetProps): GitHubLinkProps | undefined => {
    const link = parseGitHubLink(props.url);
    return link && { ...props, ...link };
  };
  return {
    ...rest,
    ...(factory && {
      factory: (props) => {
        const parsed = githubProps(props);
        return parsed ? factory(parsed) : null;
      },
    }),
    ...(Component && {
      Component: (props) => {
        const parsed = githubProps(props);
        return parsed ? createElement(Component, parsed) : null;
      },
    }),
    ...(estimatedHeight && {
      estimatedHeight: (props) => {
        const parsed = githubProps(props);
        return parsed ? estimatedHeight(parsed) : 0;
      },
    }),
  };
};
