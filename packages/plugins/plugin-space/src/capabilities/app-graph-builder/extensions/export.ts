//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ExportOperation from '@dxos/app-toolkit/ExportOperation';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';

import { PRINT_OBJECT_LABEL, SAVE_OBJECT_LABEL } from './shared.ts';

/** Print and Save on the article menu of any object whose type contributes an `AppCapabilities.Exporter`. */
export const createExportExtensions = Effect.fnUntraced(function* () {
  const capabilities = yield* Capability.Service;

  return yield* Effect.all([
    AppGraphBuilder.createExtension({
      id: 'exportActions',
      match: (node) =>
        node.data != null && Obj.isObject(node.data) && Obj.getTypename(node.data) === node.type
          ? Option.some(node.data)
          : Option.none(),
      actions: (object, get) => {
        const typename = Obj.getTypename(object);
        const exporter = get(capabilities.atom(AppCapabilities.Exporter)).find(({ id }) => id === typename);
        if (!exporter) {
          return Effect.succeed([]);
        }

        return Effect.succeed([
          ...(exporter.print
            ? [
                AppGraphNode.makeAction({
                  id: ExportOperation.Print.meta.key,
                  data: () => Operation.invoke(ExportOperation.Print, { subject: object }),
                  properties: {
                    label: PRINT_OBJECT_LABEL,
                    icon: ExportOperation.Print.meta.icon,
                    disposition: 'list-item',
                    testId: 'spacePlugin.printObject',
                  },
                }),
              ]
            : []),
          ...(exporter.save
            ? [
                AppGraphNode.makeAction({
                  id: ExportOperation.Save.meta.key,
                  data: () => Operation.invoke(ExportOperation.Save, { subject: object }),
                  properties: {
                    label: SAVE_OBJECT_LABEL,
                    icon: ExportOperation.Save.meta.icon,
                    disposition: 'list-item',
                    testId: 'spacePlugin.saveObject',
                  },
                }),
              ]
            : []),
        ]);
      },
    }),
  ]);
});
