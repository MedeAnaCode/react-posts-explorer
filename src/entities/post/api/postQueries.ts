import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { getPost, getPosts } from './postApi';

export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (page: number, limit: number) =>
    [...postKeys.lists(), { page, limit }] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (postId: string) => [...postKeys.details(), postId] as const,
};

export function postsQueryOptions(page: number, limit: number) {
  return queryOptions({
    queryKey: postKeys.list(page, limit),
    queryFn: ({ signal }) => getPosts({ page, limit, signal }),
    // Предыдущая страница остаётся видимой до ответа сервера и не создаёт скачка макета.
    placeholderData: keepPreviousData,
  });
}

export function postQueryOptions(postId: string) {
  return queryOptions({
    queryKey: postKeys.detail(postId),
    queryFn: ({ signal }) => getPost(postId, signal),
    enabled: postId.length > 0,
  });
}
