import { useEditor, EditorContent } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Image } from '@tiptap/extension-image';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { EditorToolbar } from './EditorToolbar';
import { ImageControls } from './ImageControls';
import { ExportButtons } from './ExportButtons';
import { useState, useCallback, useEffect, useRef } from 'react';
import mammoth from 'mammoth';

export const DocumentEditor = () => {
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const imageBlobCache = useRef<Map<string, string>>(new Map());

  const editor = useEditor({
    extensions: [
      // Simple Page Break extension rendered as an <hr> with marker attributes
      Node.create({
        name: 'pageBreak',
        group: 'block',
        atom: true,
        selectable: true,
        parseHTML() {
          return [
            {
              tag: 'hr',
              getAttrs: (element) =>
                (element as HTMLElement).getAttribute('data-page-break') === 'true' ? null : false,
            },
          ];
        },
        renderHTML({ HTMLAttributes }) {
          return ['hr', mergeAttributes(HTMLAttributes, { class: 'page-break', 'data-page-break': 'true' })];
        },
      }),
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Color,
      TextStyle,
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content: `
      <h1>Document Title</h1>
      <p>Start writing your document here...</p>
    `,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[800px] p-8',
      },
    },
  });

  const handlePdfUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;
    type PDFViewport = { width: number; height: number };
    type PDFPageProxy = {
      getViewport: (opts: { scale: number }) => PDFViewport;
      render: (params: { canvasContext: CanvasRenderingContext2D; viewport: PDFViewport }) => { promise: Promise<void> };
      // Minimal shape needed from pdf.js for text extraction
      getTextContent: () => Promise<{ items: Array<{ str: string; transform: number[] }> }>;
    };
    type PDFDocumentProxy = { numPages: number; getPage: (pageNumber: number) => Promise<PDFPageProxy> };
    // Use legacy build to access SVGGraphics for high-fidelity layout
    const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as {
      getDocument: (src: unknown) => { promise: Promise<PDFDocumentProxy> };
      GlobalWorkerOptions: { workerSrc: string };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      SVGGraphics: any;
    };
    // Configure worker for legacy build
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Build high-fidelity HTML by converting each page to SVG via SVGGraphics
    const htmlParts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opList = await (page as any).getOperatorList();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const svgGfx = new (pdfjsLib as any).SVGGraphics((page as any).commonObjs, (page as any).objs);
      svgGfx.embedFonts = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const svgEl = await (svgGfx as any).getSVG(opList, viewport);

      // Process images inside SVG: cache data URLs as Blobs and swap to blob URLs
      const serializer = new XMLSerializer();
      const svgStringRaw = serializer.serializeToString(svgEl);
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgStringRaw, 'image/svg+xml');
      const imageNodes = Array.from(doc.querySelectorAll('image')) as SVGImageElement[];

      await Promise.all(
        imageNodes.map(async (node) => {
          const href = node.getAttribute('href') || node.getAttribute('xlink:href');
          if (!href) return;
          if (href.startsWith('data:')) {
            // Cache blob URLs for repeated images
            const existing = imageBlobCache.current.get(href);
            if (existing) {
              node.setAttribute('href', existing);
              node.setAttribute('xlink:href', existing);
              return;
            }
            const resp = await fetch(href);
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            imageBlobCache.current.set(href, blobUrl);
            node.setAttribute('href', blobUrl);
            node.setAttribute('xlink:href', blobUrl);
          }
        })
      );

      const svgString = serializer.serializeToString(doc.documentElement);
      // Wrap each page in a container to preserve page dimensions
      htmlParts.push(
        `<div data-pdf-page="${i}" style="position:relative;width:${viewport.width}px;height:${viewport.height}px;overflow:hidden">${svgString}</div>`
      );
      if (i < pdf.numPages) {
        htmlParts.push('<hr class="page-break" data-page-break="true" />');
      }
    }

    if (htmlParts.length) {
      const finalHtml = htmlParts.join('');
      editor.chain().focus().setContent(finalHtml, { emitUpdate: true }).run();
    }
    event.currentTarget.value = '';
  }, [editor]);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && editor) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        editor.chain().focus().setImage({ src: url }).run();
      };
      reader.readAsDataURL(file);
    }
  }, [editor]);

  const handleWordUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && editor) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const result = await mammoth.convertToHtml({ arrayBuffer });
          editor.chain().focus().setContent(result.value).run();
        } catch (error) {
          console.error('Error parsing Word document:', error);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, [editor]);

  const handleImageClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      setSelectedImage(img);
      const rect = img.getBoundingClientRect();
      setImagePosition({ x: rect.right + 10, y: rect.top });
    } else {
      setSelectedImage(null);
    }
  }, []);

  // Add click listener for images
  useEffect(() => {
    if (editor) {
      const editorElement = editor.view.dom;
      editorElement.addEventListener('click', handleImageClick);
      return () => {
        editorElement.removeEventListener('click', handleImageClick);
      };
    }
  }, [editor, handleImageClick]);

  if (!editor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-editor-background">
      <div className="max-w-full">
        {/* Header */}
        <div className="bg-editor-toolbar border-b border-editor-toolbar-border px-4 py-2">
          <h1 className="text-lg font-semibold text-foreground">Document Editor</h1>
        </div>

        {/* Toolbar */}
        <EditorToolbar editor={editor} onImageUpload={handleImageUpload} onWordUpload={handleWordUpload} onPdfUpload={handlePdfUpload} />

        {/* Export Buttons */}
        <ExportButtons editor={editor} />

        {/* Document Area */}
        <div className="p-8 flex justify-center">
          <div className="bg-editor-document shadow-lg rounded-lg max-w-4xl w-full min-h-[1000px] relative">
            <EditorContent 
              editor={editor} 
              className="p-8"
            />
            
            {/* Dynamic Image Controls */}
            {selectedImage && (
              <ImageControls
                image={selectedImage}
                position={imagePosition}
                editor={editor}
                onClose={() => setSelectedImage(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};