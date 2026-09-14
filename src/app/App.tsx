import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { shouldRetryRequest } from '../shared/api';
import { AppRouter } from './AppRouter';

export function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: shouldRetryRequest,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  );
}
