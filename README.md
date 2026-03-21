# Artifact Studio 🎨

Artifact Studio is a professional, AI-powered environment designed for generating, editing, and versioning artifacts. It provides a seamless experience for creating Mermaid diagrams, HTML/CSS/JS snippets, Markdown documents, SVGs, and complex multi-file projects using Large Language Models (LLMs) with real-time streaming and fuzzy patching.

## 🚀 Key Features

- **Multi-File Project Management**: Create and manage complex applications with multiple files and folders. The integrated File Explorer allows you to navigate and edit project structures seamlessly.
- **AI Skills Management**: Define and manage AI "skills" using Markdown. Enable specific skills for each chat session to guide the AI's behavior and expertise (e.g., Senior QA Engineer, Frontend Architect).
- **Planning & Reasoning**: View the AI's thought process and planning steps through collapsible "Thought" sections in the chat.
- **AI-Powered Chat**: Real-time streaming chat interface with support for multiple providers:
  - **Gemini AI**: High-performance cloud-based models.
  - **Ollama**: Connect to locally running LLMs (e.g., Llama 3, Mistral) for private, local-first generation.
- **Artifacts Panel**: A dedicated space to view and interact with generated content:
  - **Mermaid Diagrams**: Render complex flowcharts, sequence diagrams, and more.
  - **HTML/CSS/JS Previews**: Live preview of web snippets in a sandboxed environment.
  - **Markdown Rendering**: Rich text formatting with GFM (GitHub Flavored Markdown) support.
  - **SVG Previews**: Direct rendering of vector graphics.
  - **Multi-file Projects**: Hierarchical file explorer for complex codebases.
- **Smart Patching**: AI can perform surgical edits to existing artifacts using a robust fuzzy patch engine, preserving your changes while updating specific parts.
- **MCP Integration**: Connect to Model Context Protocol (MCP) servers to augment the AI's context with external tools and data sources.
- **Version Control**: Track changes with automatic versioning. Easily switch between previous versions of any artifact.
- **Direct Code Editing**: Modify the generated code directly in the "Code" view and save changes.
- **Advanced Export Options**:
  - **PNG**: High-quality image export (2x scale) with specialized handling for SVG/Mermaid.
  - **SVG**: Download vector source for diagrams and graphics.
  - **HTML**: Export standalone web pages.
  - **Markdown**: Save formatted documents.
- **Interactive Diagram View**: Zoom and pan capabilities for large diagrams, including a "Fit to Screen" feature.

## 🛠 Tech Stack

- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **AI Integration**: [@google/genai](https://www.npmjs.com/package/@google/genai) (Gemini API)
- **Diagrams**: [Mermaid.js](https://mermaid.js.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Motion](https://motion.dev/) (Framer Motion)
- **Markdown**: [react-markdown](https://github.com/remarkjs/react-markdown)
- **Exporting**: [html2canvas](https://html2canvas.hertzen.com/)

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A [Gemini API Key](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd artifact-studio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## 📁 Project Structure

- `/src/components`: Reusable UI components (ChatPanel, ArtifactPanel, Previews, etc.).
- `/src/engines`: Logic for parsing and processing AI responses.
- `/src/hooks`: Custom React hooks for state management and AI interaction.
- `/src/types.ts`: TypeScript interfaces and types.
- `/src/utils.ts`: Helper functions and styling utilities.
- `/src/App.tsx`: Main application layout and routing logic.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ in AI Studio.*
