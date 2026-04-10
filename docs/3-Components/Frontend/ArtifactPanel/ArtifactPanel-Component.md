# 🧩 Компонент: ArtifactPanel

## Описание
Центральный компонент для отображения и управления артефактами. Поддерживает переключение между режимами просмотра (Preview), кода (Code) и логов (Context Log).

## Функциональность
- Рендеринг различных типов контента (Markdown, HTML, SVG, Mermaid, Banana JSON).
- Управление версиями артефактов.
- Экспорт в различные форматы.

## Зависимости
- **Upstream**: [[2-Containers/Frontend/Frontend-Container|Контейнер: Frontend]]
- **Downstream (Подкомпоненты)**:
    - [[3-Components/Frontend/ZoomableContainer/ZoomableContainer-Component|Компонент: ZoomableContainer]]
    - [[3-Components/Frontend/BananaRenderer/BananaRenderer-Component|Компонент: BananaRenderer]]
- **Related**: [[3-Components/Frontend/ChatPanel/ChatPanel-Component|Компонент: ChatPanel]] (получение данных)
