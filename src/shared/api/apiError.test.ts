import {
  ApiError,
  getApiErrorDescription,
  shouldRetryRequest,
} from './apiError';

describe('ошибки API и политика повторов', () => {
  it.each([400, 401, 403, 404, 429])('не повторяет HTTP %i', (status) => {
    expect(
      shouldRetryRequest(0, new ApiError('Ошибка', { kind: 'http', status })),
    ).toBe(false);
  });

  it('не повторяет ответ с нарушенным контрактом', () => {
    expect(
      shouldRetryRequest(0, new ApiError('Ошибка', { kind: 'validation' })),
    ).toBe(false);
  });

  it.each([
    new ApiError('Ошибка', { kind: 'network' }),
    new ApiError('Ошибка', { kind: 'http', status: 503 }),
  ])('повторяет временную ошибку только один раз', (error) => {
    expect(shouldRetryRequest(0, error)).toBe(true);
    expect(shouldRetryRequest(1, error)).toBe(false);
  });

  it('отличает исчерпание квоты от отсутствия доступа', () => {
    expect(
      getApiErrorDescription(
        new ApiError('Ошибка', { kind: 'http', status: 429 }),
      ),
    ).toContain('Превышен лимит');
    expect(
      getApiErrorDescription(
        new ApiError('Ошибка', { kind: 'http', status: 403 }),
      ),
    ).toContain('ключ и права доступа');
  });
});
