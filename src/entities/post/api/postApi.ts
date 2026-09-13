import { ApiError, getJson } from '../../../shared/api';
import { postSchema, postsSchema, type PostsPageData } from '../model/post';

type GetPostsParams = {
  page: number;
  limit: number;
  signal?: AbortSignal;
};

function parseTotalCount(value: string | null) {
  if (value === null || !/^\d+$/.test(value)) {
    return null;
  }

  const totalCount = Number(value);
  return Number.isSafeInteger(totalCount) ? totalCount : null;
}

export async function getPosts({
  page,
  limit,
  signal,
}: GetPostsParams): Promise<PostsPageData> {
  const params = new URLSearchParams({
    _page: String(page),
    _limit: String(limit),
  });
  const response = await getJson('/posts', { params, signal });
  const result = postsSchema.safeParse(response.data);

  if (!result.success) {
    throw new ApiError('Список публикаций имеет неверный формат.', {
      kind: 'validation',
      cause: result.error,
    });
  }

  return {
    posts: result.data,
    totalCount: parseTotalCount(response.headers.get('X-Total-Count')),
  };
}

export async function getPost(postId: number, signal?: AbortSignal) {
  const response = await getJson(`/posts/${postId}`, { signal });
  const result = postSchema.safeParse(response.data);

  if (!result.success) {
    throw new ApiError('Публикация имеет неверный формат.', {
      kind: 'validation',
      cause: result.error,
    });
  }

  return result.data;
}

