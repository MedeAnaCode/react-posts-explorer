import { z } from 'zod';

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

const httpsUrlSchema = z
  .string()
  .url()
  .refine((value) => parseUrl(value)?.protocol === 'https:', {
    message: 'URL должен использовать HTTPS.',
  });

const guardianUrlSchema = httpsUrlSchema.refine((value) => {
  const hostname = parseUrl(value)?.hostname.toLowerCase();

  return (
    hostname === 'theguardian.com' ||
    hostname?.endsWith('.theguardian.com') === true
  );
}, 'URL должен вести на The Guardian.');

function emptyStringToUndefined(value: unknown) {
  return typeof value === 'string' && value.trim().length === 0
    ? undefined
    : value;
}

const optionalTextSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).optional(),
);
const optionalHttpsUrlSchema = z.preprocess(
  emptyStringToUndefined,
  httpsUrlSchema.optional(),
);

function plainTextFromHtml(value: string | undefined) {
  if (!value) return undefined;

  // Анонсы Guardian содержат HTML: инертный template не запускает скрипты и не загружает ресурсы.
  const template = document.createElement('template');
  template.innerHTML = value;
  template.content
    .querySelectorAll('script, style')
    .forEach((node) => node.remove());
  template.content.querySelectorAll('br, p, div, li').forEach((node) => {
    node.append(' ');
    node.before(' ');
  });
  return template.content.textContent?.replace(/\s+/g, ' ').trim() || undefined;
}

export const postSchema = z.object({
  id: z.string().min(1),
  webTitle: z.string().min(1),
  sectionName: z.string().min(1),
  webPublicationDate: z.string().datetime(),
  webUrl: guardianUrlSchema,
  fields: z
    .object({
      byline: optionalTextSchema,
      trailText: optionalTextSchema.transform(plainTextFromHtml),
      bodyText: optionalTextSchema,
      thumbnail: optionalHttpsUrlSchema,
    })
    .optional(),
});

export const postsSchema = z.array(postSchema);

export const postsResponseSchema = z.object({
  response: z.object({
    status: z.literal('ok'),
    total: z.number().int().nonnegative(),
    results: postsSchema,
  }),
});

export const postResponseSchema = z.object({
  response: z.object({
    status: z.literal('ok'),
    content: postSchema,
  }),
});

export type Post = z.infer<typeof postSchema>;

export type PostsPageData = {
  posts: Post[];
  totalCount: number;
  // Во время смены страницы URL уже новый, а placeholderData ещё принадлежит старому запросу.
  page: number;
  limit: number;
};
