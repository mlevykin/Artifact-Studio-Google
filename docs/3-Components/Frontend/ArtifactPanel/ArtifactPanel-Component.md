# 🧩 Компонент: ArtifactPanel

## Описание
Центральный компонент для отображения и управления артефактами. Поддерживает переключение между режимами просмотра (Preview), кода (Code) и логов (Context Log).

## Функциональность
- Рендеринг различных типов контента (Markdown, HTML, SVG, Mermaid, Banana JSON).
- Управление версиями артефактов.
- Экспорт в различные форматы.

## Зависимости
- **Upstream**: [[Frontend-Container|Контейнер: Frontend]]
- **Downstream (Подкомпоненты)**:
    - [[ZoomableContainer-Component|Компонент: ZoomableContainer]]
    - [[BananaRenderer-Component|Компонент: BananaRenderer]]
- **Related**: [[ChatPanel-Component|Компонент: ChatPanel]] (получение данных)
