# Лента новостей The Guardian

**Демо на сервере:** [открыть приложение](http://135.106.211.213:8080/) — локальная установка не нужна. Стенд доступен по HTTP на порту `8080`.

![React 19](https://img.shields.io/badge/React-19-149eca?logo=react)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)
![Docker](https://img.shields.io/badge/Docker-Nginx-2496ed?logo=docker)

## Что реализовано

- Каталог новостей, выбор 10/20 материалов, пагинация в URL и отдельная страница статьи с прямой ссылкой.
- Загрузка, пустой результат и ошибки с повтором запроса; параметры списка сохраняются при возврате из статьи.
- Сверх минимального задания: проверка ответов Zod, кеш TanStack Query, сохранение контента при ошибке обновления, адаптивный интерфейс и клавиатурное управление.
- Инфраструктура: серверный API-прокси без ключа в браузере, Docker/Nginx, unit-, интеграционные и браузерные тесты, обязательные проверки GitHub Actions.

## Что стоит посмотреть в коде

- [PostsPage.tsx](src/pages/PostsPage.tsx) — связь URL, кеша и состояний интерфейса; старые карточки сохраняют правильную ссылку возврата во время загрузки.
- [postApi.ts](src/entities/post/api/postApi.ts) и [post.ts](src/entities/post/model/post.ts) — проверка внешних данных и безопасное преобразование HTML-анонса в текст.
- [posts-pagination/model](src/features/posts-pagination/model) — нормализация query-параметров и сброс страницы при смене лимита.
- [AppRouter.test.tsx](src/app/AppRouter.test.tsx) и [e2e/app.spec.ts](e2e/app.spec.ts) — пользовательские сценарии и регрессии загрузки, пагинации и возврата.
- [nginx/default.conf](nginx/default.conf) и [smoke-production.mjs](scripts/smoke-production.mjs) — защита ключа, TLS, общий лимит запросов и проверка работающего контейнера.

## Быстрый запуск

Нужны Node.js 22.13+ и [ключ Guardian Developer](https://open-platform.theguardian.com/access/).
В корне проекта выполните `npm ci`, скопируйте `.env.example` в `.env`, задайте `GUARDIAN_API_KEY` и запустите `npm run dev`.
Приложение откроется по адресу [localhost:5173](http://localhost:5173) (при занятом порте Vite выведет другой адрес).

Копирование окружения: `cp .env.example .env` в Bash или `Copy-Item .env.example .env` в PowerShell.

## Задание и выбранные решения

Минимальные требования: React + TypeScript, открытый API, список и детали поста, React Router, выбор лимита, собственная пагинация и оформление без готового макета. [Исходное задание](docs/materials/test-assignment-posts.docx) сохранено в репозитории; [критерии приёмки](docs/requirements.md) связывают требования с реализацией.

React Router хранит страницу и лимит в URL, а TanStack Query — данные сервера. Отдельного глобального store нет. Слои `app → pages → features/entities → shared` отделяют композицию экранов от API и UI; подробнее — в [архитектуре](docs/architecture.md).

Список запрашивает короткий анонс, полная статья загружается при открытии детали. HTML-анонс преобразуется в обычный текст и не вставляется в страницу как разметка. Guardian ID содержит слеши: ссылка кодирует его как один параметр маршрута.

## Окружение и внешний API

| Переменная         | Назначение                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `GUARDIAN_API_KEY` | Обязательный ключ Guardian: dev/preview читает его через Vite, production — при запуске Nginx. |
| `APP_PORT`         | Локальный порт Docker Compose, по умолчанию `8080`. Не меняет порт Vite.                       |

Не добавляйте префикс `VITE_` к ключу: такие переменные доступны клиентской сборке. Файлы `.env` и `.env.*` исключены из Git, кроме примера. После изменения ключа перезапустите Vite или пересоздайте контейнер.

Браузер обращается к `/guardian-api` на своём origin. Nginx проверяет сертификат Guardian, сам формирует разрешённые параметры и добавляет ключ. Общая очередь ограничивает запросы одним в секунду; при её переполнении возвращается `429`. Она не гарантирует соблюдение суточной квоты: Developer-план предусматривает до 500 запросов в сутки на ключ. [Условия API](https://open-platform.theguardian.com/access/).

Автор, изображение и текст доступны не у каждой публикации — предусмотрены текстовые fallback-состояния. Для работы с реальными новостями нужны действующий ключ и доступ к Guardian.

## Проверки

| Команда                             | Что проверяет                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run check`                     | Форматирование, ESLint, TypeScript, unit-/интеграционные тесты и production-сборку.                    |
| `npm run test:coverage`             | Те же тесты Vitest с отчётом покрытия в `coverage/`.                                                   |
| `npm run test:e2e`                  | Playwright: каталог, пагинация, лимит, детали, прямые URL, состояния ошибок, клавиатура и узкий экран. |
| `npm run test:production`           | Сборку и запуск Docker-образа; TLS, API-прокси, секреты, лимит, прямые маршруты и HTTP-заголовки.      |
| `npm run build` / `npm run preview` | Создать и локально просмотреть production-сборку.                                                      |

Перед первым E2E-запуском выполните `npx playwright install chromium`. Для production smoke нужны запущенный Docker и OpenSSL; в Windows скрипт использует OpenSSL из стандартной установки Git for Windows, иной путь задаётся через `OPENSSL_PATH`.

Vitest использует MSW, Playwright подменяет API и изображения, а production smoke запускает отдельный тестовый HTTPS-сервер. Автоматические проверки не требуют реального Guardian key и не расходуют его квоту. Smoke создаёт временную Docker-сеть и контейнеры и удаляет их после проверки. Подробности и диагностика — в [руководстве разработчика](docs/development.md).

## Docker и публикация

После настройки `.env`:

```bash
docker compose up --build -d
docker compose ps
```

Приложение доступно на [localhost:8080](http://localhost:8080); healthcheck должен показать `healthy`. Остановить: `docker compose down`.

Multi-stage образ собирает SPA через Node.js и раздаёт его через Nginx. Ключ передаётся при запуске, а не при сборке. Для публикации нужен Docker-хост с HTTPS перед контейнером; Compose по умолчанию открывает порт только на `127.0.0.1`. Простого статического хостинга недостаточно: требуются API-прокси и возврат `index.html` для клиентских маршрутов.

[Исходный код](https://github.com/MedeAnaCode/react-posts-explorer) и [GitHub Actions](https://github.com/MedeAnaCode/react-posts-explorer/actions).

## CI

[Workflow](.github/workflows/ci.yml) запускается на push, pull request в `master` и вручную. Три обязательные группы проверяют качество кода и Vitest, Playwright и production-контейнер. Итоговый `PR gate` успешен только после всех трёх; отчёты сохраняются на семь дней.

Автоматический деплой не настроен. Для запрета слияния с ошибками `PR gate` нужно включить в required status checks защиты ветки — наличие workflow само по себе не настраивает защиту.
