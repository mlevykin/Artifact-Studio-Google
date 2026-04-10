# 📦 Контейнер: Frontend (React SPA)

## Описание
Основное клиентское приложение, написанное на React. Отвечает за интерфейс, управление состоянием артефактов и рендеринг визуализаций.

## Технологический стек
- React 19
- Tailwind CSS
- Framer Motion (для анимаций)
- Lucide React (иконки)

## Зависимости
- **Upstream**: [[1-Context/System-Context|Системный контекст]]
- **Related**: [[2-Containers/Backend/Backend-Container|Контейнер: Backend]] (API запросы)

## Downstream (Компоненты)
- **UI Core**:
    - [[3-Components/Frontend/IDELayout/IDELayout-Component|Компонент: IDELayout]]
    - [[3-Components/Frontend/Sidebar/Sidebar-Component|Компонент: Sidebar]]
    - [[3-Components/Frontend/ArtifactPanel/ArtifactPanel-Component|Компонент: ArtifactPanel]]
    - [[3-Components/Frontend/ChatPanel/ChatPanel-Component|Компонент: ChatPanel]]
- **Navigation & Files**:
    - [[3-Components/Frontend/FileExplorer/FileExplorer-Component|Компонент: FileExplorer]]
    - [[3-Components/Frontend/ProjectPanel/ProjectPanel-Component|Компонент: ProjectPanel]]
- **Renderers & Previews**:
    - [[3-Components/Frontend/MermaidPreview/MermaidPreview-Component|Компонент: MermaidPreview]]
    - [[3-Components/Frontend/BananaRenderer/BananaRenderer-Component|Компонент: BananaRenderer]]
    - [[3-Components/Frontend/ExcalidrawDiagram/ExcalidrawDiagram-Component|Компонент: ExcalidrawDiagram]]
    - [[3-Components/Frontend/HtmlPreview/HtmlPreview-Component|Компонент: HtmlPreview]]
- **Utilities**:
    - [[3-Components/Frontend/ZoomableContainer/ZoomableContainer-Component|Компонент: ZoomableContainer]]
    - [[3-Components/Frontend/ContextLog/ContextLog-Component|Компонент: ContextLog]]
    - [[3-Components/Frontend/SkillsPanel/SkillsPanel-Component|Компонент: SkillsPanel]]
    - [[3-Components/Frontend/TTSControls/TTSControls-Component|Компонент: TTSControls]]
