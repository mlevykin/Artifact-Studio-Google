# 🗺️ Карта знаний проекта (C4 Model)

## 🏗️ Архитектурные уровни

1.  **[[System-Context|Уровень 1: Системный контекст]]** — Описание всего приложения.
2.  **Уровень 2: Контейнеры**
    - [[Frontend-Container|Контейнер: Frontend]]
    - [[Backend-Container|Контейнер: Backend]]
3.  **Уровень 3: Компоненты (Frontend)**
    - **UI Core**:
        - [[IDELayout-Component|IDELayout]]
        - [[Sidebar-Component|Sidebar]]
        - [[ArtifactPanel-Component|ArtifactPanel]]
        - [[ChatPanel-Component|ChatPanel]]
    - **Navigation**:
        - [[FileExplorer-Component|FileExplorer]]
        - [[ProjectPanel-Component|ProjectPanel]]
    - **Renderers**:
        - [[MermaidPreview-Component|MermaidPreview (Renderer)]]
        - [[BananaRenderer-Component|BananaRenderer]]
        - [[ExcalidrawDiagram-Component|ExcalidrawDiagram]]
        - [[HtmlPreview-Component|HtmlPreview]]
    - **Utilities**:
        - [[ZoomableContainer-Component|ZoomableContainer]]
        - [[ContextLog-Component|ContextLog]]
        - [[SkillsPanel-Component|SkillsPanel]]
        - [[TTSControls-Component|TTSControls]]
        - [[DiagramPresenter-Component|DiagramPresenter]]
4.  **Уровень 4: Код**
    - [[Zoom-Math|Математика зума]]
    - [[Banana-Renderer-Logic|Логика рендеринга Banana]]
    - [[Chat-Logic|Логика чата]]
    - [[Mermaid-Config|Конфигурация Mermaid]]

---
## 📂 Структура проекта (Зеркало)
- `src/`
    - `components/` — [[UI-Components-Map|Все компоненты]]
    - `engines/` — [[Engines-Spec|Движки генерации]]
    - `services/` — [[Services-Spec|Сервисы API]]
    - `constants/` — [[Constants-Spec|Константы и стили]]
    - `utils/` — [[Utils-Spec|Утилиты]]
