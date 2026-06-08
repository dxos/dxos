//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, createTypeSectionExtension } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { GraphBuilder, Node } from '@dxos/plugin-graph';

import { Markdown, MarkdownOperation } from '#types';
import { getDocumentPath } from '../paths';

const documentTypename = Type.getTypename(Markdown.Document);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      createTypeSectionExtension(Markdown.Document),

      GraphBuilder.createExtension({
        id: 'documentsSectionActions',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === documentTypename && space ? Option.some(space) : Option.none();
        },
        actions: (space) =>
          Effect.succeed([
            Node.makeAction({
              id: 'create-document',
              data: () =>
                Effect.gen(function* () {
                  const { object: doc } = yield* Operation.invoke(
                    MarkdownOperation.CreateMarkdown,
                    {},
                    { spaceId: space.db.spaceId },
                  );
                  yield* Operation.invoke(LayoutOperation.Open, {
                    subject: [getDocumentPath(space.db.spaceId, doc.id)],
                  });
                }),
              properties: {
                label: ['add-object.label', { ns: documentTypename }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
