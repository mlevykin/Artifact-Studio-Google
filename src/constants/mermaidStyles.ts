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
      .mermaid-container .edgePath path,
      .mermaid-container .edgePaths .edgePath path,
      .mermaid-container .flowchart-link,
      .mermaid-container .transition,
      .mermaid-container path.path {
        stroke-dasharray: 10, 5 !important;
        animation: flow 1s linear infinite !important;
        stroke: #00FFFF !important;
        stroke-width: 2px !important;
      }
      .mermaid-container .marker,
      .mermaid-container .marker-end,
      .mermaid-container .marker-start,
      .mermaid-container marker path {
        fill: #00FFFF !important;
        stroke: #00FFFF !important;
      }
      .mermaid-container .node rect, 
      .mermaid-container .node circle, 
      .mermaid-container .node polygon, 
      .mermaid-container .node path,
      .mermaid-container .node .label-container {
        fill: #161B22 !important;
        stroke: #00FFFF !important;
        stroke-width: 1.5px !important;
        filter: drop-shadow(0 0 2px rgba(0, 255, 255, 0.3));
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
      .node rect { rx: 8; ry: 8; }
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
        fill: rgba(255, 255, 255, 0.4) !important;
        stroke: rgba(255, 255, 255, 0.8) !important;
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.05));
      }
    `
  }
];
