#!/usr/bin/env node

import { readFileSync } from "fs";
import { globby } from "globby";
import path from "path";

// Find all package.json files in the workspace
const packageJsonFiles = await globby("packages/**/package.json", {
	ignore: ["**/node_modules/**", "**/dist/**"],
});

// Build a map of package name -> dependencies
const packageMap = new Map();

for (const file of packageJsonFiles) {
	const content = JSON.parse(readFileSync(file, "utf-8"));
	const name = content.name;

	if (!name || !name.startsWith("@dxos/")) continue;

	const deps = new Set();

	// Collect all @dxos dependencies
	for (const depType of [
		"dependencies",
		"devDependencies",
		"peerDependencies",
	]) {
		if (content[depType]) {
			for (const dep of Object.keys(content[depType])) {
				if (dep.startsWith("@dxos/")) {
					deps.add(dep);
				}
			}
		}
	}

	packageMap.set(name, {
		path: file,
		deps: Array.from(deps),
	});
}

console.log(`Found ${packageMap.size} @dxos packages\n`);

// Function to detect cycles using DFS
function findCycles(graph) {
	const visited = new Set();
	const recursionStack = new Set();
	const cycles = [];

	function dfs(node, path = []) {
		if (recursionStack.has(node)) {
			// Found a cycle
			const cycleStart = path.indexOf(node);
			const cycle = [...path.slice(cycleStart), node];
			cycles.push(cycle);
			return;
		}

		if (visited.has(node)) {
			return;
		}

		visited.add(node);
		recursionStack.add(node);
		path.push(node);

		const nodeData = graph.get(node);
		if (nodeData) {
			for (const dep of nodeData.deps) {
				if (graph.has(dep)) {
					dfs(dep, [...path]);
				}
			}
		}

		recursionStack.delete(node);
	}

	// Check all nodes
	for (const node of graph.keys()) {
		if (!visited.has(node)) {
			dfs(node);
		}
	}

	return cycles;
}

const cycles = findCycles(packageMap);

if (cycles.length === 0) {
	console.log("✓ No circular dependencies found!");
} else {
	console.log(`✗ Found ${cycles.length} circular dependencies:\n`);

	// Deduplicate cycles (same cycle in different orders)
	const uniqueCycles = new Map();
	for (const cycle of cycles) {
		const sorted = [...cycle].sort().join(" -> ");
		if (!uniqueCycles.has(sorted)) {
			uniqueCycles.set(sorted, cycle);
		}
	}

	let i = 1;
	for (const cycle of uniqueCycles.values()) {
		console.log(`${i}) Cycle:`);
		for (let j = 0; j < cycle.length - 1; j++) {
			console.log(`   ${cycle[j]}`);
			console.log(`   ↓`);
		}
		console.log(`   ${cycle[cycle.length - 1]} (back to start)`);
		console.log();
		i++;
	}

	process.exit(1);
}
