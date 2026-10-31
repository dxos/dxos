//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { type Scene, findLayout, resolveLayout } from '@dxos/scene';

import { copyFragment, getSessionClipboard, pasteInto, setSessionClipboard } from '../clipboard.ts';
import { buildCommands } from '../commands.ts';
import { type EditorCommands, type EditorDocument } from './context.ts';
import { type AspectOptions, keep } from './host.ts';

/** The open layout's model, and the one selected element with its resolved type. */
const selected = (document: Scene.SceneDocument, open: string | undefined, selection: readonly string[]) => {
  const record = open === undefined ? undefined : findLayout(document, open);
  const element = selection.length === 1 ? record?.elements[selection[0]] : undefined;
  return {
    model: document.models[0]?.id,
    element,
    type: element && record ? resolveLayout(document, record)[element.id]?.type : undefined,
  };
};

/**
 * The command table every surface reads (the actions bar, the context menu, the shortcuts and the app), with undo and
 * the clipboard; each command reads the editor's state when it runs, so the table changes only with what it shows.
 */
export const createCommandsAspect = <C>(
  { registry, config, latest, store }: AspectOptions<C>,
  document: EditorDocument,
) => {
  const { atoms } = document;
  const { intent, modelIntent } = document.commands;
  // Undo and redo change the history's stacks, which the command states read.
  const historyVersion = keep(0);

  // The selection as a fragment kept for this session, and as `.dx` text on the system clipboard.
  const copy = (): boolean => {
    const { codec } = latest.current.props;
    const open = registry.get(atoms.layout);
    const copied =
      codec && open && copyFragment(codec, registry.get(atoms.document), open, registry.get(store.atoms.selection));
    if (!copied) {
      return false;
    }
    setSessionClipboard(copied);
    void globalThis.navigator?.clipboard?.writeText(copied.text).catch(() => undefined);
    return true;
  };
  const pasteFrom = (text: string | undefined) => {
    const { codec } = latest.current.props;
    const open = registry.get(atoms.layout);
    if (!codec || !open) {
      return;
    }
    const result = pasteInto({
      codec,
      document: registry.get(atoms.document),
      layout: open,
      copied: getSessionClipboard(),
      text,
      offset: config.geometry.pasteOffset,
    });
    if (result.kind === 'refused') {
      store.setNotice('An object cannot be pasted inside its own parts.');
    } else if (result.kind === 'paste') {
      setSessionClipboard(result.clipboard);
      intent(open, result.intent);
      store.select(result.ids);
    }
  };
  const deleteSelection = () => {
    const open = registry.get(atoms.layout);
    if (open) {
      intent(open, { kind: 'delete', ids: registry.get(store.atoms.selection) });
      store.select([]);
    }
  };
  const run = {
    'undo': () => {
      latest.current.props.history?.undo();
      registry.set(historyVersion, registry.get(historyVersion) + 1);
    },
    'redo': () => {
      latest.current.props.history?.redo();
      registry.set(historyVersion, registry.get(historyVersion) + 1);
    },
    'cut': () => copy() && deleteSelection(),
    'copy': () => void copy(),
    'paste': () => {
      // The system clipboard first, so text copied elsewhere pastes; the session's copy otherwise.
      const read = globalThis.navigator?.clipboard?.readText?.() ?? Promise.resolve(undefined);
      void read.then(
        (text) => pasteFrom(text),
        () => pasteFrom(undefined),
      );
    },
    'duplicate': () => copy() && pasteFrom(undefined),
    'delete': deleteSelection,
    'group': () => {
      const open = registry.get(atoms.layout);
      const selection = registry.get(store.atoms.selection);
      const { model } = selected(registry.get(atoms.document), open, selection);
      if (open && model !== undefined) {
        const id = `group-${Date.now().toString(36)}`;
        modelIntent({ kind: 'group', model, layout: open, id, members: selection }).length === 0 && store.select([id]);
      }
    },
    'ungroup': () => {
      const open = registry.get(atoms.layout);
      const { model, element } = selected(registry.get(atoms.document), open, registry.get(store.atoms.selection));
      if (open && model !== undefined && element) {
        modelIntent({ kind: 'ungroup', model, layout: open, id: element.id }).length === 0 && store.select([]);
      }
    },
    'make-object': () => {
      const document = registry.get(atoms.document);
      const open = registry.get(atoms.layout);
      const objects = document.models[0]?.objects ?? {};
      const model = document.models[0]?.id;
      let index = 1;
      while (objects[`object-${index}`]) {
        index++;
      }
      if (open && model !== undefined) {
        modelIntent({
          kind: 'extract',
          model,
          layout: open,
          ids: registry.get(store.atoms.selection),
          object: { id: `object-${index}`, type: config.dim === '3d' ? 'sphere' : 'rect' },
        }).length === 0 && store.select([]);
      }
    },
  };
  const extras = (config.commands ?? []).map((extra) => ({
    id: extra.id,
    label: extra.label,
    icon: extra.icon,
    enabled: extra.enabled,
    run: () => {
      const open = registry.get(atoms.layout);
      if (!open) {
        return;
      }
      void Promise.resolve(
        extra.run({
          document: registry.get(atoms.document),
          layout: open,
          selection: registry.get(store.atoms.selection),
          onIntent: intent,
          onModelIntent: modelIntent,
          select: store.select,
          setTool: store.setTool,
          notify: store.setNotice,
        }),
      ).catch((error) => store.setNotice(String(error)));
    },
  }));
  const table = Atom.keepAlive(
    Atom.make((get) => {
      get(historyVersion);
      const document = get(atoms.document);
      const selection = get(store.atoms.selection);
      const { model, type } = selected(document, get(atoms.layout), selection);
      const { history } = latest.current.props;
      return buildCommands({
        state: {
          readonly: get(atoms.readonly),
          selection,
          canUndo: history?.canUndo ?? false,
          canRedo: history?.canRedo ?? false,
          canUngroup: type === 'group',
          canMakeObject: model !== undefined && get(atoms.host).model,
        },
        run,
        extras,
      });
    }),
  );

  const aspect: EditorCommands = {
    atoms: { table, menu: store.atoms.menu, notice: store.atoms.notice },
    commands: { setMenu: store.setMenu, setNotice: store.setNotice },
  };
  return { aspect };
};
