//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { createElement } from 'react';

import { AnchorWidget, type LinkWidgetProps, type WidgetDef, linkWidgets, matchPattern } from '@dxos/ui-editor';

/**
 * `https://github.com/owner/repo`, `/pull/123` or `/issues/123`, with an optional trailing slash,
 * fragment or query. A path below the repository (`/blob/…`, `/actions`) is a page, not an object.
 */
const GITHUB_LINK =
  /^https:\/\/github\.com\/([^/\s?#]+)\/([^/\s?#]+)(?:\/(pull|issues)\/(\d+)(?:[/?#]\S*)?|\/?(?:[?#]\S*)?)$/;

export type GitHubLink = {
  owner: string;
  repo: string;
  kind: 'repo' | 'pull' | 'issue';
  /** Absent for a repository. */
  number?: number;
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
  if (!kind) {
    return { owner, repo, kind: 'repo', url };
  }
  return { owner, repo, kind: kind === 'pull' ? 'pull' : 'issue', number: Number(number), url };
};

/** The chip's leading icon for a pull request, in GitHub's open-state green. */
export const PULL_REQUEST_ICON = { icon: 'ph--git-pull-request--regular', classNames: 'text-green-500' };

/** The chip icon for a GitHub URL: a pull request's; none for an issue or a repository. */
export const githubLinkIcon = (url: string): typeof PULL_REQUEST_ICON | undefined =>
  parseGitHubLink(url)?.kind === 'pull' ? PULL_REQUEST_ICON : undefined;

export type GitHubLinksOptions = {
  /** Overrides the default chip's preview trigger. */
  trigger?: 'hover' | 'click';
  /** The inline widget for `[label](https://github.com/…/pull/123)`; the anchor chip by default. */
  link?: WidgetDef<GitHubLinkProps>;
};

/**
 * GitHub pull request and issue links as widgets: a `linkWidgets` matcher on the URL's shape rather
 * than its scheme, whose widget gets the parsed parts. The default anchor chip carries the URL to
 * the preview popover, where this plugin's link resolver answers with the pull request or issue.
 * Contributed through `MarkdownCapabilities.ExtensionProvider` rather than built into the editor.
 */
export const githubLinks = ({
  trigger,
  link = {
    factory: ({ label, url, kind }) =>
      new AnchorWidget(label, url, trigger, undefined, kind === 'pull' ? PULL_REQUEST_ICON : undefined),
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

/**
 * `owner/repo#123` — how a pull request is written where a URL would be noise, and the one form a
 * reviewer can type from memory.
 */
const PULL_REQUEST_SHORTHAND = /^([\w.-]+)\/([\w.-]+)#(\d+)$/;

/** A pull request named by its coordinates, however the user wrote it. */
export type PullRequestReference = {
  owner: string;
  repo: string;
  number: number;
};

/**
 * The pull request a user's text names: a github.com URL or `owner/repo#123`.
 *
 * An `/issues/123` URL is accepted alongside `/pull/123` because GitHub itself serves a pull
 * request under both, and a reader who copied the wrong one still means the same change.
 */
export const parsePullRequestReference = (value: string): PullRequestReference | undefined => {
  const text = value.trim();
  const shorthand = PULL_REQUEST_SHORTHAND.exec(text);
  if (shorthand) {
    const [, owner, repo, number] = shorthand;
    return { owner, repo, number: Number(number) };
  }

  const link = parseGitHubLink(text);
  if (!link || link.number === undefined) {
    return undefined;
  }
  return { owner: link.owner, repo: link.repo, number: link.number };
};
