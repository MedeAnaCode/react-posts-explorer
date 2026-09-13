import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import { AppRouter } from './AppRouter';

function renderRouter(pathname: string) {
  window.history.pushState({}, '', pathname);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>,
  );
}

describe('маршрутизация приложения', () => {
  it('перенаправляет с главной страницы к списку постов', async () => {
    renderRouter('/');

    expect(
      await screen.findByRole('heading', { name: 'Список постов' }),
    ).toBeInTheDocument();
  });

  it('показывает страницу для неизвестного адреса', () => {
    renderRouter('/неизвестный-раздел');

    expect(
      screen.getByRole('heading', { name: 'Страница не найдена' }),
    ).toBeInTheDocument();
  });
});
