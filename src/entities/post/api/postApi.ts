import { ApiError, getJson } from '../../../shared/api';
import {
  postResponseSchema,
  postsResponseSchema,
  type PostsPageData,
} from '../model/post';

type GetPostsParams = {
  page: number;
  limit: number;
  signal?: AbortSignal;
};

export async function getPosts({
  page,
  limit,
  signal,
}: GetPostsParams): Promise<PostsPageData> {
  const params = new URLSearchParams({
    page: String(page),
    'page-size': String(limit),
    'order-by': 'newest',
    'show-fields': 'byline,bodyText,thumbnail',
  });
  const response = await getJson('/search', { params, signal });
  const result = postsResponseSchema.safeParse(response.data);

  if (!result.success) {
    throw new ApiError('Список новостей имеет неверный формат.', {
      kind: 'validation',
      cause: result.error,
    });
  }

  return {
    posts: result.data.response.results,
    totalCount: result.data.response.total,
  };
}

export async function getPost(postId: string, signal?: AbortSignal) {
  const postIdSegments = postId.split('/');

  if (
    postIdSegments.some(
      (segment) => segment.length === 0 || segment === '.' || segment === '..',
    )
  ) {
    throw new ApiError('Идентификатор новости имеет неверный формат.', {
      kind: 'validation',
    });
  }

  const encodedPostId = postIdSegments.map(encodeURIComponent).join('/');
  const params = new URLSearchParams({
    'show-fields': 'byline,bodyText,thumbnail',
  });
  const response = await getJson(`/${encodedPostId}`, { params, signal });
  const result = postResponseSchema.safeParse(response.data);

  if (!result.success) {
    throw new ApiError('Новость имеет неверный формат.', {
      kind: 'validation',
      cause: result.error,
    });
  }

  return result.data.response.content;
}
