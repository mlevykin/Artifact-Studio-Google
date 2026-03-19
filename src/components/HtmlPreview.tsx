import React from 'react';

interface HtmlPreviewProps {
  content: string;
}

export const HtmlPreview: React.FC<HtmlPreviewProps> = ({ content }) => {
  return (
    <iframe
      srcDoc={`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { margin: 0; font-family: sans-serif; }
              ::-webkit-scrollbar { width: 8px; height: 8px; }
              ::-webkit-scrollbar-track { background: #f1f1f1; }
              ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
              ::-webkit-scrollbar-thumb:hover { background: #aaa; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `}
      title="HTML Preview"
      className="w-full h-full border-none bg-white"
      sandbox="allow-scripts"
    />
  );
};
