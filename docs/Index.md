# 🗺️ Карта знаний проекта (C4 Model)

## 🏗️ Архитектурные уровни

1.  **[[1-Context/System-Context|Уровень 1: Системный контекст]]** — Полное описание приложения.
2.  **Уровень 2: Контейнеры**
    - [[2-Containers/Frontend/Frontend-Container|Контейнер: Frontend]]
    - [[2-Containers/Backend/Backend-Container|Контейнер: Backend]]
3.  **Уровень 3: Компоненты (Frontend)**
    - **UI Core**:
        - [[3-Components/Frontend/IDELayout/IDELayout-Component|IDELayout]]
        - [[3-Components/Frontend/Sidebar/Sidebar-Component|Sidebar]]
        - [[3-Components/Frontend/ArtifactPanel/ArtifactPanel-Component|ArtifactPanel]]
        - [[3-Components/Frontend/ChatPanel/ChatPanel-Component|ChatPanel]]
    - **Navigation**:
        - [[3-Components/Frontend/FileExplorer/FileExplorer-Component|FileExplorer]]
        - [[3-Components/Frontend/ProjectPanel/ProjectPanel-Component|ProjectPanel]]
    - **Renderers**:
        - [[3-Components/Frontend/MermaidPreview/MermaidPreview-Component|MermaidPreview (Renderer)]]
        - [[3-Components/Frontend/BananaRenderer/BananaRenderer-Component|BananaRenderer]]
        - [[3-Components/Frontend/ExcalidrawDiagram/ExcalidrawDiagram-Component|ExcalidrawDiagram]]
        - [[3-Components/Frontend/HtmlPreview/HtmlPreview-Component|HtmlPreview]]
    - **Utilities**:
        - [[3-Components/Frontend/ZoomableContainer/ZoomableContainer-Component|ZoomableContainer]]
        - [[3-Components/Frontend/ContextLog/ContextLog-Component|ContextLog]]
        - [[3-Components/Frontend/SkillsPanel/SkillsPanel-Component|SkillsPanel]]
        - [[3-Components/Frontend/TTSControls/TTSControls-Component|TTSControls]]
4.  **Уровень 4: Код**
    - [[4-Code/Frontend/ZoomableContainer/Zoom-Math|Математика зума]]
    - [[4-Code/Frontend/BananaRenderer/Banana-Renderer-Logic|Логика рендеринга Banana]]
    - [[4-Code/Frontend/ChatPanel/Chat-Logic|Логика чата]]
    - [[4-Code/Frontend/MermaidPreview/Mermaid-Config|Конфигурация Mermaid]]

---
## 📂 Структура проекта (Зеркало)
- `src/`
    - `components/` — [[3-Components/Frontend/ArtifactPanel/ArtifactPanel-Component|Все компоненты UI]]
    - `engines/` — [[3-Components/Frontend/BananaRenderer/BananaRenderer-Component|Движки визуализации]]
    - `services/` — [[2-Containers/Backend/Backend-Container|Сервисы API]]
    - `docs/` — [[Index|База знаний (Obsidian Wiki)]]
