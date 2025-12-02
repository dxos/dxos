//
// Copyright 2025 DXOS.org
//

import React, { useMemo, memo, useCallback, useEffect, useRef } from "react";
import { Box, Text, useStdout } from "ink";
import { Message } from "./Message";
import { Input } from "./Input";
import { useMessages } from "../hooks/useMessages";
import { theme } from "../theme";

export type ChatProps = {
	onCommand: (
		command: string,
		addMessage: (msg: {
			role: "user" | "assistant" | "system";
			content: string;
		}) => string,
		updateMessage: (id: string, content: string) => void,
	) => Promise<void>;
};

export const Chat: React.FC<ChatProps> = memo(({ onCommand }) => {
	const { messages, isLoading, setIsLoading, addMessage, updateMessage } =
		useMessages();
	const { stdout } = useStdout();

	const handleSubmit = useCallback(
		async (value: string) => {
			// Add user message
			addMessage({
				role: "user",
				content: value,
			});

			setIsLoading(true);

			try {
				// Execute command with message management functions
				await onCommand(value, addMessage, updateMessage);
			} catch (error) {
				// Add error message
				addMessage({
					role: "system",
					content: `Error: ${error instanceof Error ? error.message : String(error)}`,
				});
			} finally {
				setIsLoading(false);
			}
		},
		[onCommand, addMessage, updateMessage, setIsLoading],
	);

	// Calculate available height for messages
	// Reserve space for status bar (3 lines) and input box (5 lines)
	// Subtract 2 additional lines to prevent status bar from scrolling off
	// Memoize to prevent recalculation on every render
	const messageAreaHeight = useMemo(() => {
		const terminalHeight = stdout?.rows || 24;
		const inputHeight = 5;
		const statusBarHeight = 3;
		const buffer = 2; // Additional buffer to keep status bar visible
		return terminalHeight - inputHeight - statusBarHeight - buffer;
	}, [stdout?.rows]);

	// Implement scrolling: show only the most recent messages that fit
	// We estimate lines per message and work backwards from the end
	const visibleMessages = useMemo(() => {
		if (messages.length === 0) {
			return [];
		}

		const terminalWidth = stdout?.columns || 80;
		const availableWidth = terminalWidth - 4; // Account for padding

		// Start from the end and work backwards, counting estimated lines
		const result: typeof messages = [];
		let estimatedLines = 0;

		for (let i = messages.length - 1; i >= 0; i--) {
			const message = messages[i];

			// Estimate lines for this message:
			// 1. Prefix line (always 1 line)
			// 2. Content lines (count newlines + estimate wrapping)
			// 3. Timestamp line (1 line for user messages)
			// 4. Margin (1 line)

			const contentNewlines = (message.content.match(/\n/g) || []).length + 1;

			// Estimate wrapping: split by newlines and estimate each line's wrapping
			const contentParts = message.content.split("\n");
			let wrappedLines = 0;
			for (const part of contentParts) {
				// Each part might wrap multiple times
				wrappedLines += Math.max(1, Math.ceil(part.length / availableWidth));
			}

			const timestampLines = message.role === "user" ? 1 : 0;
			const marginLines = 1;

			// Use the larger estimate (newlines vs wrapped lines)
			const estimatedMessageLines =
				Math.max(contentNewlines, wrappedLines) + timestampLines + marginLines;

			// Check if we have room for this message
			if (
				estimatedLines + estimatedMessageLines <= messageAreaHeight ||
				result.length === 0
			) {
				// Always include at least one message (the most recent)
				result.unshift(message);
				estimatedLines += estimatedMessageLines;
			} else {
				// No more room
				break;
			}
		}

		return result;
	}, [messages, messageAreaHeight, stdout?.columns]);

	// Track when messages change to scroll to bottom
	const prevMessageCount = useRef(messages.length);
	useEffect(() => {
		// When new messages are added, the visibleMessages calculation
		// will automatically show the most recent messages
		prevMessageCount.current = messages.length;
	}, [messages.length]);

	return (
		<Box flexDirection="column" height="100%">
			{/* Scrollable message area - shows only visible messages */}
			<Box
				flexDirection="column"
				height={messageAreaHeight}
				paddingX={1}
				paddingY={1}
			>
				{messages.length === 0 ? (
					<Box
						flexDirection="column"
						justifyContent="center"
						alignItems="center"
						height="100%"
					>
						<Text color={theme.colors.textDim}>Welcome to DXOS CLI</Text>
						<Text color={theme.colors.textDim} dimColor>
							Type a command to get started
						</Text>
					</Box>
				) : (
					<>
						{visibleMessages.length < messages.length && (
							<Box marginBottom={1}>
								<Text dimColor>
									... {messages.length - visibleMessages.length} earlier message
									{messages.length - visibleMessages.length !== 1 ? "s" : ""}{" "}
									hidden
								</Text>
							</Box>
						)}
						{visibleMessages.map((message) => (
							<Message key={message.id} message={message} />
						))}
					</>
				)}
				{isLoading && (
					<Box marginTop={1}>
						<Text dimColor>● Processing...</Text>
					</Box>
				)}
			</Box>

			{/* Fixed input at bottom - absolute position */}
			<Box width="100%">
				<Input onSubmit={handleSubmit} disabled={isLoading} />
			</Box>
		</Box>
	);
});
