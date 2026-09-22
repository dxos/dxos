//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { createElement } from 'react';

import { AnchorWidget, type LinkWidgetProps, type WidgetDef, linkWidgets, matchPattern } from '@dxos/ui-editor';

import { GITHUB_LINK, type GitHubLink, parseGitHubLink } from '../github-link.ts';

export * from '../github-link.ts';

/** A link widget's props, with the URL's parts alongside it. */
export type GitHubLinkProps<TContext = any> = LinkWidgetProps<TContext> & GitHubLink;

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
