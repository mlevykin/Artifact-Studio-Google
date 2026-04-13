# 🗺️ Карта знаний проекта (C4 Model)

## 🏗️ Архитектурные уровни

1.  **contains-context:: [[1-Context/System-Context|Уровень 1: Системный контекст]]**
2.  **Контейнеры (Level 2)**
    - contains-container:: [[2-Containers/Frontend/Frontend-Container|Контейнер: Frontend]]
    - contains-container:: [[2-Containers/Backend/Backend-Container|Контейнер: Backend]]
3.  **Компоненты (Level 3)**
    - **UI Core**:
        - contains-component:: [[3-Components/Frontend/IDELayout/IDELayout-Component|IDELayout]]
        - contains-component:: [[3-Components/Frontend/Sidebar/Sidebar-Component|Sidebar]]
        - contains-component:: [[3-Components/Frontend/ArtifactPanel/ArtifactPanel-Component|ArtifactPanel]]
        - contains-component:: [[3-Components/Frontend/ChatPanel/ChatPanel-Component|ChatPanel]]
    - **Navigation**:
        - contains-component:: [[3-Components/Frontend/FileExplorer/FileExplorer-Component|FileExplorer]]
        - contains-component:: [[3-Components/Frontend/ProjectPanel/ProjectPanel-Component|ProjectPanel]]
    - **Renderers**:
        - contains-component:: [[3-Components/Frontend/MermaidPreview/MermaidPreview-Component|MermaidPreview]]
        - contains-component:: [[3-Components/Frontend/BananaRenderer/BananaRenderer-Component|BananaRenderer]]
        - contains-component:: [[3-Components/Frontend/ExcalidrawDiagram/ExcalidrawDiagram-Component|ExcalidrawDiagram]]
        - contains-component:: [[3-Components/Frontend/HtmlPreview/HtmlPreview-Component|HtmlPreview]]
    - **Utilities**:
        - contains-component:: [[3-Components/Frontend/ZoomableContainer/ZoomableContainer-Component|ZoomableContainer]]
        - contains-component:: [[3-Components/Frontend/ContextLog/ContextLog-Component|ContextLog]]
        - contains-component:: [[3-Components/Frontend/SkillsPanel/SkillsPanel-Component|SkillsPanel]]
        - contains-component:: [[3-Components/Frontend/TTSControls/TTSControls-Component|TTSControls]]
4.  **Код (Level 4)**
    - contains-code:: [[4-Code/Frontend/ZoomableContainer/Zoom-Math|Математика зума]]
    - contains-code:: [[4-Code/Frontend/BananaRenderer/Banana-Renderer-Logic|Логика рендеринга Banana]]
    - contains-code:: [[4-Code/Frontend/ChatPanel/Chat-Logic|Логика чата]]
    - contains-code:: [[4-Code/Frontend/MermaidPreview/Mermaid-Config|Конфигурация Mermaid]]

## 🧠 Концепции и паттерны
- relates-to:: [[LLM-Wiki-Pattern|LLM Wiki Pattern]]

---
## 📂 Мета-информация
- taxonomy:: [[Link-Taxonomy|Правила разметки связей]]
- navigates-to:: [[Index|Оглавление]]
