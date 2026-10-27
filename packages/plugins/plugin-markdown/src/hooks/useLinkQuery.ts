//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';
import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import * as ObjectCombobox from '@dxos/app-toolkit/ObjectCombobox';
import { Database, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { type EditorMenuGroup, type EditorMenuItem } from '@dxos/react-ui-editor';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';
import { insertAtCursor, insertAtLineStart } from '@dxos/ui-editor';
import { hues } from '@dxos/ui-types';

import { MarkdownNamespace } from '../namespace.ts';

const getLabel = (object: Obj.Unknown): Theme.Label => {
  const typename = Obj.getTypename(object);
  // A typeless object cannot key a translation namespace, so it falls back to the literal.
  const placeholder: Theme.Label = typename
    ? ['object-name.placeholder', { ns: typename, defaultValue: 'New object' }]
    : 'New object';
  return Obj.getLabel(object) ?? placeholder;
};

// Object names are free text, so an unescaped "]" or newline would terminate the link syntax early
// and persist a broken link into the document.
const escapeLinkLabel = (label: string): string => label.replace(/[[\]]/g, '\\$&').replace(/\s*\r?\n\s*/g, ' ');

/**
 * Insert a link to `object`; "@@" (block mode) puts a block embed on its own line.
 */
const insertLink = (view: EditorView, head: number, label: string, uri: string, block: boolean): void => {
  const link = `[${escapeLinkLabel(label)}](${uri})`;
  if (block) {
    insertAtLineStart(view, head, `!${link}\n`);
  } else {
    insertAtCursor(view, head, `${link} `);
  }
};

export const useLinkQuery = (db: Database.Database | undefined, current?: Obj.Unknown) => {
  const { t } = UiHooks.useTranslation(MarkdownNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const notCurrent = useCallback((object: Obj.Unknown) => object.id !== current?.id, [current?.id]);
  const search = ObjectCombobox.useSearch(db, { filter: notCurrent });

  const handleLinkQuery = useCallback(
    (query?: string): Promise<EditorMenuGroup[]> => {
      if (!db) {
        return Promise.resolve([]);
      }

      // A second "@" switches the link query into block-embed mode, so "@@foo" searches for "foo".
      const raw = query ?? '';
      const block = raw.startsWith('@');
      // The query may end in the space before the next word.
      const text = (block ? raw.slice(1) : raw).trim();

      return Effect.gen(function* () {
        const [results, containing] = yield* Effect.all(
          [
            Effect.promise(() => search(text)),
            current ? Database.query(ContainerModel.containing(current)).run : Effect.succeed([]),
          ],
          { concurrency: 'unbounded' },
        );

        const items = (results ?? []).map(({ id, label, icon, iconHue }): EditorMenuItem => ({
          id,
          label,
          icon,
          iconHue: hues.find((hue) => hue === iconHue),
          onSelect: ({ view, head }) => insertLink(view, head, label, id, block),
        }));

        // File new objects in the current document's collection; with no containing collection
        // `OpenObjectForm` falls back to the space's own default placement.
        const target = containing[0] ?? db;

        const createItem: EditorMenuItem = {
          id: 'create-object',
          label: ['add-object.label', { ns: MarkdownNamespace.key }],
          icon: 'ph--plus--regular',
          onSelect: ({ view, head }) => {
            void invokePromise?.(SpaceOperation.OpenObjectForm, {
              target,
              // Keep the deck where it is: the link is inserted back into the editor the user is in.
              navigable: false,
              // As typed: the lowercased copy is only for matching.
              defaults: text ? { name: text } : undefined,
            }).then(({ data }) => {
              const object = data?.target;
              if (object) {
                insertLink(view, head, Theme.toLocalizedString(getLabel(object), t), Obj.getURI(object), block);
                view.focus();
              }
            });
          },
        };

        return [
          { id: 'create', items: [createItem] },
          { id: 'echo', items },
        ];
      }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
    },
    [db, t, current, invokePromise, search],
  );

  return handleLinkQuery;
};
