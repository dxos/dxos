//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Operation from '@dxos/compute/Operation';
import type * as Spec from '@dxos/compute/Spec';
import { Obj, Ref } from '@dxos/echo';
import * as ProjectOperation from '@dxos/plugin-projects/ProjectOperation';

import { type FeatureChanges } from '../components/FeatureCard/index.ts';
import { CodeNamespace } from '../namespace.ts';

export type FeatureEditing = {
  /** Writes the block's title, prose or status. */
  update: (key: string, changes: FeatureChanges) => void;
};

/**
 * Edits of a spec's `feat` blocks, each through the block operation an agent would use, so a person and an agent get
 * the same rules. A refused edit is shown as a toast carrying the operation's own message.
 */
export const useFeatureEditing = (spec: Spec.Spec | undefined): FeatureEditing => {
  const { invokePromise } = Hooks.useOperationInvoker();

  return useMemo(() => {
    const spaceId = spec && Obj.getDatabase(spec)?.spaceId;
    const toast = (description: string) =>
      void invokePromise(LayoutOperation.AddToast, {
        id: `${CodeNamespace.key}/feature-edit-error/${Date.now()}`,
        icon: 'ph--warning--regular',
        duration: 6_000,
        title: ['feature-edit-error.title', { ns: CodeNamespace.key }],
        description,
      });
    const run = async <I, O>(operation: Operation.Definition<I, O>, input: I): Promise<O | undefined> => {
      const { data, error } = await invokePromise(operation, input, { spaceId });
      if (error) {
        toast(error.message);
        return undefined;
      }
      return data;
    };
    const set = (input: Omit<Operation.Definition.Input<typeof ProjectOperation.SetSpecBlock>, 'spec'>) =>
      spec ? run(ProjectOperation.SetSpecBlock, { spec: Ref.make(spec), ...input }) : Promise.resolve(undefined);

    return {
      update: (key, { name, description, status }) =>
        void set({
          block: key,
          ...(name !== undefined && { title: name }),
          ...(description !== undefined && { prose: description }),
          ...(status !== undefined && { fields: { status } }),
        }),
    };
  }, [spec, invokePromise]);
};
