//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import * as ConnectorAnnotations from '@dxos/plugin-connector/ConnectorAnnotations';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';

import { PublisherService } from './BloggerCapabilities';

/** Publication lifecycle of a post: local-only `draft` vs synced-to-a-publisher `published`. */
export const PostStatus = Schema.Literals(['draft', 'published']);
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
      .annotate({ description: 'Post outline and/or instructions.' })
      .pipe(Annotation.SetParent.set(true)),
    content: Ref.Ref(Markdown.Document).pipe(Annotation.SetParent.set(true), FormInputAnnotation.set(false)),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--article--regular', hue: 'indigo' }),
  ),
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
      .annotate({ description: 'Publication instructions.' })
      .pipe(Annotation.SetParent.set(true)),
    posts: Schema.Array(Ref.Ref(Post)).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--books--regular', hue: 'indigo' }),
    // Offer "Connect <publisher>" (via plugin-connector's `connectorAuth` extension) until a
    // Connection for the registered publisher exists — associating a publisher connection with the
    // Publication, mirroring plugin-studio's Artifact.
    ConnectorAnnotations.ConnectorAuthAnnotation.set({ connectorIds: resolvePublicationConnectorIds }),
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
  // The outline and body are owned (`SetParent`): both cascade-delete with the post.
  return Obj.make(Post, {
    name,
    description,
    status: 'draft',
    outline: Ref.make(outline),
    content: Ref.make(body),
  });
};

/** Creates a `Publication` with a fresh instructions text and no posts. */
export const makePublication = ({ name }: { name?: string } = {}): Publication => {
  const instructions = Text.make();
  return Obj.make(Publication, { name, instructions: Ref.make(instructions), posts: [] });
};
