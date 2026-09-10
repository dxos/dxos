//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { createElement } from 'react';

import { AnchorWidget } from './anchor';
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

export type GitHubLinksOptions = {
  /** Overrides the default chip's preview trigger. */
  trigger?: 'hover' | 'click';
  /** The inline widget for `[label](https://github.com/…/pull/123)`; the anchor chip by default. */
  link?: WidgetDef<GitHubLinkProps>;
};

/**
 * GitHub pull request and issue links as widgets. The worked example of `linkWidgets`: a matcher on
 * the URL's shape rather than its scheme, whose widget gets the parsed parts. The default anchor
 * chip carries the URL to the preview provider, whose lookup answers with the PR or issue.
 */
export const githubLinks = ({
  trigger,
  link = {
    factory: ({ label, url }) => new AnchorWidget(label, url, trigger),
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
