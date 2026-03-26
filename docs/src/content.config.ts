//
// Copyright 2025 DXOS.org
//

import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro:content';

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema(),
  }),

  team: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/team' }),
    schema: z.object({
      name: z.string(),
      title: z.string(),
      github: z.string().url().optional(),
      x: z.string().url().optional(),
      bluesky: z.string().url().optional(),
      profileImage: z.string().optional(),
      sortOrder: z.number().default(0),
    }),
  }),

  plugins: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/plugins' }),
    schema: z.object({
      name: z.string(),
      summary: z.string(),
      icon: z.string().optional(),
      featuredImage: z.string().optional(),
      sortOrder: z.number().default(0),
    }),
  }),

  legal: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
    }),
  }),

  blog: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
    schema: z.object({
      title: z.string(),
      slug: z.string(),
      date: z.coerce.date(),
      description: z.string().optional(),
      author: z.string(),
      tags: z.array(z.string()).default([]),
      featureImage: z.string().optional(),
      bskyPostUri: z.string().optional(),
      documentAtUri: z.string().optional(),
    }),
  }),
};
