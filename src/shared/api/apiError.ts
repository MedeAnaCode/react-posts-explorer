export type ApiErrorKind = 'network' | 'http' | 'validation';

type ApiErrorOptions = {
  kind: ApiErrorKind;
  status?: number;
  cause?: unknown;
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(message: string, options: ApiErrorOptions) {
    super(message, { cause: options.cause });
    this.name = 'ApiError';
    this.kind = options.kind;
    this.status = options.status;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getApiErrorDescription(error: unknown) {
  if (isApiError(error)) {
    if (error.kind === 'validation') {
      return 'Ответ сервера не соответствует ожидаемому формату. Попробуйте ещё раз позже.';
    }
    if (error.status === 429) {
      return 'Превышен лимит запросов к новостям. Попробуйте позже.';
    }
    if (error.status === 401 || error.status === 403) {
      return 'Сервису недоступен API новостей. Администратору нужно проверить ключ и права доступа.';
    }
    if (error.status === 404) {
      return 'Запрошенные данные больше недоступны.';
    }
    if (error.status === 400) {
      return 'Сервер не принял параметры запроса. Проверьте адрес страницы.';
    }
  }

  return 'Не удалось загрузить данные. Проверьте подключение и повторите попытку.';
}

export function shouldRetryRequest(failureCount: number, error: unknown) {
  // Повтор не исправит контракт или доступ к API и лишь потратит общую квоту ключа.
  if (
    isApiError(error) &&
    (error.kind === 'validation' ||
      (error.status !== undefined && error.status >= 400 && error.status < 500))
  ) {
    return false;
  }

  return failureCount < 1;
}
