//
// Copyright 2025 DXOS.org
//

import React from "react";
import { Box, Text } from "ink";
import { type Message as MessageType } from "../types";
import { theme } from "../theme";

export type MessageProps = {
	message: MessageType;
};

// Memoize to prevent unnecessary re-renders during streaming
export const Message: React.FC<MessageProps> = React.memo(({ message }) => {
	const getColor = () => {
		switch (message.role) {
			case "user":
				return theme.colors.primary;
			case "assistant":
				return theme.colors.text;
			case "system":
				return theme.colors.textDim;
			default:
				return theme.colors.text;
		}
	};

	const getPrefix = () => {
		switch (message.role) {
			case "user":
				return "❯ ";
			case "assistant":
				return ""; // No prefix for assistant
			case "system":
				return "• ";
			default:
				return "";
		}
	};

	// Don't show timestamp for assistant messages to reduce flicker during streaming
	const showTimestamp = message.role === "user";

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				{getPrefix() && (
					<Text color={getColor()} bold>
						{getPrefix()}
					</Text>
				)}
				<Text color={getColor()} dimColor={message.role === "system"}>
					{message.content}
				</Text>
			</Box>
			{showTimestamp && (
				<Box marginLeft={2}>
					<Text dimColor>{message.timestamp.toLocaleTimeString()}</Text>
				</Box>
			)}
		</Box>
	);
});
