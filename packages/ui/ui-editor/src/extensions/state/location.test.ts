//
// Copyright 2026 DXOS.org
//

import { Compartment, EditorState, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, onTestFinished, test } from 'vitest';

import { type EditorLocation, INITIAL_SELECTION_EVENT, editorLocation } from './location.ts';
import { createEditorStateTransaction, documentId } from './selection.ts';

const DOC_ID = 'doc';

type Report = (id: string, location: EditorLocation) => void;

/** Mounts a view of document `id` with `extension`. */
const mount = (extension: ReturnType<typeof editorLocation>, compartment = new Compartment(), id = DOC_ID) => {
  const parent = document.createElement('div');
  document.body.append(parent);
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: 'line one\nline two\nline three\n',
      extensions: [documentId.of(id), compartment.of(extension)],
    }),
  });
  // happy-dom has no layout, so pin the top of the viewport to the second line.
  view.posAtCoords = () => 10;
  onTestFinished(() => {
    view.destroy();
    parent.remove();
  });
  return view;
};

/** Collects location reports; `next` resolves with the next one for document `id`. */
const reporter = () => {
  const waiters: { id: string; resolve: (location: EditorLocation) => void }[] = [];
  const report: Report = (id, location) => {
    for (const waiter of waiters.filter((waiter) => waiter.id === id)) {
      waiters.splice(waiters.indexOf(waiter), 1);
      waiter.resolve(location);
    }
  };
  const next = (id = DOC_ID) => new Promise<EditorLocation>((resolve) => waiters.push({ id, resolve }));
  return { report, next };
};

const scroll = (view: EditorView) => view.scrollDOM.dispatchEvent(new Event('scroll'));

describe('editorLocation', () => {
  test('a reader who only scrolled reports the viewport and no selection', async ({ expect }) => {
    const { report, next } = reporter();
    scroll(mount(editorLocation(report)));
    expect(await next()).toEqual({ selection: undefined, viewport: expect.any(String) });
  });

  test('selections the reader did not make are not theirs: mount, restore and remote edits', async ({ expect }) => {
    const { report, next } = reporter();
    const view = mount(editorLocation(report));
    view.dispatch({ selection: { anchor: 8 }, userEvent: INITIAL_SELECTION_EVENT });
    // The restore a scrolling editor (a plank's) takes; the short-editor branch is covered through `useTextEditor`.
    view.dispatch(createEditorStateTransaction({ selection: { anchor: 4 }, scrollTo: 0 }));
    view.dispatch({ selection: { anchor: 2 }, userEvent: 'select', annotations: Transaction.remote.of(true) });
    scroll(view);
    expect(await next()).toEqual({ selection: undefined, viewport: expect.any(String) });
  });

  // Vim motions and a Jump or comment reveal set the caret with no user event.
  test('a selection the reader caused without an input event is theirs', async ({ expect }) => {
    const { report, next } = reporter();
    mount(editorLocation(report)).dispatch({ selection: { anchor: 4 } });
    expect((await next()).selection).toEqual(expect.any(String));
  });

  test('a selection the reader made is reported', async ({ expect }) => {
    const { report, next } = reporter();
    mount(editorLocation(report)).dispatch({ selection: { anchor: 4 }, userEvent: 'select.pointer' });
    expect((await next()).selection).toEqual(expect.any(String));
  });

  test("a reader's selection is the view's: a new view starts without one, a reconfigure keeps it", async ({
    expect,
  }) => {
    const { report, next } = reporter();
    const extension = editorLocation(report);
    const compartment = new Compartment();
    const first = mount(extension, compartment);
    first.dispatch({ selection: { anchor: 4 }, userEvent: 'select' });
    first.dispatch({ effects: compartment.reconfigure(editorLocation(report)) });
    scroll(first);
    expect((await next()).selection).toEqual(expect.any(String));

    scroll(mount(extension, new Compartment(), 'second'));
    expect((await next('second')).selection).toBeUndefined();
  });
});
