//
// Copyright 2026 DXOS.org
//

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
};

/** Reads the link, image, selection and editable target under a right-click. */
export const readNativeContext = (target: EventTarget | null): NativeContext => {
  const element = target instanceof Element ? target : null;
  const link = element?.closest('a[href]')?.getAttribute('href') ?? undefined;
  const image = element?.closest('img')?.currentSrc || undefined;
  const fieldElement = element?.closest('input, textarea') ?? null;
  const field = isTextField(fieldElement)
    ? { element: fieldElement, start: fieldElement.selectionStart ?? 0, end: fieldElement.selectionEnd ?? 0 }
    : undefined;
  const editable = field ? undefined : (element?.closest<HTMLElement>('[contenteditable="true"]') ?? undefined);
  const selection = field
    ? field.element.value.slice(field.start, field.end)
    : (globalThis.getSelection?.()?.toString() ?? '');
  return { link, image, selection: selection || undefined, field, editable };
};

/** Replaces the field's selected range, as typing would, so frameworks listening for `input` see the change. */
const replaceRange = ({ element, start, end }: NonNullable<NativeContext['field']>, text: string) => {
  element.focus();
  element.setRangeText(text, start, end, 'end');
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
};

/** Sends a clipboard event to an editor, which applies it to its own selection. */
const dispatchClipboard = (editable: HTMLElement, type: 'cut' | 'paste', data?: string): DataTransfer => {
  const clipboardData = new DataTransfer();
  if (data !== undefined) {
    clipboardData.setData('text/plain', data);
  }
  editable.focus();
  editable.dispatchEvent(new ClipboardEvent(type, { clipboardData, bubbles: true, cancelable: true }));
  return clipboardData;
};

/**
 * The actions the browser's menu would have offered here, since the app's menu replaces it everywhere: open and copy a
 * link or image, and cut, copy and paste text.
 */
export const nativeActions = (context: NativeContext): MenuAction[] => {
  const actions: MenuAction[] = [];
  const { link, image, selection, field, editable } = context;
  const writable = !!field || !!editable;

  if (link) {
    actions.push(
      createMenuAction('native.open-link', () => globalThis.open(link, '_blank', 'noopener'), {
        label: label('context-menu.open-link.label'),
        icon: 'ph--arrow-square-out--regular',
      }),
      createMenuAction('native.copy-link', () => void navigator.clipboard.writeText(link), {
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
      createMenuAction('native.copy-image-address', () => void navigator.clipboard.writeText(image), {
        label: label('context-menu.copy-image-address.label'),
        icon: 'ph--link--regular',
      }),
    );
  }

  if (selection && writable) {
    actions.push(
      createMenuAction(
        'native.cut',
        () => {
          if (field) {
            void navigator.clipboard.writeText(selection);
            replaceRange(field, '');
          } else if (editable) {
            const data = dispatchClipboard(editable, 'cut');
            void navigator.clipboard.writeText(data.getData('text/plain') || selection);
          }
        },
        { label: label('context-menu.cut.label'), icon: 'ph--scissors--regular' },
      ),
    );
  }

  if (selection) {
    actions.push(
      createMenuAction('native.copy', () => void navigator.clipboard.writeText(selection), {
        label: label('context-menu.copy.label'),
        icon: 'ph--copy--regular',
      }),
    );
  }

  if (writable) {
    actions.push(
      createMenuAction(
        'native.paste',
        () =>
          void navigator.clipboard.readText().then((text) => {
            if (field) {
              replaceRange(field, text);
            } else if (editable) {
              dispatchClipboard(editable, 'paste', text);
            }
          }),
        { label: label('context-menu.paste.label'), icon: 'ph--clipboard-text--regular' },
      ),
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
