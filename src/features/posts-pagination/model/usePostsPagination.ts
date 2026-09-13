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
  const { page, limit } = parsePostsSearchParams(searchParams);

  useEffect(() => {
    const normalizedSearch = { page, limit };

    // Канонический URL делает историю браузера и прямые ссылки воспроизводимыми.
    if (!isCanonicalPostsSearch(searchParams, normalizedSearch)) {
      setSearchParams(createPostsSearchParams(normalizedSearch), {
        replace: true,
      });
    }
  }, [limit, page, searchParams, setSearchParams]);

  return {
    page,
    limit,
    setPage: (nextPage: number) => {
      setSearchParams(createPostsSearchParams({ page: nextPage, limit }));
    },
    setLimit: (nextLimit: PostsLimit) => {
      setSearchParams(createPostsSearchParams({ page: 1, limit: nextLimit }));
    },
  };
}
