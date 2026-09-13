import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { getPost, getPosts } from './postApi';

export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (page: number, limit: number) =>
    [...postKeys.lists(), { page, limit }] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (postId: number) => [...postKeys.details(), postId] as const,
};

export function postsQueryOptions(page: number, limit: number) {
  return queryOptions({
    queryKey: postKeys.list(page, limit),
    queryFn: ({ signal }) => getPosts({ page, limit, signal }),
    placeholderData: keepPreviousData,
  });
}

export function postQueryOptions(postId: number) {
  return queryOptions({
    queryKey: postKeys.detail(postId),
    queryFn: ({ signal }) => getPost(postId, signal),
    enabled: Number.isInteger(postId) && postId > 0,
  });
}

