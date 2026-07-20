//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type CapabilityManager } from '@dxos/app-framework';
import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { ConnectorAuthAnnotation } from '@dxos/plugin-connector';
import { Markdown } from '@dxos/plugin-markdown';
import { Text } from '@dxos/schema';

import { PublisherService } from './BloggerCapabilities';

/** Publication lifecycle of a post: local-only `draft` vs synced-to-a-publisher `published`. */
export const PostStatus = Schema.Literal('draft', 'published');
export type PostStatus = Schema.Schema.Type<typeof PostStatus>;

/**
 * A blog post: a planning outline plus a single commentable markdown body document. `status` tracks
 * whether the post has been synced to a publisher; the remote id (once synced) is stored as a foreign
 * key on the post's meta, keyed by the publisher's `source`.
 */
export class Post extends Type.makeObject<Post>(DXN.make('org.dxos.type.blogger.post', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    status: PostStatus.pipe(FormInputAnnotation.set(false)),
    outline: Ref.Ref(Text.Text)
      .pipe(Format.FormatAnnotation.set(Format.TypeFormat.Markdown))
      .annotations({ description: 'Post outline and/or instructions.' }),
    content: Ref.Ref(Markdown.Document).pipe(FormInputAnnotation.set(false)),
  }).pipe(LabelAnnotation.set(['name']), Annotation.IconAnnotation.set({ icon: 'ph--article--regular', hue: 'amber' })),
) {}

/**
 * Resolve the connector(s) whose credential a Publication's publisher needs, from the registered
 * {@link PublisherService} contributions. The explicit return type keeps the {@link Publication}
 * reference (below) out of the annotation's inferred type, which would otherwise make the class
 * recursively reference itself. Mirrors plugin-studio's `resolveArtifactConnectorIds`.
 */
const resolvePublicationConnectorIds = (
  object: Obj.Unknown,
  capabilities: CapabilityManager.CapabilityManager,
): readonly string[] => {
  if (!Obj.instanceOf(Publication, object)) {
    return [];
  }
  const connectorIds = capabilities
    .getAll(PublisherService)
    .flat()
    .map((service) => service.connectorId);
  return Array.from(new Set(connectorIds));
};

/**
 * A collection of posts with shared base instructions for the assistant agent.
 */
export class Publication extends Type.makeObject<Publication>(DXN.make('org.dxos.type.blogger.publication', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    instructions: Ref.Ref(Text.Text)
      .pipe(Format.FormatAnnotation.set(Format.TypeFormat.Markdown))
      .annotations({ description: 'Publication instructions.' }),
    posts: Schema.Array(Ref.Ref(Post)).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--books--regular', hue: 'amber' }),
    // Offer "Connect <publisher>" (via plugin-connector's `connectorAuth` extension) until a
    // Connection for the registered publisher exists — associating a publisher connection with the
    // Publication, mirroring plugin-studio's Artifact.
    ConnectorAuthAnnotation.set({ connectorIds: resolvePublicationConnectorIds }),
  ),
) {}

// Build the child documents and their refs before Obj.make (mirrors Markdown.make), then set parent
// ownership after construction so the refs are supplied at creation time, never deferred.

/** Creates a `Post` with a fresh outline text and a fresh (empty) body document, both owned by it. */
export const makePost = ({
  name,
  description,
  content = '',
}: { name?: string; description?: string; content?: string } = {}): Post => {
  const outline = Text.make();
  const body = Markdown.make({ content });
  const post = Obj.make(Post, {
    name,
    description,
    status: 'draft',
    outline: Ref.make(outline),
    content: Ref.make(body),
  });
  Obj.setParent(outline, post);
  Obj.setParent(body, post);
  return post;
};

/** Creates a `Publication` with a fresh instructions text and no posts. */
export const makePublication = ({ name }: { name?: string } = {}): Publication => {
  const instructions = Text.make();
  const publication = Obj.make(Publication, { name, instructions: Ref.make(instructions), posts: [] });
  Obj.setParent(instructions, publication);
  return publication;
};
