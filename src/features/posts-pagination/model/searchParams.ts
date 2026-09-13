export const AVAILABLE_LIMITS = [10, 20] as const;
export type PostsLimit = (typeof AVAILABLE_LIMITS)[number];

export type PostsSearch = {
  page: number;
  limit: PostsLimit;
};

function parsePositiveInteger(value: string | null) {
  if (value === null || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}

export function parsePostsSearchParams(params: URLSearchParams): PostsSearch {
  const page = parsePositiveInteger(params.get('page')) ?? 1;
  const requestedLimit = parsePositiveInteger(params.get('limit'));
  const limit = AVAILABLE_LIMITS.includes(requestedLimit as PostsLimit)
    ? (requestedLimit as PostsLimit)
    : 10;

  return { page, limit };
}

export function createPostsSearchParams({ page, limit }: PostsSearch) {
  return new URLSearchParams({ page: String(page), limit: String(limit) });
}

export function isCanonicalPostsSearch(
  params: URLSearchParams,
  search: PostsSearch,
) {
  return params.toString() === createPostsSearchParams(search).toString();
}

