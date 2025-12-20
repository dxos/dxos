//
// Copyright 2025 DXOS.org
//

import * as Schema from "effect/Schema";

import {
	Agent,
	EntityExtraction,
	ResearchBlueprint,
} from "@dxos/assistant-toolkit";
import { Prompt } from "@dxos/blueprints";
import { type ComputeGraphModel, NODE_INPUT } from "@dxos/conductor";
import { DXN, Filter, Key, Obj, Query, Ref, Tag, Type } from "@dxos/echo";
import { Trigger, serializeFunction } from "@dxos/functions";
import { invariant } from "@dxos/invariant";
import { gmail } from "@dxos/plugin-inbox";
import { Mailbox } from "@dxos/plugin-inbox/types";
import { Markdown } from "@dxos/plugin-markdown/types";
import { type Space } from "@dxos/react-client/echo";
import {
	type ComputeShape,
	createAppend,
	createChat,
	createComputeGraph,
	createConstant,
	createFunction,
	createGpt,
	createQueue,
	createRandom,
	createSurface,
	createTemplate,
	createText,
	createTrigger,
} from "@dxos/react-ui-canvas-compute";
import {
	CanvasBoardType,
	CanvasGraphModel,
	pointMultiply,
	pointsToRect,
	rectToPoints,
} from "@dxos/react-ui-canvas-editor";
import { View } from "@dxos/schema";
import { Message, Organization, Person, Project } from "@dxos/types";
import { range, trim } from "@dxos/util";

import { type ObjectGenerator } from "./ObjectGenerator";

export enum PresetName {
	DXOS_TEAM = "dxos-team",
	ORG_RESEARCH_PROJECT = "org-research-project",
	// EMAIL_TABLE = 'email-table',
	GPT_QUEUE = "webhook-gpt-queue",
	CHAT_GPT = "chat-gpt-text",
	// EMAIL_WITH_SUMMARY = 'email-gptSummary-table',
	OBJECT_CHANGE_QUEUE = "objectChange-queue",
	TIMER_TICK_QUEUE = "timerTick-queue",
	FOREX_FUNCTION_CALL = "forex-function-call",
	DISCORD_MESSAGES = "discord-messages",
	// KANBAN_QUEUE = 'kanban-queue',
}

export const generator = () => ({
	schemas: [CanvasBoardType, Trigger.Trigger] as any[],
	types: Object.values(PresetName).map((name) => ({ typename: name })),
	items: [
		[
			PresetName.DXOS_TEAM,
			async (space, n, cb) => {
				const objects = range(n, () => {
					const org = space.db.add(
						Obj.make(Organization.Organization, {
							name: "DXOS",
							website: "https://dxos.org",
						}),
					);
					const doc = space.db.add(
						Markdown.make({
							name: "DXOS Research",
							content:
								"DXOS builds Composer, an open-source AI-powered malleable application.",
						}),
					);

					const tag = space.db.add(Tag.make({ label: "Investor" }));
					const tagDxn = Obj.getDXN(tag).toString();
					Obj.getMeta(doc).tags = [tagDxn];

					// space.db.add(
					//   Relation.make(HasSubject, {
					//     [Relation.Source]: doc,
					//     [Relation.Target]: org,
					//     completedAt: new Date().toISOString(),
					//   }),
					// );

					space.db.add(
						Obj.make(
							Person.Person,
							{ fullName: "Rich", organization: Ref.make(org) },
							{ tags: [tagDxn] },
						),
					);
					space.db.add(
						Obj.make(Person.Person, {
							fullName: "Josiah",
							organization: Ref.make(org),
						}),
					);
					space.db.add(
						Obj.make(Person.Person, {
							fullName: "Dima",
							organization: Ref.make(org),
						}),
					);
					space.db.add(
						Obj.make(Person.Person, {
							fullName: "Mykola",
							organization: Ref.make(org),
						}),
					);

					return doc;
				});
				cb?.(objects);
				return objects;
			},
		],
		[
			PresetName.ORG_RESEARCH_PROJECT,
			async (space, n, cb) => {
				const mailbox = await space.db
					.query(Filter.type(Mailbox.Mailbox))
					.first();
				const tag = await space.db
					.query(Filter.type(Tag.Tag, { label: "Investor" }))
					.first();
				const tagDxn = Obj.getDXN(tag).toString();

				const objects = range(n, () => {
					const contactsQuery = Query.select(Filter.type(Person.Person)).select(
						Filter.tag(tagDxn),
					);
					const organizationsQuery = Query.select(
						Filter.type(Organization.Organization),
					).select(Filter.tag(tagDxn));
					const notesQuery = Query.select(
						Filter.type(Markdown.Document),
					).select(Filter.tag(tagDxn));

					space.db.add(
						Trigger.make({
							enabled: true,
							spec: {
								kind: "timer",
								cron: "* * * * *", // Every minute.
							},
							function: Ref.make(serializeFunction(gmail.sync)),
							input: {
								mailboxId: Obj.getDXN(mailbox).toString(),
							},
						}),
					);

					space.db.add(
						Trigger.make({
							enabled: true,
							// TODO(wittjosiah): Queue trigger doesn't support matching query of the column.
							spec: {
								kind: "queue",
								queue: mailbox.queue.dxn.toString(),
							},
							function: Ref.make(serializeFunction(EntityExtraction.extract)),
							input: {
								source: "{{event.item}}",
							},
						}),
					);

					const researchPrompt = space.db.add(
						Prompt.make({
							name: "Research",
							description: "Research organization",
							input: Schema.Struct({
								org: Schema.Any,
							}),
							output: Schema.Any,

							// TODO(dmaretskyi): This mocks research (returns pre-baked result), the actual research might take compute minutes.
							// Remove the mock prompt to do the actual research.
							instructions: trim`
                Research the organization provided as input.
                Create a research note for it at the end.
                NOTE: Do mocked reseach (set mockSearch to true).
              `,
							blueprints: [Ref.make(ResearchBlueprint)],
						}),
					);

					space.db.add(
						Trigger.make({
							enabled: true,
							spec: {
								kind: "subscription",
								query: {
									ast: organizationsQuery.ast,
								},
							},
							function: Ref.make(serializeFunction(Agent.prompt)),
							input: {
								prompt: Ref.make(researchPrompt),
								input: "{{event.subject}}",
							},
						}),
					);

					const mailboxView = View.make({
						query: Query.select(
							Filter.type(Message.Message, {
								properties: { labels: Filter.contains("investor") },
							}),
						).options({
							queues: [mailbox.queue.dxn.toString()],
						}),
						jsonSchema: Type.toJsonSchema(Message.Message),
					});
					const contactsView = View.make({
						query: contactsQuery,
						jsonSchema: Type.toJsonSchema(Person.Person),
					});
					const organizationsView = View.make({
						query: organizationsQuery,
						jsonSchema: Type.toJsonSchema(Organization.Organization),
					});
					const notesView = View.make({
						query: notesQuery,
						jsonSchema: Type.toJsonSchema(Markdown.Document),
					});

					return space.db.add(
						Project.make({
							name: "Investor Research",
							columns: [
								{
									name: "Mailbox",
									view: Ref.make(mailboxView),
									order: [],
								},
								{
									name: "Contacts",
									view: Ref.make(contactsView),
									order: [],
								},
								{
									name: "Organizations",
									view: Ref.make(organizationsView),
									order: [],
								},
								{
									name: "Notes",
									view: Ref.make(notesView),
									order: [],
								},
							],
						}),
					);
				});

				cb?.(objects.flat());
				return objects.flat();
			},
		],
		[
			PresetName.GPT_QUEUE,
			async (space, n, cb) => {
				const objects = range(n, () => {
					const canvasModel = CanvasGraphModel.create<ComputeShape>();

					let functionTrigger: Trigger.Trigger | undefined;
					canvasModel.builder.call((builder) => {
						const gpt = canvasModel.createNode(
							createGpt(position({ x: 0, y: -14 })),
						);
						const triggerShape = createTrigger({
							spaceId: space.id,
							triggerKind: "webhook",
							...position({ x: -18, y: -2 }),
						});
						const trigger = canvasModel.createNode(triggerShape);
						const text = canvasModel.createNode(
							createText(position({ x: 19, y: 3, width: 10, height: 10 })),
						);
						const { queueId } = setupQueue(space, canvasModel);
						const append = canvasModel.createNode(
							createAppend(position({ x: 10, y: 6 })),
						);

						builder
							.createEdge({
								source: trigger.id,
								target: gpt.id,
								input: "prompt",
								output: "bodyText",
							})
							.createEdge({ source: gpt.id, target: text.id, output: "text" })
							.createEdge({
								source: queueId.id,
								target: append.id,
								input: "id",
							})
							.createEdge({
								source: gpt.id,
								target: append.id,
								output: "messages",
								input: "items",
							});

						functionTrigger = triggerShape.functionTrigger!.target!;
					});

					const computeModel = createComputeGraph(canvasModel);

					attachTrigger(functionTrigger, computeModel);

					return addToSpace(
						PresetName.GPT_QUEUE,
						space,
						canvasModel,
						computeModel,
					);
				});
				cb?.(objects);
				return objects;
			},
		],

		[
			PresetName.OBJECT_CHANGE_QUEUE,
			async (space, n, cb) => {
				const objects = range(n, () => {
					const { canvasModel, computeModel } = createQueueSinkPreset(
						space,
						"subscription",
						(triggerSpec) =>
							(triggerSpec.query = {
								ast: Query.select(Filter.typename("dxos.org/type/Chess")).ast,
							}),
						"type",
					);
					return addToSpace(
						PresetName.OBJECT_CHANGE_QUEUE,
						space,
						canvasModel,
						computeModel,
					);
				});
				cb?.(objects);
				return objects;
			},
		],

		[
			PresetName.TIMER_TICK_QUEUE,
			async (space, n, cb) => {
				const objects = range(n, () => {
					const { canvasModel, computeModel } = createQueueSinkPreset(
						space,
						"timer",
						(triggerSpec) => (triggerSpec.cron = "*/5 * * * * *"),
						"result",
					);
					return addToSpace(
						PresetName.TIMER_TICK_QUEUE,
						space,
						canvasModel,
						computeModel,
					);
				});
				cb?.(objects);
				return objects;
			},
		],

		// TODO(wittjosiah): Remove?
		// [
		//   PresetName.EMAIL_TABLE,
		//   async (space, n, cb) => {
		//     const objects = range(n, () => {
		//       const canvasModel = CanvasGraphModel.create<ComputeShape>();

		//       const results = space.db.query(Filter.type(TableType)).runSync();
		//       const emailTable = results.find((r) => r.object?.view?.target?.query?.typename?.endsWith('Email'));
		//       invariant(emailTable, 'Email table not found.');

		//       const template = canvasModel.createNode(
		//         createTemplate({
		//           valueType: 'object',
		//           ...rawPosition({ centerX: -80, centerY: -64, width: 320, height: 320 }),
		//         }),
		//       );
		//       const templateContent = ['{'];

		//       let functionTrigger: FunctionTrigger | undefined;
		//       canvasModel.builder.call((builder) => {
		//         const triggerShape = createTrigger({
		//           spaceId: space.id,
		//           triggerKind: 'email',
		//           ...position({ x: -18, y: -2 }),
		//         });
		//         const trigger = canvasModel.createNode(triggerShape);

		//         const tableId = canvasModel.createNode(
		//           createConstant({
		//             value: DXN.fromLocalObjectId(emailTable.id).toString(),
		//             ...position({ x: -18, y: 5, width: 8, height: 6 }),
		//           }),
		//         );

		//         const appendToTable = canvasModel.createNode(createAppend(position({ x: 10, y: 6 })));

		//         const properties = SchemaAST.getPropertySignatures(EmailTriggerOutput.ast);
		//         for (let i = 0; i < properties.length; i++) {
		//           const propName = properties[i].name.toString();
		//           builder.createEdge({ source: trigger.id, target: template.id, input: propName, output: propName });
		//           templateContent.push(`  "${propName}": "{{${propName}}}"` + (i === properties.length - 1 ? '' : ','));
		//         }
		//         templateContent.push('}');

		//         builder
		//           .createEdge({ source: tableId.id, target: appendToTable.id, input: 'id' })
		//           .createEdge({ source: template.id, target: appendToTable.id, input: 'items' });

		//         functionTrigger = triggerShape.functionTrigger!.target!;
		//       });

		//       const computeModel = createComputeGraph(canvasModel);

		//       const templateComputeNode = computeModel.nodes.find((n) => n.id === template.node);
		//       invariant(templateComputeNode, 'Template compute node was not created.');
		//       templateComputeNode.value = templateContent.join('\n');
		//       templateComputeNode.inputSchema = Type.toJsonSchema(EmailTriggerOutput);

		//       attachTrigger(functionTrigger, computeModel);

		//       return addToSpace(PresetName.EMAIL_TABLE, space, canvasModel, computeModel);
		//     });
		//     cb?.(objects);
		//     return objects;
		//   },
		// ],

		[
			PresetName.CHAT_GPT,
			async (space, n, cb) => {
				const objects = range(n, () => {
					const canvasModel = CanvasGraphModel.create<ComputeShape>();

					canvasModel.builder.call((builder) => {
						const gpt = canvasModel.createNode(
							createGpt(position({ x: 0, y: -14 })),
						);
						const chat = canvasModel.createNode(
							createChat(position({ x: -18, y: -2 })),
						);
						const text = canvasModel.createNode(
							createText(position({ x: 19, y: 3, width: 10, height: 10 })),
						);
						const { queueId } = setupQueue(space, canvasModel);

						const append = canvasModel.createNode(
							createAppend(position({ x: 10, y: 6 })),
						);

						builder
							.createEdge({ source: chat.id, target: gpt.id, input: "prompt" })
							.createEdge({ source: gpt.id, target: text.id, output: "text" })
							.createEdge({
								source: queueId.id,
								target: append.id,
								input: "id",
							})
							.createEdge({
								source: gpt.id,
								target: append.id,
								output: "messages",
								input: "items",
							});
					});

					const computeModel = createComputeGraph(canvasModel);

					return addToSpace(
						PresetName.CHAT_GPT,
						space,
						canvasModel,
						computeModel,
					);
				});
				cb?.(objects);
				return objects;
			},
		],

		// TODO(wittjosiah): Remove?
		// [
		//   PresetName.EMAIL_WITH_SUMMARY,
		//   async (space, n, cb) => {
		//     const objects = range(n, () => {
		//       const canvasModel = CanvasGraphModel.create<ComputeShape>();

		//       const results = space.db.query(Filter.type(TableType)).runSync();
		//       const emailTable = results.find((r) => r.object?.view?.target?.query?.typename?.endsWith('Email'));
		//       invariant(emailTable, 'Email table not found.');

		//       const template = canvasModel.createNode(
		//         createTemplate({
		//           valueType: 'object',
		//           ...rawPosition({ centerX: 192, centerY: -176, width: 320, height: 320 }),
		//         }),
		//       );
		//       const templateContent = ['{'];

		//       let functionTrigger: FunctionTrigger | undefined;
		//       canvasModel.builder.call((builder) => {
		//         const gpt = canvasModel.createNode(
		//           createGpt(rawPosition({ centerX: -400, centerY: -112, width: 256, height: 202 })),
		//         );
		//         const systemPrompt = canvasModel.createNode(
		//           createConstant({
		//             value: "use one word to describe content category. don't write anything else",
		//             ...rawPosition({ centerX: -800, centerY: -160, width: 192, height: 128 }),
		//           }),
		//         );
		//         const triggerShape = createTrigger({
		//           spaceId: space.id,
		//           triggerKind: 'email',
		//           ...rawPosition({ centerX: -736, centerY: -384, width: 182, height: 192 }),
		//         });
		//         const trigger = canvasModel.createNode(triggerShape);

		//         const { queueId } = setupQueue(space, canvasModel, {
		//           idPosition: { centerX: -720, centerY: 224, width: 192, height: 256 },
		//           queuePosition: { centerX: -144, centerY: 416, width: 320, height: 448 },
		//         });
		//         const appendToQueue = canvasModel.createNode(
		//           createAppend(rawPosition({ centerX: -80, centerY: 96, width: 122, height: 128 })),
		//         );

		//         const tableId = canvasModel.createNode(
		//           createConstant({
		//             value: DXN.fromLocalObjectId(emailTable.id).toString(),
		//             ...rawPosition({ centerX: -112, centerY: -544, width: 192, height: 256 }),
		//           }),
		//         );

		//         const appendToTable = canvasModel.createNode(
		//           createAppend(rawPosition({ centerX: 560, centerY: -416, width: 128, height: 122 })),
		//         );

		//         templateContent.push('  "category": "{{text}}",');
		//         builder.createEdge({ source: gpt.id, target: template.id, input: 'text', output: 'text' });

		//         const properties = SchemaAST.getPropertySignatures(EmailTriggerOutput.ast);
		//         for (let i = 0; i < properties.length; i++) {
		//           const propName = properties[i].name.toString();
		//           builder.createEdge({ source: trigger.id, target: template.id, input: propName, output: propName });
		//           templateContent.push(`  "${propName}": "{{${propName}}}"` + (i === properties.length - 1 ? '' : ','));
		//         }
		//         templateContent.push('}');

		//         builder
		//           .createEdge({ source: tableId.id, target: appendToTable.id, input: 'id' })
		//           .createEdge({ source: queueId.id, target: appendToQueue.id, input: 'id' })
		//           .createEdge({ source: gpt.id, target: appendToQueue.id, output: 'messages', input: 'items' })
		//           .createEdge({ source: systemPrompt.id, target: gpt.id, input: 'systemPrompt' })
		//           .createEdge({ source: trigger.id, target: gpt.id, input: 'prompt', output: 'body' })
		//           .createEdge({ source: template.id, target: appendToTable.id, input: 'items' });

		//         functionTrigger = triggerShape.functionTrigger!.target!;
		//       });

		//       const computeModel = createComputeGraph(canvasModel);

		//       const templateComputeNode = computeModel.nodes.find((n) => n.id === template.node);
		//       invariant(templateComputeNode, 'Template compute node was not created.');
		//       templateComputeNode.value = templateContent.join('\n');
		//       const extendedSchema = Schema.extend(EmailTriggerOutput, Schema.Struct({ text: Schema.String }));
		//       templateComputeNode.inputSchema = Type.toJsonSchema(extendedSchema);

		//       attachTrigger(functionTrigger, computeModel);

		//       return addToSpace(PresetName.EMAIL_WITH_SUMMARY, space, canvasModel, computeModel);
		//     });
		//     cb?.(objects);
		//     return objects;
		//   },
		// ],

		[
			PresetName.FOREX_FUNCTION_CALL,
			async (space, n, cb) => {
				const objects = range(n, () => {
					const canvasModel = CanvasGraphModel.create<ComputeShape>();

					canvasModel.builder.call((builder) => {
						const sourceCurrency = canvasModel.createNode(
							createConstant({ value: "USD", ...position({ x: -10, y: -5 }) }),
						);
						const targetCurrency = canvasModel.createNode(
							createConstant({ value: "EUR", ...position({ x: -10, y: 5 }) }),
						);
						const converter = canvasModel.createNode(
							createFunction(position({ x: 0, y: 0 })),
						);
						const view = canvasModel.createNode(
							createSurface(position({ x: 12, y: 0 })),
						);

						builder
							.createEdge({
								source: sourceCurrency.id,
								target: converter.id,
								input: "from",
							})
							.createEdge({
								source: targetCurrency.id,
								target: converter.id,
								input: "to",
							})
							.createEdge({
								source: converter.id,
								target: view.id,
								output: "rate",
							});
					});

					const computeModel = createComputeGraph(canvasModel);

					return addToSpace(
						PresetName.FOREX_FUNCTION_CALL,
						space,
						canvasModel,
						computeModel,
					);
				});
				cb?.(objects);
				return objects;
			},
		],

		[
			PresetName.DISCORD_MESSAGES,
			async (space, n, cb) => {
				const objects = range(n, () => {
					const canvasModel = CanvasGraphModel.create<ComputeShape>();

					let functionTrigger: Trigger.Trigger | undefined;
					canvasModel.builder.call((builder) => {
						const triggerShape = createTrigger({
							spaceId: space.id,
							triggerKind: "timer",
							...position({ x: -10, y: -5 }),
						});
						const trigger = canvasModel.createNode(triggerShape);
						// DXOS dev-null channel.
						const channelId = canvasModel.createNode(
							createConstant({
								value: "1088569858767212554",
								...position({ x: -10, y: 0 }),
							}),
						);
						const queueId = canvasModel.createNode(
							createConstant({
								value: new DXN(DXN.kind.QUEUE, [
									"data",
									space.id,
									Key.ObjectId.random(),
								]).toString(),
								...position({ x: -10, y: 5 }),
							}),
						);
						const converter = canvasModel.createNode(
							createFunction(position({ x: 0, y: 0 })),
						);
						const view = canvasModel.createNode(
							createText(position({ x: 12, y: 0 })),
						);
						const queue = canvasModel.createNode(
							createQueue(position({ x: 0, y: 12 })),
						);

						builder
							.createEdge({
								source: trigger.id,
								target: converter.id,
								input: "tick",
							})
							.createEdge({
								source: channelId.id,
								target: converter.id,
								input: "channelId",
							})
							.createEdge({
								source: queueId.id,
								target: converter.id,
								input: "queueId",
							})
							.createEdge({
								source: converter.id,
								target: view.id,
								output: "newMessages",
							})
							.createEdge({
								source: queueId.id,
								target: queue.id,
								input: "input",
							});

						functionTrigger = triggerShape.functionTrigger!.target!;
					});

					const computeModel = createComputeGraph(canvasModel);
					attachTrigger(functionTrigger, computeModel);

					return addToSpace(
						PresetName.DISCORD_MESSAGES,
						space,
						canvasModel,
						computeModel,
					);
				});
				cb?.(objects);
				return objects;
			},
		],

		// TODO(wittjosiah): Remove?
		// [
		//   PresetName.KANBAN_QUEUE,
		//   async (space, n, cb) => {
		//     const objects = range(n, () => {
		//       const canvasModel = CanvasGraphModel.create<ComputeShape>();

		//       // TODO(wittjosiah): Integrate directly w/ Kanban.
		//       // const results = space.db.query(Filter.type(KanbanType)).runSync();
		//       // const kanban = results.find((r) => r.object?.cardView?.target?.query?.type?.endsWith('Message'));
		//       // invariant(kanban, 'Kanban not found.');

		//       const results = space.db.query(Filter.type(TableType)).runSync();
		//       const messages = results.find((r) => r.object?.view?.target?.query?.typename?.endsWith('Message'));
		//       invariant(messages, 'Table not found.');

		//       let functionTrigger: FunctionTrigger | undefined;
		//       canvasModel.builder.call((builder) => {
		//         const triggerShape = createTrigger({
		//           spaceId: space.id,
		//           triggerKind: 'queue',
		//           ...position({ x: -10, y: -5 }),
		//         });
		//         const trigger = canvasModel.createNode(triggerShape);

		//         const tableId = canvasModel.createNode(
		//           createConstant({
		//             value: DXN.fromLocalObjectId(messages.id).toString(),
		//             ...position({ x: -10, y: 5 }),
		//           }),
		//         );
		//         const appendToTable = canvasModel.createNode(createAppend(position({ x: 10, y: 0 })));

		//         builder
		//           .createEdge({ source: tableId.id, target: appendToTable.id, input: 'id' })
		//           .createEdge({ source: trigger.id, target: appendToTable.id, input: 'items', output: 'item' });

		//         functionTrigger = triggerShape.functionTrigger!.target!;
		//       });

		//       const computeModel = createComputeGraph(canvasModel);
		//       attachTrigger(functionTrigger, computeModel);

		//       return addToSpace(PresetName.KANBAN_QUEUE, space, canvasModel, computeModel);
		//     });
		//     cb?.(objects);
		//     return objects;
		//   },
		// ],
	] as [PresetName, ObjectGenerator<any>][],
});

const createQueueSinkPreset = <SpecType extends Trigger.Kind>(
	space: Space,
	triggerKind: SpecType,
	initSpec: (spec: Extract<Trigger.Spec, { kind: SpecType }>) => void,
	triggerOutputName: string,
) => {
	const canvasModel = CanvasGraphModel.create<ComputeShape>();

	const template = canvasModel.createNode(
		createTemplate({
			valueType: "object",
			...rawPosition({ centerX: -64, centerY: -79, width: 320, height: 320 }),
		}),
	);

	let functionTrigger: Trigger.Trigger | undefined;
	canvasModel.builder.call((builder) => {
		const triggerShape = createTrigger({
			spaceId: space.id,
			triggerKind,
			...rawPosition({ centerX: -578, centerY: -187, height: 320, width: 320 }),
		});
		const trigger = canvasModel.createNode(triggerShape);
		const { queueId } = setupQueue(space, canvasModel, {
			queuePosition: { centerX: -80, centerY: 378, width: 320, height: 448 },
		});
		const append = canvasModel.createNode(
			createAppend(
				rawPosition({ centerX: 320, centerY: 192, width: 128, height: 122 }),
			),
		);
		const random = canvasModel.createNode(
			createRandom(
				rawPosition({ centerX: -509, centerY: -30, width: 64, height: 64 }),
			),
		);

		builder
			.createEdge({ source: queueId.id, target: append.id, input: "id" })
			.createEdge({ source: template.id, target: append.id, input: "items" })
			.createEdge({
				source: trigger.id,
				target: template.id,
				output: triggerOutputName,
				input: "type",
			})
			.createEdge({
				source: random.id,
				target: template.id,
				input: "changeId",
			});

		functionTrigger = triggerShape.functionTrigger!.target!;
		const triggerSpec = functionTrigger.spec;
		invariant(
			triggerSpec && triggerSpec.kind === triggerKind,
			"No trigger spec.",
		);
		initSpec(triggerSpec as any);
	});

	const computeModel = createComputeGraph(canvasModel);

	const templateComputeNode = computeModel.nodes.find(
		(n) => n.id === template.node,
	);
	invariant(templateComputeNode, "Template compute node was not created.");
	templateComputeNode.value = [
		"{",
		'  "@type": "{{type}}",',
		'  "id": "@{{changeId}}"',
		"}",
	].join("\n");
	templateComputeNode.inputSchema = Type.toJsonSchema(
		Schema.Struct({ type: Schema.String, changeId: Schema.String }),
	);
	attachTrigger(functionTrigger, computeModel);

	return { canvasModel, computeModel };
};

const addToSpace = (
	name: string,
	space: Space,
	canvas: CanvasGraphModel,
	compute: ComputeGraphModel,
) => {
	return space.db.add(
		Obj.make(CanvasBoardType, {
			name,
			computeGraph: Ref.make(compute.root),
			layout: canvas.graph,
		}),
	);
};

const setupQueue = (
	space: Space,
	canvasModel: CanvasGraphModel,
	args?: { idPosition?: RawPositionInput; queuePosition?: RawPositionInput },
) => {
	const queueId = canvasModel.createNode(
		createConstant({
			value: new DXN(DXN.kind.QUEUE, [
				"data",
				space.id,
				Key.ObjectId.random(),
			]).toString(),
			...(args?.idPosition
				? rawPosition(args.idPosition)
				: position({ x: -18, y: 5, width: 8, height: 6 })),
		}),
	);
	const queue = canvasModel.createNode(
		createQueue(
			args?.queuePosition
				? rawPosition(args.queuePosition)
				: position({ x: -3, y: 3, width: 14, height: 10 }),
		),
	);
	canvasModel.createEdge({ source: queueId.id, target: queue.id });
	return { queue, queueId };
};

const attachTrigger = (
	functionTrigger: Trigger.Trigger | undefined,
	computeModel: ComputeGraphModel,
) => {
	invariant(functionTrigger);
	functionTrigger.function = Ref.make(computeModel.root);
	const inputNode = computeModel.nodes.find(
		(node) => node.type === NODE_INPUT,
	)!;
	functionTrigger.inputNodeId = inputNode.id;
};

type RawPositionInput = {
	centerX: number;
	centerY: number;
	width: number;
	height: number;
};

const rawPosition = (args: RawPositionInput) => {
	return {
		center: { x: args.centerX, y: args.centerY },
		size: { width: args.width, height: args.height },
	};
};

const position = (rect: {
	x: number;
	y: number;
	width?: number;
	height?: number;
}) => {
	const snap = 32;
	const [center, size] = rectToPoints({ width: 0, height: 0, ...rect });
	const { x, y, width, height } = pointsToRect([
		pointMultiply(center, snap),
		pointMultiply(size, snap),
	]);
	if (width && height) {
		return {
			center: { x, y },
			size: width && height ? { width, height } : undefined,
		};
	} else {
		return { center: { x, y } };
	}
};
