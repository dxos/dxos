//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Format } from '@dxos/echo';
import { log } from '@dxos/log';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import { isTauri } from '@dxos/util';

import { ClaudeCapabilities } from '#types';

import { ClaudeNamespace } from '../namespace.ts';

/** Where the group sorts among the Config section's groups, after the project's own. */
const SOFTWARE_ORDER = 10;

/** After plugin-code's repositories in the same group. */
const FOLDER_ORDER = 1;

/**
 * The project's code folder on this device, in the Software group plugin-code declares with the repositories: this
 * plugin's local state, since a path means nothing on another device, shown only where an agent host exists.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateAtom = yield* ClaudeCapabilities.State;
    const hostsAtom = yield* Capability.atom(ClaudeCapabilities.AgentHelper);

    const folder = Atom.family((projectId: string) =>
      Atom.writable(
        (get) => get(stateAtom).repositories?.[projectId],
        (ctx, value: string | undefined) => {
          const { repositories: { [projectId]: _, ...others } = {}, ...state } = ctx.get(stateAtom);
          const path = value?.trim();
          ctx.set(stateAtom, { ...state, repositories: path ? { ...others, [projectId]: path } : others });
        },
      ),
    );

    return Capability.contribute(ProjectCapabilities.ConfigGroup, {
      id: 'software',
      label: ['software-config.label', { ns: ClaudeNamespace.key }],
      order: SOFTWARE_ORDER,
      fields: [
        {
          key: 'folder',
          order: FOLDER_ORDER,
          schema: Schema.optional(
            Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Key)).annotate({
              title: 'Code folder on this device',
              description:
                'Where Claude Code on this computer works; each delegated task gets its own git worktree of it.',
              examples: ['/Users/me/code/project'],
            }),
          ),
          value: (project) => folder(project.id),
          enabled: Atom.make((get) => get(hostsAtom).length > 0),
          // The desktop app picks the folder with the system dialog; a browser takes the typed path alone.
          ...(isTauri() && {
            action: {
              label: 'Choose folder…',
              icon: 'ph--folder-open--regular',
              run: (current: string | undefined) =>
                import('@tauri-apps/plugin-dialog')
                  .then(({ open }) => open({ directory: true, multiple: false, defaultPath: current }))
                  .then((selected) => (typeof selected === 'string' ? selected : undefined))
                  .catch((error) => {
                    log.warn('folder picker failed', { error });
                    return undefined;
                  }),
            },
          }),
        },
      ],
    });
  }),
);
