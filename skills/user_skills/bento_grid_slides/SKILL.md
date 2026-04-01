---
name: Bento Grid Slides
description: Guidelines for creating professional presentation slides and "Bento Grid" layouts using HTML artifacts. Use this for comparisons, feature lists, and multi-diagram overviews.
---

# Bento Grid Slides

To create professional slides like the ones in the image (Top 6 tools, feature grids, etc.), use the `html` artifact type with Tailwind CSS.

## 1. Basic Structure
Use a grid layout with cards for each item.

```html
<div class="min-h-screen bg-zinc-950 p-8 text-white font-sans">
  <h1 class="text-4xl font-bold text-center mb-12">
    Top 6 <span class="text-blue-500">Tools</span> to Turn Code into <span class="text-orange-500">Diagrams</span>
  </h1>
  
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
    <!-- Card 1 -->
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 bg-blue-500/10 rounded-lg text-blue-500">
          <!-- Lucide Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></皮>
        </div>
        <h2 class="text-xl font-semibold">Mermaid</h2>
      </div>
      <p class="text-zinc-400 text-sm mb-4">Markdown-based diagramming tool for flowcharts, sequence diagrams, and more.</p>
      <div class="aspect-video bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-center">
        <!-- Placeholder for diagram or image -->
        <span class="text-zinc-600 text-xs">Diagram Preview</span>
      </div>
    </div>
    
    <!-- Repeat for other cards -->
  </div>
</div>
```

## 2. Embedding Diagrams
Since the `html` artifact is an iframe, you can't directly use the React components. However, you can:
- Use **SVG** directly inside the HTML.
- Use **Mermaid.js** via CDN inside the HTML.
- Use **Images** from CDNs.

## 3. Styling Tips
- **Dark Mode**: Use `bg-zinc-950` and `text-white` for a professional "tech" look.
- **Gradients**: Use Tailwind gradients for accents (`bg-gradient-to-br from-blue-500 to-purple-600`).
- **Typography**: Use `font-sans` (Inter) for a modern feel.
- **Icons**: Use Lucide icons (SVG strings) for each category.
