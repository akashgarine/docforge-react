import { useEditor, EditorContent } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Image } from "@tiptap/extension-image";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";
import { Underline } from "@tiptap/extension-underline";
import { EditorToolbar } from "./EditorToolbar";
import { ExportButtons } from "./ExportButtons";
import docx2html from 'docx2html';
import { useState, useCallback, useEffect, useRef } from "react";
import mammoth from "mammoth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

const findAllPlaceholders = (editor: ReturnType<typeof useEditor>) => {
  if (!editor) return;
  const html = editor.getHTML();
  const matches = html.match(/\{\{([\w\d_\s]+)\}\}/g) || [];
  const placeholders = matches.map((m) => m.replace(/[{}]/g, ""));
  console.log("🟡 Found placeholders:", placeholders);
  alert(`Found placeholders: ${placeholders.join(", ") || "None"}`);
};

// ✅ Default placeholders
const defaultPlaceholders = [
  "{{name}}",
  "{{phone number}}",
  "{{Address}}",
  "{{email}}",
  "{{company}}",
  "{{date}}",
  "{{position}}",
  "{{salary}}",
  "{{first name}}",
  "{{last name}}",
  "{{city}}",
  "{{state}}",
  "{{zip code}}",
  "{{country}}",
];

// ✅ Insert placeholder at cursor
const insertPlaceholder = (
  editor: ReturnType<typeof useEditor>,
  placeholder: string
) => {
  if (!editor) return;
  editor.chain().focus().insertContent(placeholder).run();
};

export const DocumentEditor = () => {
  const imageBlobCache = useRef<Map<string, string>>(new Map());

  // Custom placeholders state
  const [customPlaceholder, setCustomPlaceholder] = useState("");
  const [allPlaceholders, setAllPlaceholders] = useState(() => {
    // Load custom placeholders from localStorage on component mount
    const saved = localStorage.getItem("customPlaceholders");
    const customPlaceholders = saved ? JSON.parse(saved) : [];

    // Load removed default placeholders
    const removedDefaults = JSON.parse(
      localStorage.getItem("removedDefaultPlaceholders") || "[]"
    );
    const availableDefaults = defaultPlaceholders.filter(
      (p) => !removedDefaults.includes(p)
    );

    // Put custom placeholders first, then remaining default ones
    return [...customPlaceholders, ...availableDefaults];
  });

  // Resizable images state
  const [resizableImages, setResizableImages] = useState<
    Array<{
      id: string;
      src: string;
      width: number;
      height: number;
    }>
  >([]);

  // ✅ Add custom placeholder
  const addCustomPlaceholder = () => {
    if (!customPlaceholder.trim()) return;

    // Format the placeholder with double curly braces if not already formatted
    const formattedPlaceholder =
      customPlaceholder.startsWith("{{") && customPlaceholder.endsWith("}}")
        ? customPlaceholder
        : `{{${customPlaceholder.trim()}}}`;

    // Check if placeholder already exists
    if (allPlaceholders.includes(formattedPlaceholder)) {
      alert("This placeholder already exists!");
      return;
    }

    // Add to the beginning of the list (new placeholders first)
    const newPlaceholders = [formattedPlaceholder, ...allPlaceholders];
    setAllPlaceholders(newPlaceholders);

    // Save custom placeholders to localStorage (excluding default ones)
    const customOnly = newPlaceholders.filter(
      (p) => !defaultPlaceholders.includes(p)
    );
    localStorage.setItem("customPlaceholders", JSON.stringify(customOnly));

    // Clear input
    setCustomPlaceholder("");
  };

  // ✅ Handle Enter key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addCustomPlaceholder();
    }
  };

  // ✅ Remove resizable image
  const removeResizableImage = useCallback((imageId: string) => {
    setResizableImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  // ✅ Delete placeholder (custom or default)
  const deletePlaceholder = (placeholderToDelete: string) => {
    // Remove from the list
    const newPlaceholders = allPlaceholders.filter(
      (p) => p !== placeholderToDelete
    );
    setAllPlaceholders(newPlaceholders);

    // Update localStorage - save all remaining placeholders that are not in the original defaults
    const customOnly = newPlaceholders.filter(
      (p) => !defaultPlaceholders.includes(p)
    );
    localStorage.setItem("customPlaceholders", JSON.stringify(customOnly));

    // If it's a default placeholder being removed, we need to track removed defaults separately
    if (defaultPlaceholders.includes(placeholderToDelete)) {
      const removedDefaults = JSON.parse(
        localStorage.getItem("removedDefaultPlaceholders") || "[]"
      );
      if (!removedDefaults.includes(placeholderToDelete)) {
        removedDefaults.push(placeholderToDelete);
        localStorage.setItem(
          "removedDefaultPlaceholders",
          JSON.stringify(removedDefaults)
        );
      }
    }
  };

  const editor = useEditor({
    extensions: [
      Node.create({
        name: "pageBreak",
        group: "block",
        atom: true,
        selectable: true,
        parseHTML() {
          return [
            {
              tag: "hr",
              getAttrs: (element) =>
                (element as HTMLElement).getAttribute("data-page-break") ===
                "true"
                  ? null
                  : false,
            },
          ];
        },
        renderHTML({ HTMLAttributes }) {
          return [
            "hr",
            mergeAttributes(HTMLAttributes, {
              class: "page-break",
              "data-page-break": "true",
            }),
          ];
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
          class: "editor-image",
        },
      }),
      Color,
      TextStyle,
      FontFamily,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
    ],
    content: `
      <h1>Document Title</h1>
      <p>Start writing your document here...</p>
    `,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[800px] p-8",
      },
    },
  });
console.log(editor, "sdklnasdklnasdklnasdklnasdklnas")

  // Function to split HTML by page breaks
  const splitHtmlByPageBreaks = (html: string) => {
    // Split by page break elements
    const parts = html.split('<hr class="page-break" data-page-break="true">');
    
    // Create object with page numbers as keys
    const pageObject: Record<number, string> = {};
    
    parts.forEach((part, index) => {
      // Clean up any extra whitespace and empty content
      const cleanedPart = part.trim();
      if (cleanedPart) {
        pageObject[index] = cleanedPart;
      }
    });
    
    return pageObject;
  };

  useEffect(() => {
    if (editor) {
      const html = editor.getHTML();
      console.log(html, "asdklanssdasd");
      
      // Split HTML by page breaks and log the result
      const pagesSplit = splitHtmlByPageBreaks(html);
      console.log("Pages split by pagdde bsdsdreaks:", pagesSplit);
    }
  }, [editor]);

  const handlePdfUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !editor) return;
      type PDFViewport = { width: number; height: number };
      type PDFPageProxy = {
        getViewport: (opts: { scale: number }) => PDFViewport;
        render: (params: {
          canvasContext: CanvasRenderingContext2D;
          viewport: PDFViewport;
        }) => { promise: Promise<void> };
        // Minimal shape needed from pdf.js for text extraction
        getTextContent: () => Promise<{
          items: Array<{ str: string; transform: number[] }>;
        }>;
      };
      type PDFDocumentProxy = {
        numPages: number;
        getPage: (pageNumber: number) => Promise<PDFPageProxy>;
      };
      // Use legacy build to access SVGGraphics for high-fidelity layout
      const pdfjsLib = (await import(
        "pdfjs-dist/legacy/build/pdf.mjs"
      )) as unknown as {
        getDocument: (src: unknown) => { promise: Promise<PDFDocumentProxy> };
        GlobalWorkerOptions: { workerSrc: string };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        SVGGraphics: any;
      };
      // Configure worker for legacy build
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

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
        const svgGfx = new (pdfjsLib as any).SVGGraphics(
          (page as any).commonObjs,
          (page as any).objs
        );
        svgGfx.embedFonts = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const svgEl = await (svgGfx as any).getSVG(opList, viewport);

        // Process images inside SVG: cache data URLs as Blobs and swap to blob URLs
        const serializer = new XMLSerializer();
        const svgStringRaw = serializer.serializeToString(svgEl);
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgStringRaw, "image/svg+xml");
        const imageNodes = Array.from(
          doc.querySelectorAll("image")
        ) as SVGImageElement[];

        await Promise.all(
          imageNodes.map(async (node) => {
            const href =
              node.getAttribute("href") || node.getAttribute("xlink:href");
            if (!href) return;
            if (href.startsWith("data:")) {
              // Cache blob URLs for repeated images
              const existing = imageBlobCache.current.get(href);
              if (existing) {
                node.setAttribute("href", existing);
                node.setAttribute("xlink:href", existing);
                return;
              }
              const resp = await fetch(href);
              const blob = await resp.blob();
              const blobUrl = URL.createObjectURL(blob);
              imageBlobCache.current.set(href, blobUrl);
              node.setAttribute("href", blobUrl);
              node.setAttribute("xlink:href", blobUrl);
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
        const finalHtml = htmlParts.join("");
        editor
          .chain()
          .focus()
          .setContent(finalHtml, { emitUpdate: true })
          .run();
      }
      event.currentTarget.value = "";
    },
    [editor]
  );

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && editor) {
        const reader = new FileReader();
        reader.onload = () => {
          const url = reader.result as string;
          const imageId = `img-${Date.now()}`;

          // Add to resizable images
          setResizableImages((prev) => [
            ...prev,
            {
              id: imageId,
              src: url,
              width: 300,
              height: 200,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    },
    [editor]
  );

  const handleWordUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && editor) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const arrayBuffer = reader.result as ArrayBuffer;

            const result= await docx2html(arrayBuffer);

            // const result = await mammoth.convertToHtml(
            //   { arrayBuffer },
            //   {
            //     convertImage: mammoth.images.imgElement(function (image) {
            //       return image
            //         .readAsBase64String()
            //         .then(function (imageBuffer) {
            //           return {
            //             src:
            //               "data:" +
            //               image.contentType +
            //               ";base64," +
            //               imageBuffer,
            //           };
            //         });
            //     }),
            //   }
            // );

            console.log(result, 'asdklnasdjknjkasndjkasdnasjkdnsajksandasjkdnsajkandkjasnd')
            editor.chain().focus().setContent(result.value).run();
          } catch (error) {
            console.error("Error parsing Word document:", error);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    },
    [editor]
  );

  return (
    <div className="min-h-screen bg-editor-background">
      <div className="max-w-full">
        {/* Header */}
        <div className="bg-editor-toolbar border-b border-editor-toolbar-border px-4 py-2">
          <h1 className="text-lg font-semibold text-foreground">
            Document Editor
          </h1>
        </div>

        {/* Toolbar */}
        <EditorToolbar
          editor={editor}
          onImageUpload={handleImageUpload}
          onWordUpload={handleWordUpload}
          onPdfUpload={handlePdfUpload}
          onFindPlaceholders={() => findAllPlaceholders(editor)}
        />

        {/* Export Buttons */}
        <ExportButtons editor={editor} />

        {/* Document Area */}
        <div className="p-8 flex gap-6 justify-center">
          {/* Placeholder Sidebar */}
          <div className="w-64 flex-shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Placeholders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Custom Placeholder Input - Now First */}
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <Input
                      placeholder="Add custom placeholder..."
                      value={customPlaceholder}
                      onChange={(e) => setCustomPlaceholder(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      onClick={addCustomPlaceholder}
                      disabled={!customPlaceholder.trim()}
                      className="px-2"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* All Placeholders */}
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {allPlaceholders.map((placeholder, index) => {
                    const isCustom = !defaultPlaceholders.includes(placeholder);
                    return (
                      <div
                        key={`${placeholder}-${index}`}
                        className="flex gap-1"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => insertPlaceholder(editor, placeholder)}
                          className="flex-1 justify-start text-left font-mono text-xs hover:bg-yellow-50"
                        >
                          {placeholder}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePlaceholder(placeholder);
                          }}
                          className="px-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                          title="Delete placeholder"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Document Editor */}
          <div className="bg-editor-document shadow-lg rounded-lg max-w-4xl w-full min-h-[1000px] relative">
            {/* Resizable Images Overlay */}
            {resizableImages.length > 0 && (
              <div className="absolute top-4 right-4 z-10 space-y-2">
                <div className="bg-white p-2 rounded-lg shadow-lg border">
                  <h4 className="text-sm font-medium mb-2">Resizable Images</h4>
                  <p className="text-xs text-gray-500 mb-2">
                    Click and drag corners to resize
                  </p>
                </div>
              </div>
            )}

            <EditorContent editor={editor} className="p-8" />
          </div>
        </div>
      </div>
    </div>
  );
};
