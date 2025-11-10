//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { Obj, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { createExtension } from '@dxos/plugin-graph';
import { getSpace } from '@dxos/react-client/echo';
import { HasSubject } from '@dxos/types';

import { meta } from '../meta';
import { OutlineAction } from '../types';

export default (context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: `${meta.id}/root`,
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => {
              // TODO(burdon): Narrow types (e.g., Person, Organization, Event); use annotation?
              return Obj.isObject(node.data) ? Option.some(node.data) : Option.none();
            }),
            Option.map((object) => {
              const id = Obj.getDXN(object).toString();
              const space = getSpace(object);
              return [
                /**
                 * Menu item to create new Outline object with a relation to the existing object.
                 */
                {
                  id: `${OutlineAction.CreateOutline._tag}/${id}`,
                  properties: {
                    label: ['create outline label', { ns: meta.id }],
                    icon: 'ph--tree-structure--regular',
                    disposition: 'list-item',
                  },
                  data: async () => {
                    invariant(space);
                    const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                    const { data } = await dispatch(createIntent(OutlineAction.CreateOutline));
                    if (data?.object) {
                      space.db.add(data.object);
                      space.db.add(
                        Relation.make(HasSubject.HasSubject, {
                          [Relation.Source]: data.object,
                          [Relation.Target]: object,
                          completedAt: new Date().toISOString(),
                        }),
                      );
                    }
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  );
