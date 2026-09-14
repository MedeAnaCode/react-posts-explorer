import {
  createPostsSearchParams,
  parsePostsSearchParams,
} from './searchParams';

describe('параметры пагинации', () => {
  it('читает допустимые значения', () => {
    expect(
      parsePostsSearchParams(new URLSearchParams('page=3&limit=20')),
    ).toEqual({ page: 3, limit: 20 });
  });

  it.each([
    'page=0&limit=50',
    'page=-2&limit=abc',
    'page=1.5',
    'page=9007199254740992',
    'page=Infinity',
    'page=1e3',
    '',
  ])('нормализует некорректную строку %s', (value) => {
    expect(parsePostsSearchParams(new URLSearchParams(value))).toEqual({
      page: 1,
      limit: 10,
    });
  });

  it('формирует стабильный порядок параметров', () => {
    expect(createPostsSearchParams({ page: 2, limit: 10 }).toString()).toBe(
      'page=2&limit=10',
    );
  });
});
