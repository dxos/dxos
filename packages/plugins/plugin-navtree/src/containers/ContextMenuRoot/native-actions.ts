//
// Copyright 2026 DXOS.org
//

import type * as AppNode from '@dxos/app-toolkit/AppNode';
import { log } from '@dxos/log';
import { type MenuAction, createMenuAction } from '@dxos/react-ui-menu';

import { meta } from '#meta';

type Label = [string, { ns: string }];

const label = (key: string): Label => [key, { ns: meta.profile.key }];

type TextField = HTMLInputElement | HTMLTextAreaElement;

const isTextField = (element: Element | null): element is TextField =>
  element instanceof HTMLTextAreaElement ||
  (element instanceof HTMLInputElement && ['text', 'search', 'url', 'email', 'tel', ''].includes(element.type));

/**
 * What the browser's own menu offered at a right-click, captured when it happens: the menu takes focus when it opens,
 * which can move the DOM selection, so the selection and its field are read up front.
 */
export type NativeContext = {
  link?: string;
  image?: string;
  /** The selected text, if any. */
  selection?: string;
  /** An input or textarea, with the range selected in it. */
  field?: { element: TextField; start: number; end: number };
  /** A contenteditable host (e.g. a CodeMirror editor), which handles clipboard events itself. */
  editable?: HTMLElement;
  /** The selected DOM range outside a field, restored before cutting or copying it. */
  range?: Range;
};

/** Reads the link, image, selection and editable target under a right-click. */
export const readNativeContext = (target: EventTarget | null): NativeContext => {
  const element = target instanceof Element ? target : null;
  // The resolved address, as the browser's "Copy link address" gives it, not the attribute (which may be relative).
  const link = element?.closest<HTMLAnchorElement>('a[href]')?.href || undefined;
  const image = element?.closest('img')?.currentSrc || undefined;
  const fieldElement = element?.closest('input, textarea') ?? null;
  const field = isTextField(fieldElement)
    ? { element: fieldElement, start: fieldElement.selectionStart ?? 0, end: fieldElement.selectionEnd ?? 0 }
    : undefined;
  const editable = field ? undefined : (element?.closest<HTMLElement>('[contenteditable="true"]') ?? undefined);
  const domSelection = field ? null : (globalThis.getSelection?.() ?? null);
  const range = domSelection && domSelection.rangeCount > 0 ? domSelection.getRangeAt(0).cloneRange() : undefined;
  const selection = field ? field.element.value.slice(field.start, field.end) : (domSelection?.toString() ?? '');
  return { link, image, selection: selection || undefined, field, editable, range };
};

/** Replaces the field's selected range, as typing would, so frameworks listening for `input` see the change. */
const replaceRange = ({ element, start, end }: NonNullable<NativeContext['field']>, text: string) => {
  element.focus();
  element.setRangeText(text, start, end, 'end');
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
};

/** Puts focus and the selection back where they were at the right-click; opening the menu took both. */
const restoreSelection = ({ field, editable, range }: NativeContext) => {
  if (field) {
    field.element.focus();
    field.element.setSelectionRange(field.start, field.end);
    return;
  }
  editable?.focus();
  const selection = globalThis.getSelection?.();
  if (range && selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

/**
 * Cuts or copies the restored selection as the keyboard shortcut would, so an editor (e.g. CodeMirror) writes and
 * removes its own selection; the command needs no clipboard permission, unlike `navigator.clipboard`, which is the
 * fallback where the command is unsupported (a cut then deletes the selection itself once the text is written).
 */
const execClipboard = (command: 'cut' | 'copy', context: NativeContext, text: string) => {
  restoreSelection(context);
  if (document.execCommand(command)) {
    return;
  }
  withClipboard(
    (clipboard) => clipboard.writeText(text),
    () => {
      if (command !== 'cut') {
        return;
      }
      if (context.field) {
        replaceRange(context.field, '');
      } else {
        restoreSelection(context);
        document.execCommand('delete');
      }
    },
  );
};

/** The clipboard API refuses without permission or focus; the refusal is logged, as the menu has closed by then. */
const withClipboard = <T>(request: (clipboard: Clipboard) => Promise<T>, then: (value: T) => void = () => {}) =>
  void request(navigator.clipboard).then(then, (error) => log.warn('clipboard unavailable', { error }));

/** Sends a paste event to an editor, which inserts the text at its own selection. */
const dispatchPaste = (editable: HTMLElement, text: string) => {
  const clipboardData = new DataTransfer();
  clipboardData.setData('text/plain', text);
  editable.focus();
  editable.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
};

type EditKey = 'undo' | 'redo' | 'cut' | 'copy' | 'paste';

const editProperties: Record<EditKey, { icon: string; keyBinding: Record<string, string> }> = {
  undo: { icon: 'ph--arrow-counter-clockwise--regular', keyBinding: { macos: 'meta+z', windows: 'ctrl+z' } },
  redo: { icon: 'ph--arrow-clockwise--regular', keyBinding: { macos: 'shift+meta+z', windows: 'ctrl+y' } },
  cut: { icon: 'ph--scissors--regular', keyBinding: { macos: 'meta+x', windows: 'ctrl+x' } },
  copy: { icon: 'ph--copy--regular', keyBinding: { macos: 'meta+c', windows: 'ctrl+c' } },
  paste: { icon: 'ph--clipboard-text--regular', keyBinding: { macos: 'meta+v', windows: 'ctrl+v' } },
};

/** An edit action; a container's command shows greyed out rather than vanishing when it cannot run. */
const editAction = (key: EditKey, run: () => void, disabled = false): MenuAction =>
  createMenuAction(`edit.${key}`, run, { label: label(`context-menu.${key}.label`), disabled, ...editProperties[key] });

const commandAction = (key: EditKey, command: AppNode.EditCommand): MenuAction =>
  editAction(key, () => command.run(), !command.enabled());

/**
 * The actions the browser's menu would have offered here, since the app's menu replaces it everywhere: open and copy a
 * link or image, and cut, copy and paste text. A container's own {@link AppNode.EditCommands} add undo and redo, and
 * replace the text clipboard's cut, copy and paste with its own where it offers them.
 */
export const nativeActions = (context: NativeContext, commands?: AppNode.EditCommands): MenuAction[] => {
  const actions: MenuAction[] = [];
  const { link, image, selection, field, editable } = context;
  const writable = !!field || !!editable;

  if (link) {
    actions.push(
      createMenuAction('native.open-link', () => globalThis.open(link, '_blank', 'noopener'), {
        label: label('context-menu.open-link.label'),
        icon: 'ph--arrow-square-out--regular',
      }),
      createMenuAction('native.copy-link', () => withClipboard((clipboard) => clipboard.writeText(link)), {
        label: label('context-menu.copy-link.label'),
        icon: 'ph--link--regular',
      }),
    );
  }

  if (image) {
    actions.push(
      createMenuAction('native.open-image', () => globalThis.open(image, '_blank', 'noopener'), {
        label: label('context-menu.open-image.label'),
        icon: 'ph--image--regular',
      }),
      createMenuAction('native.copy-image-address', () => withClipboard((clipboard) => clipboard.writeText(image)), {
        label: label('context-menu.copy-image-address.label'),
        icon: 'ph--link--regular',
      }),
    );
  }

  if (commands) {
    actions.push(commandAction('undo', commands.undo), commandAction('redo', commands.redo));
  }

  if (commands?.cut) {
    actions.push(commandAction('cut', commands.cut));
  } else if (selection && writable) {
    actions.push(editAction('cut', () => execClipboard('cut', context, selection)));
  }

  if (commands?.copy) {
    actions.push(commandAction('copy', commands.copy));
  } else if (selection) {
    actions.push(editAction('copy', () => execClipboard('copy', context, selection)));
  }

  if (commands?.paste) {
    actions.push(commandAction('paste', commands.paste));
  } else if (writable) {
    actions.push(
      editAction('paste', () => {
        restoreSelection(context);
        // Pages may not run the native paste command (only extensions and app shells can), so read the clipboard.
        if (document.execCommand('paste')) {
          return;
        }
        withClipboard(
          (clipboard) => clipboard.readText(),
          (text) => {
            if (field) {
              replaceRange(field, text);
            } else if (editable) {
              dispatchPaste(editable, text);
            }
          },
        );
      }),
    );
  }

  return actions;
};

/** Navigation every context menu ends with: the active space's home, and back and forward through history. */
export const globalActions = ({ onHome }: { onHome?: () => void }): MenuAction[] => [
  ...(onHome
    ? [
        createMenuAction('global.home', onHome, {
          label: label('context-menu.home.label'),
          icon: 'ph--house--regular',
        }),
      ]
    : []),
  createMenuAction('global.back', () => globalThis.history.back(), {
    label: label('context-menu.back.label'),
    icon: 'ph--arrow-left--regular',
  }),
  createMenuAction('global.forward', () => globalThis.history.forward(), {
    label: label('context-menu.forward.label'),
    icon: 'ph--arrow-right--regular',
  }),
];
