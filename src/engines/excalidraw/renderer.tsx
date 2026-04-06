import React, { useEffect, useRef, useState } from 'react';
import rough from 'roughjs';
import { Graph, Node, Edge } from './types';

interface ExcalidrawRendererProps {
  graph: Graph;
  step?: number;
}

export const ExcalidrawRenderer: React.FC<ExcalidrawRendererProps> = ({ graph, step }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState('0 0 800 600');

  useEffect(() => {
    if (!svgRef.current) return;

    const rc = rough.svg(svgRef.current);
    const svg = svgRef.current;
    
    // Clear previous drawings
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Filter elements based on step if provided
    const visibleNodes = step !== undefined ? graph.nodes.slice(0, step) : graph.nodes;
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    // Draw elements
    for (const el of graph.elements) {
      let isVisible = true;
      if (step !== undefined) {
        if ('from' in el) {
          // Edge: visible if its target node is visible
          isVisible = visibleNodeIds.has((el as Edge).to);
        } else {
          // Node: visible if it's in the current step range
          isVisible = visibleNodeIds.has((el as Node).id);
        }
      }
      
      if (!isVisible) continue;

      if ('from' in el) {
        // Draw Edge
        const edge = el as Edge;
        const points = edge.points || [];
        if (points.length < 2) continue;

        const style = edge.style || {};
        const options = {
          roughness: style.roughness ?? 1.2,
          stroke: style.stroke ?? '#71717a',
          strokeWidth: style.strokeWidth ?? 1.2,
          strokeLineDash: style.strokeLineDash
        };

        const pathPoints: [number, number][] = points.map(p => [p.x, p.y]);
        const shape = rc.curve(pathPoints, options);
        svg.appendChild(shape);

        // Draw arrow head
        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
        const arrowSize = 10;
        const arrowPoints: [number, number][] = [
          [last.x - arrowSize * Math.cos(angle - Math.PI / 6), last.y - arrowSize * Math.sin(angle - Math.PI / 6)],
          [last.x, last.y],
          [last.x - arrowSize * Math.cos(angle + Math.PI / 6), last.y - arrowSize * Math.sin(angle + Math.PI / 6)]
        ];
        const arrow = rc.linearPath(arrowPoints, options);
        svg.appendChild(arrow);

        // Edge label
        if (edge.label) {
          const midIdx = Math.floor(points.length / 2);
          const mid = points[midIdx];
          
          const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          const labelWidth = edge.label.length * 8 + 10;
          const labelHeight = 20;
          bg.setAttribute('x', (mid.x - labelWidth / 2).toString());
          bg.setAttribute('y', (mid.y - labelHeight / 2 - 5).toString());
          bg.setAttribute('width', labelWidth.toString());
          bg.setAttribute('height', labelHeight.toString());
          bg.setAttribute('fill', 'white');
          bg.setAttribute('opacity', '0.9');
          bg.setAttribute('rx', '4');
          svg.appendChild(bg);

          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', mid.x.toString());
          text.setAttribute('y', (mid.y - 5).toString());
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('font-family', '"Inter", sans-serif');
          text.setAttribute('font-size', '12px');
          text.setAttribute('font-weight', '500');
          text.setAttribute('fill', '#71717a');
          text.textContent = edge.label;
          svg.appendChild(text);
        }
      } else {
        // Draw Node
        const node = el as Node;
        const { x = 0, y = 0, width = 100, height = 50, label, type, style = {} } = node;
        const left = x - width / 2;
        const top = y - height / 2;

        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, left + width);
        maxY = Math.max(maxY, top + height);

        const options = {
          roughness: style.roughness ?? 1.5,
          stroke: style.stroke ?? '#3f3f46',
          strokeWidth: style.strokeWidth ?? 1.5,
          fill: style.fill,
          fillStyle: style.fillStyle ?? 'hachure',
          fillWeight: 1.5,
          hachureAngle: 60,
          hachureGap: 4,
          opacity: style.opacity ?? 1
        };

        let shape;
        if (type === 'diamond') {
          shape = rc.polygon([
            [x, top],
            [left + width, y],
            [x, top + height],
            [left, y]
          ], options);
        } else if (type === 'ellipse') {
          shape = rc.ellipse(x, y, width, height, options);
        } else {
          shape = rc.rectangle(left, top, width, height, options);
        }
        svg.appendChild(shape);

        // Add icon and text
        const iconSize = 18;
        const iconPadding = 8;
        const lines = label.split('\n');
        const maxLineLength = Math.max(...lines.map(l => l.length));
        const estimatedTextWidth = maxLineLength * 8;
        
        let totalContentWidth = estimatedTextWidth;
        if (style.icon) {
          totalContentWidth += iconSize + iconPadding;
        }

        const startX = x - totalContentWidth / 2;
        let textX = x;

        if (style.icon) {
          const iconX = startX;
          textX = startX + iconSize + iconPadding + estimatedTextWidth / 2;

          const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          img.setAttribute('x', iconX.toString());
          img.setAttribute('y', (y - iconSize / 2).toString());
          img.setAttribute('width', iconSize.toString());
          img.setAttribute('height', iconSize.toString());
          img.setAttribute('href', `https://unpkg.com/lucide-static@latest/icons/${style.icon}.svg`);
          svg.appendChild(img);
        }

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', textX.toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-family', '"Inter", sans-serif');
        text.setAttribute('font-size', '14px');
        text.setAttribute('font-weight', '500');
        text.setAttribute('fill', style.stroke ?? '#18181b');
        
        const lineHeight = 18;
        const startY = y - ((lines.length - 1) * lineHeight) / 2;
        
        lines.forEach((line, i) => {
          const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          tspan.setAttribute('x', textX.toString());
          tspan.setAttribute('dy', i === 0 ? '0' : lineHeight.toString());
          tspan.textContent = line;
          text.appendChild(tspan);
        });
        
        text.setAttribute('y', (startY + 4).toString());
        svg.appendChild(text);
      }
    }

    // Update viewBox based on ALL nodes and edges to keep layout stable during presentation
    let fullMinX = Infinity, fullMinY = Infinity, fullMaxX = -Infinity, fullMaxY = -Infinity;
    
    for (const node of graph.nodes) {
      const { x = 0, y = 0, width = 100, height = 50 } = node;
      fullMinX = Math.min(fullMinX, x - width / 2);
      fullMinY = Math.min(fullMinY, y - height / 2);
      fullMaxX = Math.max(fullMaxX, x + width / 2);
      fullMaxY = Math.max(fullMaxY, y + height / 2);
    }

    for (const edge of graph.edges) {
      if (edge.points) {
        for (const p of edge.points) {
          fullMinX = Math.min(fullMinX, p.x);
          fullMinY = Math.min(fullMinY, p.y);
          fullMaxX = Math.max(fullMaxX, p.x);
          fullMaxY = Math.max(fullMaxY, p.y);
        }
      }
    }

    if (fullMinX !== Infinity) {
      const padding = 60; // Increased padding for rough edges and labels
      const width = fullMaxX - fullMinX + padding * 2;
      const height = fullMaxY - fullMinY + padding * 2;
      setViewBox(`${fullMinX - padding} ${fullMinY - padding} ${width} ${height}`);
    }

  }, [graph, step]);

  // Calculate natural dimensions from viewBox
  const [vbX, vbY, vbW, vbH] = viewBox.split(' ').map(Number);

  return (
    <div className="w-full h-full overflow-visible flex items-center justify-center p-4">
      <div 
        className="excalidraw-container shadow-sm rounded-lg flex items-center justify-center bg-white"
        style={{ 
          width: vbW ? `${vbW}px` : 'auto',
          maxWidth: '100%',
          maxHeight: '100%',
          minHeight: '100px',
          aspectRatio: vbW && vbH ? `${vbW} / ${vbH}` : 'auto'
        }}
      >
        <svg 
          ref={svgRef} 
          viewBox={viewBox} 
          className="w-full h-full block" 
          preserveAspectRatio="xMidYMid meet" 
        />
      </div>
    </div>
  );
};