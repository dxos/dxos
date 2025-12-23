//
// Copyright 2024 DXOS.org
//

import { type DocHandle, Repo } from "@automerge/automerge-repo";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { render, screen } from "@testing-library/react";
import React, { type FC, useEffect, useRef, useState } from "react";
import { describe, test } from "vitest";

import { get } from "@dxos/util";

import { automerge } from "./automerge";

type TestObject = {
	text: string;
};

const path = ["text"];

class Generator {
	constructor(private readonly _handle: DocHandle<TestObject>) {}
	update(text: string): void {
		this._handle.change((doc: TestObject) => {
			doc.text = text;
		});
	}
}

const Test: FC<{ handle: DocHandle<TestObject>; generator: Generator }> = ({
	handle,
	generator,
}) => {
	const ref = useRef<HTMLDivElement>(null);
	const [view, setView] = useState<EditorView>();
	useEffect(() => {
		const extensions = [
			// TODO(mykola): Fix types.
			automerge({ handle: handle as any, path }),
			EditorView.updateListener.of((update) => {
				if (view.state.doc.toString() === "hello!") {
					// Update editor.
					update.view.dispatch({
						changes: { from: view.state.doc.length - 1, insert: " world" },
					});
				}
			}),
		];

		const view = new EditorView({
			state: EditorState.create({ doc: get(handle.doc()!, path), extensions }),
			parent: ref.current!,
		});

		setView(view);
	}, []);

	useEffect(() => {}, [view]);

	return <div ref={ref} data-testid="editor" />;
};

describe("Automerge", () => {
	test("basic sync", ({ expect }) => {
		const repo = new Repo({ network: [] });
		const handle = repo.create<TestObject>();
		const generator = new Generator(handle);
		render(<Test handle={handle} generator={generator} />);
		const editor = screen.getByTestId("editor");
		expect(editor.textContent).toBe("");

		generator.update("hello!");
		expect(editor.textContent).toBe("hello world!");
	});

	// TODO(burdon): Test history/undo.
	// TODO(burdon): https://testing-library.com/docs/react-testing-library/example-intro/
});
