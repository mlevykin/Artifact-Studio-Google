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
      /* Color differentiation for Minimalist - Solid Pastel Fills */
      .mermaid-container .node rect, .mermaid-container .actor { fill: #eff6ff !important; stroke: #3b82f6 !important; }
      .mermaid-container .node polygon { fill: #f5f3ff !important; stroke: #8b5cf6 !important; }
      .mermaid-container .node circle, .mermaid-container .node ellipse { fill: #f0fdf4 !important; stroke: #22c55e !important; }
      .mermaid-container .note { fill: #fffbeb !important; stroke: #f59e0b !important; }
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
      /* Color differentiation for Dark Tech - Glowing Fills */
      /* Processes / Actors - Cyan */
      .mermaid-container .node rect, .mermaid-container .actor {
        fill: rgba(0, 255, 255, 0.15) !important;
        stroke: #00FFFF !important;
        stroke-width: 2px !important;
        filter: drop-shadow(0 0 5px rgba(0, 255, 255, 0.4));
      }
      /* Decisions - Magenta/Purple */
      .mermaid-container .node polygon {
        fill: rgba(255, 0, 255, 0.15) !important;
        stroke: #FF00FF !important;
        stroke-width: 2px !important;
        filter: drop-shadow(0 0 5px rgba(255, 0, 255, 0.4));
      }
      /* Start/End - Green */
      .mermaid-container .node circle, 
      .mermaid-container .node ellipse {
        fill: rgba(0, 255, 128, 0.15) !important;
        stroke: #00FF80 !important;
        stroke-width: 2px !important;
        filter: drop-shadow(0 0 5px rgba(0, 255, 128, 0.4));
      }
      /* Notes - Yellow/Orange */
      .mermaid-container .note {
        fill: rgba(255, 255, 0, 0.1) !important;
        stroke: #FFFF00 !important;
        stroke-width: 1px !important;
      }
      /* Other shapes - Orange */
      .mermaid-container .node path:not(.path) {
        fill: rgba(255, 128, 0, 0.15) !important;
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
      .node rect, .actor { rx: 8; ry: 8; fill: #dbeafe !important; stroke: #1e40af !important; }
      .node polygon { fill: #ede9fe !important; stroke: #5b21b6 !important; }
      .node circle, .node ellipse { fill: #dcfce7 !important; stroke: #166534 !important; }
      .note { fill: #fef3c7 !important; stroke: #92400e !important; }
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
      .node rect, .node circle, .node polygon, .node path, .actor {
        stroke-width: 2px !important;
      }
      /* Color differentiation for Sketch - Light Hand-drawn Fills */
      .mermaid-container .node rect, .mermaid-container .actor { fill: #fdfcf0 !important; stroke: #000 !important; }
      .mermaid-container .node polygon { fill: #f0fdfa !important; stroke: #000 !important; }
      .mermaid-container .node circle, .mermaid-container .node ellipse { fill: #fdf2f2 !important; stroke: #000 !important; }
      .mermaid-container .note { fill: #fffbeb !important; stroke: #000 !important; }
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
      .node rect, .node circle, .node polygon, .node path, .actor, .note {
        backdrop-filter: blur(8px);
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.05));
      }
      /* Color differentiation for Glass - More Opaque Translucent Fills */
      .mermaid-container .node rect, .mermaid-container .actor {
        fill: rgba(59, 130, 246, 0.2) !important;
        stroke: rgba(59, 130, 246, 0.6) !important;
      }
      .mermaid-container .node polygon {
        fill: rgba(139, 92, 246, 0.2) !important;
        stroke: rgba(139, 92, 246, 0.6) !important;
      }
      .mermaid-container .node circle, .mermaid-container .node ellipse {
        fill: rgba(34, 197, 94, 0.2) !important;
        stroke: rgba(34, 197, 94, 0.6) !important;
      }
      .mermaid-container .note {
        fill: rgba(245, 158, 11, 0.2) !important;
        stroke: rgba(245, 158, 11, 0.6) !important;
      }
    `
  },
  {
    id: 'banana',
    name: 'Paper Banana',
    description: 'Академический стиль: мягкие цвета, идеальные скругления и четкая иерархия.',
    theme: 'base',
    themeVariables: {
      primaryColor: '#f0f4ff',
      primaryTextColor: '#1a1a2e',
      primaryBorderColor: '#4a6fa5',
      lineColor: '#555555',
      secondaryColor: '#fff8e1',
      tertiaryColor: '#f0fdf4',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      mainBkg: '#ffffff',
      nodeBorder: '#4a6fa5',
      clusterBkg: '#f8fafc',
      clusterBorder: '#e2e8f0',
      defaultLinkColor: '#555555',
      titleColor: '#1a1a2e',
      edgeLabelBackground: '#ffffff',
    },
    css: `
      .mermaid-container { 
        background: #ffffff;
        padding: 20px;
      }
      .node rect, .node polygon, .node circle, .node ellipse, .node path {
        stroke-width: 1.5px !important;
      }
      .node rect { rx: 8; ry: 8; fill: #f0f4ff !important; stroke: #4a6fa5 !important; }
      .node .label { color: #1a1a2e !important; }
      .node polygon { fill: #fff8e1 !important; stroke: #c9a227 !important; }
      .node circle, .node ellipse { fill: #f0fdf4 !important; stroke: #166534 !important; }
      .edgePath path { stroke: #555555 !important; stroke-width: 1.5px !important; }
      .marker { fill: #555555 !important; stroke: #555555 !important; }
      .label foreignObject { overflow: visible; }
      .edgeLabel { background-color: rgba(255, 255, 255, 0.8) !important; padding: 2px; border-radius: 4px; }
    `
  }
];
