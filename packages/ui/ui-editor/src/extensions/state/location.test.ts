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

/** Mounts a view with `extension`; its location reports land in `reports`. */
const mount = (extension: ReturnType<typeof editorLocation>, compartment = new Compartment()) => {
  const parent = document.createElement('div');
  document.body.append(parent);
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: 'line one\nline two\nline three\n',
      extensions: [documentId.of(DOC_ID), compartment.of(extension)],
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

const reporter = () => {
  const reports: EditorLocation[] = [];
  const report: Report = (_id, location) => reports.push(location);
  return { reports, report };
};

const scroll = (view: EditorView) => view.scrollDOM.dispatchEvent(new Event('scroll'));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('editorLocation', () => {
  test('a reader who only scrolled reports the viewport and no selection', async ({ expect }) => {
    const { reports, report } = reporter();
    scroll(mount(editorLocation(report)));
    await sleep(400);
    expect(reports.at(-1)).toEqual({ selection: undefined, viewport: expect.any(String) });
  });

  test('selections the reader did not make are not theirs: mount, restore and remote edits', async ({ expect }) => {
    const { reports, report } = reporter();
    const view = mount(editorLocation(report));
    view.dispatch({ selection: { anchor: 8 }, userEvent: INITIAL_SELECTION_EVENT });
    // The restore a scrolling editor (a plank's) takes; the short-editor branch is covered through `useTextEditor`.
    view.dispatch(createEditorStateTransaction({ selection: { anchor: 4 }, scrollTo: 0 }));
    view.dispatch({ selection: { anchor: 2 }, userEvent: 'select', annotations: Transaction.remote.of(true) });
    scroll(view);
    await sleep(400);
    expect(reports.at(-1)).toEqual({ selection: undefined, viewport: expect.any(String) });
  });

  // Vim motions and a Jump or comment reveal set the caret with no user event.
  test('a selection the reader caused without an input event is theirs', async ({ expect }) => {
    const { reports, report } = reporter();
    mount(editorLocation(report)).dispatch({ selection: { anchor: 4 } });
    await sleep(400);
    expect(reports.at(-1)?.selection).toEqual(expect.any(String));
  });

  test('a selection the reader made is reported', async ({ expect }) => {
    const { reports, report } = reporter();
    mount(editorLocation(report)).dispatch({ selection: { anchor: 4 }, userEvent: 'select.pointer' });
    await sleep(400);
    expect(reports.at(-1)?.selection).toEqual(expect.any(String));
  });

  test("a reader's selection is the view's: a new view starts without one, a reconfigure keeps it", async ({
    expect,
  }) => {
    const { reports, report } = reporter();
    const extension = editorLocation(report);
    const compartment = new Compartment();
    const first = mount(extension, compartment);
    first.dispatch({ selection: { anchor: 4 }, userEvent: 'select' });
    first.dispatch({ effects: compartment.reconfigure(editorLocation(report)) });
    scroll(first);
    await sleep(400);
    expect(reports.at(-1)?.selection).toEqual(expect.any(String));

    scroll(mount(extension));
    await sleep(400);
    expect(reports.at(-1)?.selection).toBeUndefined();
  });
});
