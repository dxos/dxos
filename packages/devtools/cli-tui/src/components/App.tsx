//
// Copyright 2025 DXOS.org
//

import React, { useState, useCallback } from "react";
import { Box } from "ink";
import { StatusBar } from "./StatusBar";
import { Chat } from "./Chat";

export type AppProps = {
	onCommand: (
		command: string,
		addMessage: (msg: {
			role: "user" | "assistant" | "system";
			content: string;
		}) => string,
		updateMessage: (id: string, content: string) => void,
	) => Promise<void>;
	title?: string;
};

export const App: React.FC<AppProps> = ({ onCommand, title = "DXOS CLI" }) => {
	const [status, setStatus] = useState<"idle" | "active" | "error">("idle");
	const [statusText, setStatusText] = useState<string>();

	const handleCommand = useCallback(
		async (
			command: string,
			addMessage: (msg: {
				role: "user" | "assistant" | "system";
				content: string;
			}) => string,
			updateMessage: (id: string, content: string) => void,
		) => {
			setStatus("active");
			setStatusText("Processing...");

			try {
				await onCommand(command, addMessage, updateMessage);
				setStatus("idle");
				setStatusText(undefined);
			} catch (error) {
				setStatus("error");
				setStatusText(
					error instanceof Error ? error.message : "Command failed",
				);
				throw error;
			}
		},
		[onCommand],
	);

	return (
		<Box flexDirection="column" height="100%" width="100%">
			<Box flexShrink={0}>
				<StatusBar title={title} status={status} statusText={statusText} />
			</Box>
			<Box flexGrow={1} flexDirection="column">
				<Chat onCommand={handleCommand} />
			</Box>
		</Box>
	);
};
