import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  createPostsSearchParams,
  isCanonicalPostsSearch,
  parsePostsSearchParams,
  type PostsLimit,
} from './searchParams';

export function usePostsPagination() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = parsePostsSearchParams(searchParams);

  useEffect(() => {
    if (!isCanonicalPostsSearch(searchParams, search)) {
      setSearchParams(createPostsSearchParams(search), { replace: true });
    }
  }, [search.limit, search.page, searchParams, setSearchParams]);

  return {
    ...search,
    setPage(page: number) {
      setSearchParams(createPostsSearchParams({ ...search, page }));
    },
    setLimit(limit: PostsLimit) {
      setSearchParams(createPostsSearchParams({ page: 1, limit }));
    },
  };
}

