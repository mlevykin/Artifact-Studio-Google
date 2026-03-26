export interface MermaidStyle {
  id: string;
  name: string;
  description: string;
  theme: 'default' | 'dark' | 'forest' | 'neutral' | 'base';
  themeVariables?: any;
  css?: string;
}

export const MERMAID_STYLES: MermaidStyle[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Изящная чистота: белый фон, тонкие линии.',
    theme: 'neutral',
    themeVariables: {
      primaryColor: '#ffffff',
      primaryTextColor: '#18181b',
      primaryBorderColor: '#e4e4e7',
      lineColor: '#71717a',
      secondaryColor: '#f4f4f5',
      tertiaryColor: '#fafafa',
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
    },
    css: `
      .mermaid-container { background: #ffffff; }
      .edgePath path { stroke-width: 1px !important; }
      /* Color differentiation for Minimalist */
      .mermaid-container .node rect { fill: #ffffff !important; stroke: #3b82f6 !important; }
      .mermaid-container .node polygon { fill: #f8fafc !important; stroke: #8b5cf6 !important; }
      .mermaid-container .node circle, .mermaid-container .node ellipse { fill: #f0fdf4 !important; stroke: #22c55e !important; }
    `
  },
  {
    id: 'dark-tech',
    name: 'Dark Tech',
    description: 'Неоновый киберпанк: темный фон, анимированные потоки.',
    theme: 'base',
    themeVariables: {
      darkMode: true,
      background: '#0D1117',
      primaryColor: '#161B22',
      primaryTextColor: '#C9D1D9',
      primaryBorderColor: '#30363D',
      lineColor: '#00FFFF',
      secondaryColor: '#0D1117',
      tertiaryColor: '#161B22',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '13px',
      mainBkg: '#0D1117',
      nodeBorder: '#00FFFF',
      clusterBkg: '#161B22',
      clusterBorder: '#30363D',
      defaultLinkColor: '#00FFFF',
      titleColor: '#58A6FF',
      edgeLabelBackground: '#0D1117',
      nodeTextColor: '#C9D1D9',
    },
    css: `
      .mermaid-container { background: #0D1117; }
      @keyframes flow {
        from { stroke-dashoffset: 20; }
        to { stroke-dashoffset: 0; }
      }
      /* Target the actual path element inside edgePath */
      .mermaid-container .edgePath .path,
      .mermaid-container .edgePath path.path,
      .mermaid-container g.edgePath path {
        stroke-dasharray: 10, 5;
        animation: flow 1s linear infinite !important;
        stroke: #00FFFF !important;
        stroke-width: 2px !important;
      }
      .mermaid-container .marker {
        fill: #00FFFF !important;
        stroke: #00FFFF !important;
      }
      /* Color differentiation for Dark Tech */
      /* Processes - Cyan */
      .mermaid-container .node rect {
        fill: rgba(0, 255, 255, 0.05) !important;
        stroke: #00FFFF !important;
        stroke-width: 2px !important;
        filter: drop-shadow(0 0 3px rgba(0, 255, 255, 0.4));
      }
      /* Decisions - Magenta/Purple */
      .mermaid-container .node polygon {
        fill: rgba(255, 0, 255, 0.05) !important;
        stroke: #FF00FF !important;
        stroke-width: 2px !important;
        filter: drop-shadow(0 0 3px rgba(255, 0, 255, 0.4));
      }
      /* Start/End - Green */
      .mermaid-container .node circle, 
      .mermaid-container .node ellipse {
        fill: rgba(0, 255, 128, 0.05) !important;
        stroke: #00FF80 !important;
        stroke-width: 2px !important;
        filter: drop-shadow(0 0 3px rgba(0, 255, 128, 0.4));
      }
      /* Other shapes - Orange */
      .mermaid-container .node path:not(.path) {
        fill: rgba(255, 128, 0, 0.05) !important;
        stroke: #FF8000 !important;
        stroke-width: 2px !important;
      }
    `
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Профессиональный стандарт: сине-серые тона.',
    theme: 'default',
    themeVariables: {
      primaryColor: '#f0f7ff',
      primaryTextColor: '#1e3a8a',
      primaryBorderColor: '#3b82f6',
      lineColor: '#64748b',
      secondaryColor: '#f8fafc',
      tertiaryColor: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
    },
    css: `
      .mermaid-container { background: #f8fafc; }
      .node rect { rx: 8; ry: 8; fill: #eff6ff !important; stroke: #2563eb !important; }
      .node polygon { fill: #f5f3ff !important; stroke: #7c3aed !important; }
      .node circle, .node ellipse { fill: #f0fdf4 !important; stroke: #16a34a !important; }
    `
  },
  {
    id: 'sketch',
    name: 'Sketch',
    description: 'Набросок от руки: эффект маркера.',
    theme: 'base',
    themeVariables: {
      primaryColor: '#fff',
      primaryTextColor: '#000',
      primaryBorderColor: '#000',
      lineColor: '#000',
      fontFamily: 'Comic Sans MS, cursive',
    },
    css: `
      .mermaid-container { background: #fff; }
      .node rect, .node circle, .node polygon, .node path {
        stroke-width: 2px !important;
      }
      .edgePath path {
        stroke-width: 2px !important;
      }
    `
  },
  {
    id: 'glass',
    name: 'Glass',
    description: 'Современный глянец: блюр и градиенты.',
    theme: 'base',
    themeVariables: {
      primaryColor: 'rgba(255, 255, 255, 0.7)',
      primaryTextColor: '#1f2937',
      primaryBorderColor: 'rgba(255, 255, 255, 0.5)',
      lineColor: '#6366f1',
      mainBkg: 'rgba(255, 255, 255, 0.2)',
    },
    css: `
      .mermaid-container { 
        background: linear-gradient(135deg, #e0e7ff 0%, #f3f4f6 100%); 
      }
      .node rect, .node circle, .node polygon, .node path {
        backdrop-filter: blur(8px);
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.05));
      }
      /* Color differentiation for Glass */
      .mermaid-container .node rect {
        fill: rgba(59, 130, 246, 0.1) !important;
        stroke: rgba(59, 130, 246, 0.5) !important;
      }
      .mermaid-container .node polygon {
        fill: rgba(139, 92, 246, 0.1) !important;
        stroke: rgba(139, 92, 246, 0.5) !important;
      }
      .mermaid-container .node circle, .mermaid-container .node ellipse {
        fill: rgba(34, 197, 94, 0.1) !important;
        stroke: rgba(34, 197, 94, 0.5) !important;
      }
    `
  }
];
