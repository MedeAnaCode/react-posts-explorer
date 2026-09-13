import { ApiError } from './apiError';

const API_BASE_PATH = '/guardian-api';

function createRequestUrl(path: string, params?: URLSearchParams) {
  const url = new URL(`${API_BASE_PATH}${path}`, window.location.origin);

  if (params) {
    url.search = params.toString();
  }

  return url;
}

export async function getJson(
  path: string,
  options: { signal?: AbortSignal; params?: URLSearchParams } = {},
) {
  let response: Response;

  try {
    response = await fetch(createRequestUrl(path, options.params), {
      headers: { Accept: 'application/json' },
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    throw new ApiError('Не удалось связаться с сервером.', {
      kind: 'network',
      cause: error,
    });
  }

  if (!response.ok) {
    throw new ApiError(
      response.status === 404
        ? 'Запрошенные данные не найдены.'
        : 'Сервер не смог выполнить запрос.',
      { kind: 'http', status: response.status },
    );
  }

  try {
    return {
      data: (await response.json()) as unknown,
      headers: response.headers,
    };
  } catch (error) {
    throw new ApiError('Сервер вернул ответ в неизвестном формате.', {
      kind: 'validation',
      cause: error,
    });
  }
}
