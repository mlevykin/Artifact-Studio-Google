# 📦 Контейнер: Frontend (React SPA)

## Описание
Основное клиентское приложение, написанное на React. Отвечает за интерфейс, управление состоянием артефактов и рендеринг визуализаций.

## Технологический стек
- React 19
- Tailwind CSS
- Framer Motion (для анимаций)
- Lucide React (иконки)

## Зависимости
- **Upstream**: [[System-Context|Системный контекст]]
- **Related**: [[Backend-Container|Контейнер: Backend]] (API запросы)
- **Downstream (Компоненты)**
- **UI Core**:
    - [[IDELayout-Component|Компонент: IDELayout]]
    - [[Sidebar-Component|Компонент: Sidebar]]
    - [[ArtifactPanel-Component|Компонент: ArtifactPanel]]
    - [[ChatPanel-Component|Компонент: ChatPanel]]
- **Navigation & Files**:
    - [[FileExplorer-Component|Компонент: FileExplorer]]
    - [[ProjectPanel-Component|Компонент: ProjectPanel]]
- **Renderers & Previews**:
    - [[MermaidPreview-Component|Компонент: MermaidPreview]]
    - [[BananaRenderer-Component|Компонент: BananaRenderer]]
    - [[ExcalidrawDiagram-Component|Компонент: ExcalidrawDiagram]]
    - [[HtmlPreview-Component|Компонент: HtmlPreview]]
- **Utilities**:
    - [[ZoomableContainer-Component|Компонент: ZoomableContainer]]
    - [[ContextLog-Component|Компонент: ContextLog]]
    - [[SkillsPanel-Component|Компонент: SkillsPanel]]
    - [[TTSControls-Component|Компонент: TTSControls]]
