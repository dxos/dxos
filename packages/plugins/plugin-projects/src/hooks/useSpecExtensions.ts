//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Spec from '@dxos/compute/Spec';
import { Obj } from '@dxos/echo';
import { type Doc } from '@dxos/echo-doc';
import { useObject } from '@dxos/echo-react';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as UiHooks from '@dxos/react-ui/Hooks';
import { isTruthy } from '@dxos/util';

import { ProjectCapabilities } from '#types';

export type UseSpecExtensionsOptions = Omit<ProjectCapabilities.SpecExtensionOptions, 'dialects'> & {
  /** The text the editor is bound to, so what other plugins give Markdown, such as comments, anchors into it. */
  binding?: { object: Obj.Unknown; path: Doc.KeyPath };
};

/**
 * A spec editor's extensions besides MDL's own: object links and embeds and what other plugins give Markdown documents,
 * such as diagrams and comments, then the editing the spec's packages add. Rebuilt when the spec takes or drops a
 * package.
 */
export const useSpecExtensions = (
  spec: Spec.Spec | undefined,
  { attendableId, t, binding }: UseSpecExtensionsOptions,
): Extension[] => {
  const objectEmbeds = Hooks.useOptionalCapability(MarkdownCapabilities.ObjectEmbeds);
  const providers = Hooks.useCapabilities(MarkdownCapabilities.ExtensionProvider);
  const factories = Hooks.useCapabilities(ProjectCapabilities.SpecExtensions);
  const [dialects = EMPTY] = useObject(spec, 'dialects');
  // Read through a ref: translations that load after the editor opens would otherwise rebuild it under the user.
  const tRef = UiHooks.useDynamicRef(t);
  const translate = useCallback<typeof t>((key, options) => tRef.current(key, options), [tRef]);
  return useMemo(
    () =>
      spec
        ? [
            objectEmbeds?.({ db: Obj.getDatabase(spec), attendableId }),
            ...providers.flat().map((provider) => provider({ subject: spec, binding })),
            ...factories.flatMap((factory) => factory(spec, { attendableId, dialects, t: translate })),
          ].filter(isTruthy)
        : [],
    [objectEmbeds, providers, factories, spec, attendableId, dialects, translate, binding],
  );
};

/**
 * What other plugins give Markdown, such as comments, for the field editors in a spec's block cards: bound to the spec's
 * text, so a comment made in a field anchors into the text.
 */
export const useSpecFieldExtensions = (
  spec: Spec.Spec | undefined,
  binding: UseSpecExtensionsOptions['binding'],
): Extension[] => {
  const providers = Hooks.useCapabilities(MarkdownCapabilities.ExtensionProvider);
  return useMemo(
    () =>
      spec && binding
        ? providers
            .flat()
            .map((provider) => provider({ subject: spec, binding }))
            .filter(isTruthy)
        : [],
    [providers, spec, binding],
  );
};

const EMPTY: readonly string[] = [];
