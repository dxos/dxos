//
// Copyright 2023 DXOS.org
//

import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { type AnchorHTMLAttributes, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThreadAction } from '@braneframe/plugin-thread';
import { Document as DocumentType, Thread as ThreadType } from '@braneframe/types';
import { type IntentDispatcher, LayoutAction } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import {
  type AutocompleteResult,
  type Extension,
  type ListenerOptions,
  autocomplete,
  comments,
  image,
  link,
  listener,
  table,
  tasklist,
  typewriter,
  type LinkOptions,
} from '@dxos/react-ui-editor';
import { getSize, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

export type ExtensionsOptions = {
  debug?: boolean;
  experimental?: boolean;
  space?: Space;
  document?: DocumentType;
  dispatch?: IntentDispatcher;
} & Pick<ListenerOptions, 'onChange'>;

/**
 * Create extension instances for editor.
 */
export const getExtensions = ({
  debug,
  experimental,
  space, // TODO(burdon): Reconcile Space/non-space deps.
  document,
  dispatch,
  onChange,
}: ExtensionsOptions): Extension[] => {
  const extensions: Extension[] = [
    //
    // Common.
    //
    image(),
    table(),
    tasklist(),
  ];

  //
  // Document change listener.
  //
  if (onChange) {
    extensions.push(
      listener({
        onChange,
      }),
    );
  }

  //
  // Hyperlinks (external and internal object links).
  //
  if (dispatch) {
    extensions.push(
      link({
        onHover: onHoverLinkTooltip,
        onRender: onRenderLink((id: string) => {
          void dispatch({
            action: LayoutAction.ACTIVATE,
            data: { id },
          });
        }),
      }),
    );
  }

  //
  // Autocomplete object links.
  //
  if (space) {
    extensions.push(
      autocomplete({
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
      }),
    );

    //
    // Comment threads.
    //
    if (dispatch && document) {
      extensions.push(
        comments({
          onCreate: (cursor: string) => {
            // Create comment thread.
            const thread = space.db.add(new ThreadType({ context: { object: document.id } }));
            document.comments.push({ thread, cursor });
            void dispatch([
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
            void dispatch([
              {
                action: ThreadAction.SELECT,
                data: {
                  active,
                  threads: ranges?.map(({ id, location }) => ({ id, y: location?.top })) ?? [{ id: active }],
                },
              },
            ]);
          },
        }),
      );
    }
  }

  if (debug) {
    const items = localStorage.getItem('dxos.composer.extension.demo');
    extensions.push(...[items ? typewriter({ items: items!.split(',') }) : undefined].filter(nonNullable));
  }

  if (experimental) {
    extensions.push(...[].filter(nonNullable));
  }

  return extensions;
};

// TODO(burdon): Factor out style.
const hover = 'rounded-sm text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200';

const onRenderLink = (onSelectObject: (id: string) => void) => (el: Element, url: string) => {
  // TODO(burdon): Formalize/document internal link format.
  const options: AnchorHTMLAttributes<any> = url.startsWith('/')
    ? {
        onClick: () => {
          onSelectObject(url.slice(1));
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

const onHoverLinkTooltip: LinkOptions['onHover'] = (el, url) => {
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
