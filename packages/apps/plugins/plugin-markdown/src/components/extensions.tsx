//
// Copyright 2023 DXOS.org
//

import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { type AnchorHTMLAttributes, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThreadAction } from '@braneframe/plugin-thread';
import { Document as DocumentType, Thread as ThreadType } from '@braneframe/types';
import { useIntent, type DispatchIntent, LayoutAction } from '@dxos/app-framework';
import { type Space } from '@dxos/react-client/echo';
import {
  type AutocompleteOptions,
  type CommentsOptions,
  type Extension,
  type ListenerOptions,
  type TooltipOptions,
  autocomplete,
  comments,
  image,
  link,
  listener,
  table,
  tasklist,
  tooltip,
  typewriter,
  type AutocompleteResult,
} from '@dxos/react-ui-editor';
import { getSize, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

// TODO(burdon): Factor out style.
const hover = 'rounded-sm text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200';

const onRender = (dispatch: DispatchIntent) => (el: Element, url: string) => {
  // TODO(burdon): Dispatch if local link.
  const options: AnchorHTMLAttributes<any> = url.startsWith('/')
    ? {
        onClick: () => {
          void dispatch({
            action: LayoutAction.ACTIVATE,
            data: { id: url.slice(1) },
          });
        },
      }
    : {
        href: url,
        rel: 'noreferrer',
        target: '_blank',
      };

  createRoot(el).render(
    <StrictMode>
      <a {...options} className={hover}>
        <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1 cursor-pointer')} />
      </a>
    </StrictMode>,
  );
};

export const onHover: TooltipOptions['onHover'] = (el, url) => {
  const web = new URL(url);
  createRoot(el).render(
    <StrictMode>
      <a href={url} target='_blank' rel='noreferrer' className={hover}>
        {web.origin}
        <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1 cursor-pointer')} />
      </a>
    </StrictMode>,
  );
};

// TODO(burdon): Make markdown plugins separately configurable.
export type UseExtensionsOptions = {
  debug?: boolean;
  experimental?: boolean;
  listener?: ListenerOptions;
  autocomplete?: AutocompleteOptions;
  comments?: CommentsOptions;
};

export const useExtensions = ({
  debug,
  experimental,
  listener: listenerOption,
  autocomplete: autocompleteOption,
  comments: commentsOptions,
}: UseExtensionsOptions = {}): Extension[] => {
  const { dispatch } = useIntent();
  const extensions: Extension[] = [
    image(),
    link({ onRender: onRender(dispatch) }),
    table(),
    tasklist(),
    tooltip({ onHover }),
    autocompleteOption && autocomplete(autocompleteOption),
    commentsOptions && comments(commentsOptions),
    listenerOption && listener(listenerOption),
  ].filter(nonNullable);

  if (debug) {
    const items = localStorage.getItem('dxos.composer.extension.demo');
    extensions.push(...[items ? typewriter({ items: items!.split(',') }) : undefined].filter(nonNullable));
  }

  if (experimental) {
    extensions.push(...[].filter(nonNullable));
  }

  return extensions;
};

export type GetExtensionConfigOptions = {
  space?: Space;
  document?: DocumentType;
  debug?: boolean;
  experimental?: boolean;
  dispatch?: DispatchIntent;
  onChange?: (text: string) => void;
};

// TODO(burdon): Factor out space dependency.
export const getExtensionsConfig = ({
  space,
  document,
  debug,
  experimental,
  dispatch,
  onChange,
}: GetExtensionConfigOptions): UseExtensionsOptions => ({
  debug,
  experimental,
  listener: onChange ? { onChange } : undefined,
  autocomplete: space && {
    onSearch: (text: string) => {
      // TODO(burdon): Specify filter (e.g., stack).
      const { objects = [] } = space?.db.query(DocumentType.filter()) ?? {};
      return objects
        .map<AutocompleteResult | undefined>((object) =>
          object.title?.length && object.id !== document?.id
            ? {
                label: object.title,
                // TODO(burdon): Factor out URL builder.
                apply: `[${object.title}](/${object.id})`,
              }
            : undefined,
        )
        .filter(nonNullable);
    },
  },
  // TODO(burdon): Update position in editor: EditorView.scrollIntoView
  comments: space &&
    document &&
    dispatch && {
      onCreate: (cursor: string) => {
        // Create comment thread.
        const thread = space.db.add(new ThreadType());
        // const comment = space.db.add(new DocumentType.Comment({ thread, cursor }));
        document.comments.push({ thread, cursor });

        void dispatch?.([
          {
            action: ThreadAction.SELECT,
            data: { active: thread.id, threads: [{ id: thread.id }] },
          },
          {
            action: LayoutAction.TOGGLE_COMPLEMENTARY_SIDEBAR,
            data: { state: true },
          },
        ]);

        return thread.id;
      },
      onSelect: (state) => {
        const { active, ranges } = state;
        void dispatch?.([
          {
            action: ThreadAction.SELECT,
            data: {
              active,
              threads: ranges?.map(({ id, location }) => ({ id, y: location?.top })) ?? [{ id: active }],
            },
          },
        ]);
      },
    },
});
