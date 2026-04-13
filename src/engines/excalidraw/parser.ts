import { Graph, Node, Edge, NodeType, NodeStyle } from './types';

function parseStyles(styleStr: string): any {
  if (!styleStr) return {};
  const styles: any = {};
  const pairs = styleStr.split(',').map(p => p.trim());
  for (const pair of pairs) {
    const [key, value] = pair.split(':').map(p => p.trim());
    if (key && value) {
      // Strip quotes from value if present
      const cleanValue = value.replace(/^["']|["']$/g, '');
      
      // Convert numeric values
      if (!isNaN(Number(cleanValue))) {
        styles[key] = Number(cleanValue);
      } else {
        styles[key] = cleanValue;
      }
    }
  }
  return styles;
}

export function parseExcalidraw(text: string): Graph {
  // Check if it's JSON
  if (text.trim().startsWith('{')) {
    try {
      const json = JSON.parse(text);
      if (json.type === 'excalidraw') {
        const nodes: Node[] = [];
        const edges: Edge[] = [];
        const elements: (Node | Edge)[] = [];

        for (const el of json.elements) {
          if (el.isDeleted) continue;

          if (el.type === 'arrow') {
            const edge: Edge = {
              from: el.startBinding?.elementId || `start-${el.id}`,
              to: el.endBinding?.elementId || `end-${el.id}`,
              label: '', // Arrows in native JSON usually have separate text elements
              points: el.points.map((p: [number, number]) => ({
                x: el.x + p[0],
                y: el.y + p[1]
              })),
              style: {
                stroke: el.strokeColor,
                strokeWidth: el.strokeWidth,
                roughness: el.roughness,
                strokeLineDash: el.strokeStyle === 'dashed' ? [8, 8] : el.strokeStyle === 'dotted' ? [2, 4] : undefined
              }
            };
            edges.push(edge);
            elements.push(edge);
          } else {
            // Treat everything else as a node for now (rectangle, ellipse, diamond, text)
            let type: NodeType = 'rectangle';
            if (el.type === 'ellipse') type = 'ellipse';
            if (el.type === 'diamond') type = 'diamond';
            
            // For text elements, we might want to render them differently, 
            // but our Node type expects a label and a shape.
            // If it's a pure text element, we can use a transparent rectangle.
            const isText = el.type === 'text';
            
            const node: Node = {
              id: el.id,
              label: el.text || '',
              type,
              x: el.x + el.width / 2,
              y: el.y + el.height / 2,
              width: el.width,
              height: el.height,
              style: {
                stroke: isText ? 'transparent' : el.strokeColor,
                fill: el.backgroundColor,
                fillStyle: el.fillStyle,
                strokeWidth: el.strokeWidth,
                roughness: el.roughness,
                opacity: el.opacity / 100,
                fontSize: el.fontSize,
                fontFamily: el.fontFamily,
                textAlign: el.textAlign,
                verticalAlign: el.verticalAlign
              }
            };
            nodes.push(node);
            elements.push(node);
          }
        }

        return {
          nodes,
          edges,
          elements,
          direction: 'TB' // Default
        };
      }
    } catch (e) {
      console.warn('Failed to parse Excalidraw JSON, falling back to text parser', e);
    }
  }

  const lines = text.split('\n');
  const nodes: Map<string, Node> = new Map();
  const edges: Edge[] = [];
  const elements: (Node | Edge)[] = [];
  let direction: 'TB' | 'LR' | 'BT' | 'RL' = 'TB';
  let defaultStyle: any = {};

  // Improved regex: 
  // 1. ID
  // 2. Label in [], (), or {}
  // 3. Optional style block { key: value }
  const nodeDefRegex = /^(\w+)\s*(?:\[(.*?)\]|\((.*?)\)|\{(.*?)\})(?:\s*\{(.*)\})?$/;
  const edgeRegex = /^(\w+)\s*->\s*(.*)$/;
  const directionRegex = /^direction\s*:\s*(TB|LR|BT|RL)$/i;
  const standaloneStyleRegex = /^\{(.*)\}$/;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    const dirMatch = line.match(directionRegex);
    if (dirMatch) {
      direction = dirMatch[1].toUpperCase() as any;
      continue;
    }

    const styleMatch = line.match(standaloneStyleRegex);
    if (styleMatch) {
      defaultStyle = { ...defaultStyle, ...parseStyles(styleMatch[1]) };
      continue;
    }

    const nodeMatch = line.match(nodeDefRegex);
    if (nodeMatch) {
      const [, id, rectLabel, ellipseLabel, diamondLabel, styleStr] = nodeMatch;
      let label = (rectLabel || ellipseLabel || diamondLabel || '').replace(/\\n/g, '\n');
      let type: NodeType = 'rectangle';
      if (diamondLabel !== undefined) type = 'diamond';
      if (ellipseLabel !== undefined) type = 'ellipse';
      
      const node: Node = { 
        id, 
        label: label.trim(), 
        type,
        style: { ...defaultStyle, ...parseStyles(styleStr) }
      };
      nodes.set(id, node);
      elements.push(node);
      continue;
    }

    const edgeMatch = line.match(edgeRegex);
    if (edgeMatch) {
      const [, from, rest] = edgeMatch;
      
      // Handle chains: A -> B -> C : Label { style }
      // Split rest by -> but be careful with labels
      const parts = rest.split('->').map(p => p.trim());
      let currentFrom = from;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        // The last part might have a label and style: "C : Label { style }"
        if (i === parts.length - 1) {
          const labelStyleMatch = part.match(/^(\w+)(?:\s*[:]\s*([^{]*))?(?:\s*\{(.*)\})?$/);
          if (labelStyleMatch) {
            const [, to, label, styleStr] = labelStyleMatch;
            if (!nodes.has(currentFrom)) {
              const n: Node = { id: currentFrom, label: currentFrom, type: 'rectangle', style: defaultStyle };
              nodes.set(currentFrom, n);
              elements.push(n);
            }
            if (!nodes.has(to)) {
              const n: Node = { id: to, label: to, type: 'rectangle', style: defaultStyle };
              nodes.set(to, n);
              elements.push(n);
            }
            
            const edge: Edge = { 
              from: currentFrom, 
              to, 
              label: label?.trim(),
              style: { ...defaultStyle, ...parseStyles(styleStr) }
            };
            edges.push(edge);
            elements.push(edge);
          }
        } else {
          const to = part;
          if (!nodes.has(currentFrom)) {
            const n: Node = { id: currentFrom, label: currentFrom, type: 'rectangle', style: defaultStyle };
            nodes.set(currentFrom, n);
            elements.push(n);
          }
          if (!nodes.has(to)) {
            const n: Node = { id: to, label: to, type: 'rectangle', style: defaultStyle };
            nodes.set(to, n);
            elements.push(n);
          }
          
          const edge: Edge = { 
            from: currentFrom, 
            to,
            style: defaultStyle
          };
          edges.push(edge);
          elements.push(edge);
          currentFrom = to;
        }
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
    elements,
    direction
  };
}