# Архитектурные диаграммы

Диаграммы описывают фактическую реализацию приложения и хранятся рядом с документацией в исходном формате PlantUML и в скомпилированных форматах PNG/SVG.

| Диаграмма | PlantUML | PNG | SVG |
| --- | --- | --- | --- |
| Единая концептуальная схема | [c4-conceptual.puml](c4-conceptual.puml) | [c4-conceptual.png](c4-conceptual.png) | [c4-conceptual.svg](c4-conceptual.svg) |
| Основная логика | [sequence-main-flow.puml](sequence-main-flow.puml) | [sequence-main-flow.png](sequence-main-flow.png) | [sequence-main-flow.svg](sequence-main-flow.svg) |
| C4: контекст (C1) | [c4-context.puml](c4-context.puml) | [c4-context.png](c4-context.png) | [c4-context.svg](c4-context.svg) |
| C4: контейнеры (C2) | [c4-container.puml](c4-container.puml) | [c4-container.png](c4-container.png) | [c4-container.svg](c4-container.svg) |
| C4: компоненты SPA (C3) | [c4-component.puml](c4-component.puml) | [c4-component.png](c4-component.png) | [c4-component.svg](c4-component.svg) |
| Логическая модель данных | [erd.puml](erd.puml) | [erd.png](erd.png) | [erd.svg](erd.svg) |

## Что показывают схемы

- Единая концептуальная схема объединяет контекст, контейнеры и ключевые компоненты на одной картинке; с неё удобнее всего начинать знакомство с проектом.
- Sequence охватывает загрузку и нормализацию URL, получение списка, смену пагинации, открытие публикации и возврат к исходной странице списка.
- C4 показывает систему последовательно на уровнях контекста, контейнеров и компонентов браузерного SPA.
- ERD описывает внешний контракт новости Guardian, опциональные поля контента и DTO страницы. Это не физическая схема: приложение не имеет собственной базы данных.

## Повторная сборка через PlantUML Server в Docker

Из корня репозитория запустите сервер:

```powershell
docker run --rm -d --name posts-plantuml -p 18080:8080 plantuml/plantuml-server:jetty
```

Затем выполните:

```powershell
./docs/diagrams/render.ps1
```

Скрипт отправляет каждый `.puml` на локальный HTTP-сервер и перезаписывает соответствующие `.png` и `.svg`. После сборки сервер можно остановить:

```powershell
docker stop posts-plantuml
```
