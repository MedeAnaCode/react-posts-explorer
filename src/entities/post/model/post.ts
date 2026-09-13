import { z } from 'zod';

export const postSchema = z.object({
  userId: z.number().int().positive(),
  id: z.number().int().positive(),
  title: z.string().min(1),
  body: z.string().min(1),
});

export const postsSchema = z.array(postSchema);

export type Post = z.infer<typeof postSchema>;

export type PostsPageData = {
  posts: Post[];
  totalCount: number | null;
};
