//
// Copyright 2025 DXOS.org
//

import React, { useState, memo } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../theme";

export type InputProps = {
	onSubmit: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
};

/**
 * Multi-line input component with OpenCode-like behavior.
 * - Enter: Submit message
 * - Shift+Enter: New line
 * - Escape: Clear input
 *
 * Memoized to prevent parent re-renders from affecting input performance.
 */
export const Input: React.FC<InputProps> = memo(
	({ onSubmit, placeholder = "", disabled = false }) => {
		const [lines, setLines] = useState<string[]>([""]);
		const [cursorLine, setCursorLine] = useState(0);
		const [cursorCol, setCursorCol] = useState(0);

		useInput(
			(input, key) => {
				if (disabled) {
					return;
				}

				// Submit on Enter (without Shift)
				if (key.return && !key.shift) {
					const value = lines.join("\n").trim();
					if (value) {
						onSubmit(value);
						setLines([""]);
						setCursorLine(0);
						setCursorCol(0);
					}
					return;
				}

				// New line on Shift+Enter
				if (key.return && key.shift) {
					const newLines = [...lines];
					const currentLine = newLines[cursorLine];
					const before = currentLine.slice(0, cursorCol);
					const after = currentLine.slice(cursorCol);

					newLines[cursorLine] = before;
					newLines.splice(cursorLine + 1, 0, after);

					setLines(newLines);
					setCursorLine(cursorLine + 1);
					setCursorCol(0);
					return;
				}

				// Clear input on Escape
				if (key.escape) {
					setLines([""]);
					setCursorLine(0);
					setCursorCol(0);
					return;
				}

				// Backspace
				if (key.backspace || key.delete) {
					const newLines = [...lines];
					const currentLine = newLines[cursorLine];

					if (cursorCol > 0) {
						// Delete character before cursor
						newLines[cursorLine] =
							currentLine.slice(0, cursorCol - 1) +
							currentLine.slice(cursorCol);
						setCursorCol(cursorCol - 1);
					} else if (cursorLine > 0) {
						// Merge with previous line
						const prevLine = newLines[cursorLine - 1];
						newLines[cursorLine - 1] = prevLine + currentLine;
						newLines.splice(cursorLine, 1);
						setCursorLine(cursorLine - 1);
						setCursorCol(prevLine.length);
					}

					setLines(newLines.length === 0 ? [""] : newLines);
					return;
				}

				// Arrow keys
				if (key.upArrow && cursorLine > 0) {
					setCursorLine(cursorLine - 1);
					setCursorCol(Math.min(cursorCol, lines[cursorLine - 1].length));
					return;
				}

				if (key.downArrow && cursorLine < lines.length - 1) {
					setCursorLine(cursorLine + 1);
					setCursorCol(Math.min(cursorCol, lines[cursorLine + 1].length));
					return;
				}

				if (key.leftArrow && cursorCol > 0) {
					setCursorCol(cursorCol - 1);
					return;
				}

				if (key.rightArrow && cursorCol < lines[cursorLine].length) {
					setCursorCol(cursorCol + 1);
					return;
				}

				// Home key (Ctrl+A)
				if (key.ctrl && input === "a") {
					setCursorCol(0);
					return;
				}

				// End key (Ctrl+E)
				if (key.ctrl && input === "e") {
					setCursorCol(lines[cursorLine].length);
					return;
				}

				// End key (Ctrl+E)
				if (key.ctrl && input === "e") {
					setCursorCol(lines[cursorLine].length);
					return;
				}

				// End key (Ctrl+E)
				if (key.ctrl && input === "e") {
					setCursorCol(lines[cursorLine].length);
					return;
				}

				// Regular character input
				if (input && !key.ctrl && !key.meta) {
					const newLines = [...lines];
					const currentLine = newLines[cursorLine];
					newLines[cursorLine] =
						currentLine.slice(0, cursorCol) +
						input +
						currentLine.slice(cursorCol);
					setLines(newLines);
					setCursorCol(cursorCol + input.length);
				}
			},
			{ isActive: !disabled },
		);

		const isEmpty = lines.length === 1 && lines[0] === "";

		return (
			<Box flexDirection="column" width="100%">
				<Box
					flexDirection="column"
					borderStyle="single"
					borderColor={theme.colors.border}
					paddingX={1}
					width="100%"
				>
					{isEmpty ? (
						<Box>
							<Text color={theme.colors.primary}>❯ </Text>
							<Text dimColor>{placeholder}</Text>
							<Text inverse> </Text>
						</Box>
					) : (
						lines.map((line, i) => (
							<Box key={`input-line-${i}`}>
								<Text color={theme.colors.primary}>
									{i === 0 ? "❯ " : "… "}
								</Text>
								<Text>
									{line.slice(0, cursorCol)}
									{i === cursorLine && <Text inverse> </Text>}
									{line.slice(cursorCol)}
								</Text>
							</Box>
						))
					)}
					<Box marginTop={1}>
						<Text dimColor>
							Enter to send • Shift+Enter for new line • Esc to clear
						</Text>
					</Box>
				</Box>
			</Box>
		);
	},
);
