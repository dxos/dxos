//
// Copyright 2025 DXOS.org
//

import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme";

export type StatusBarProps = {
	title?: string;
	status?: "idle" | "active" | "error";
	statusText?: string;
};

export const StatusBar: React.FC<StatusBarProps> = ({
	title = "DXOS CLI",
	status = "idle",
	statusText,
}) => {
	const getStatusColor = () => {
		switch (status) {
			case "active":
				return theme.colors.success;
			case "error":
				return theme.colors.error;
			default:
				return theme.colors.textDim;
		}
	};

	const getStatusIndicator = () => {
		switch (status) {
			case "active":
				return "●";
			case "error":
				return "✖";
			default:
				return "○";
		}
	};

	return (
		<Box
			borderStyle="single"
			borderColor={theme.colors.border}
			paddingX={1}
			width="100%"
		>
			<Box flexGrow={1}>
				<Text bold color={theme.colors.primary}>
					{title}
				</Text>
			</Box>
			{statusText && (
				<Box marginLeft={2} key="status-text">
					<Text color={getStatusColor()}>
						{getStatusIndicator()} {statusText}
					</Text>
				</Box>
			)}
		</Box>
	);
};
