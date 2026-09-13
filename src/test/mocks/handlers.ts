import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://jsonplaceholder.typicode.com/posts', () =>
    HttpResponse.json([]),
  ),
];
