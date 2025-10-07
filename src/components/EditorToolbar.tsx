import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image,
  Table,
  Plus,
  Minus,
  Palette,
  FileText,
  Scissors,
  FileUp,
} from 'lucide-react';
import { useRef } from 'react';

interface EditorToolbarProps {
  editor: Editor;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onWordUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPdfUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EditorToolbar = ({ editor, onImageUpload, onWordUpload, onPdfUpload }: EditorToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleFontSizeChange = (size: string) => {
    editor.chain().focus().setFontSize(`${size}px`).run();
  };

  const handleFontFamilyChange = (family: string) => {
    editor.chain().focus().setFontFamily(family).run();
  };

  const handleColorChange = (color: string) => {
    editor.chain().focus().setColor(color).run();
  };

  return (
    <div className="bg-editor-ribbon border-b border-editor-toolbar-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Font Family */}
        <Select onValueChange={handleFontFamilyChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Font Family" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            <SelectItem value="Helvetica">Helvetica</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
            <SelectItem value="Courier New">Courier New</SelectItem>
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select onValueChange={handleFontSizeChange}>
          <SelectTrigger className="w-20">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="8">8</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="12">12</SelectItem>
            <SelectItem value="14">14</SelectItem>
            <SelectItem value="16">16</SelectItem>
            <SelectItem value="18">18</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="24">24</SelectItem>
            <SelectItem value="28">28</SelectItem>
            <SelectItem value="32">32</SelectItem>
            <SelectItem value="36">36</SelectItem>
            <SelectItem value="48">48</SelectItem>
            <SelectItem value="72">72</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        {/* Text Formatting */}
        <Toggle
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>

        <Toggle
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>

        <Toggle
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
        >
          <Underline className="h-4 w-4" />
        </Toggle>

        <Toggle
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        {/* Text Color */}
        <div className="flex items-center gap-1">
          <Palette className="h-4 w-4" />
          <Input
            type="color"
            className="w-8 h-8 p-0 border-0"
            onChange={(e) => handleColorChange(e.target.value)}
            title="Text Color"
          />
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Alignment */}
        <Toggle
          pressed={editor.isActive({ textAlign: 'left' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
          aria-label="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Toggle>

        <Toggle
          pressed={editor.isActive({ textAlign: 'center' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
          aria-label="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Toggle>

        <Toggle
          pressed={editor.isActive({ textAlign: 'right' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
          aria-label="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Toggle>

        <Toggle
          pressed={editor.isActive({ textAlign: 'justify' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()}
          aria-label="Justify"
        >
          <AlignJustify className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        {/* Lists */}
        <Toggle
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </Toggle>

        <Toggle
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        {/* Media & Tables */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1"
        >
          <Image className="h-4 w-4" />
          Image
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => wordInputRef.current?.click()}
          className="flex items-center gap-1"
        >
          <FileText className="h-4 w-4" />
          Word
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => pdfInputRef.current?.click()}
          className="flex items-center gap-1"
        >
          <FileUp className="h-4 w-4" />
          PDF
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={addTable}
          className="flex items-center gap-1"
        >
          <Table className="h-4 w-4" />
          Table
        </Button>

        {/* Page Break */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().insertContent({ type: 'pageBreak' }).run()}
          className="flex items-center gap-1"
          title="Insert Page Break"
        >
          <Scissors className="h-4 w-4" />
          Break
        </Button>

        {/* Table Controls (shown when table is selected) */}
        {editor.isActive('table') && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              title="Add Row Above"
            >
              <Plus className="h-3 w-3" />
              Row
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              title="Add Column Left"
            >
              <Plus className="h-3 w-3" />
              Col
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="Delete Row"
            >
              <Minus className="h-3 w-3" />
              Row
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="Delete Column"
            >
              <Minus className="h-3 w-3" />
              Col
            </Button>
          </>
        )}

        {/* Hidden file inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={onImageUpload}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={wordInputRef}
          onChange={onWordUpload}
          accept=".docx,.doc"
          className="hidden"
        />
        <input
          type="file"
          ref={pdfInputRef}
          onChange={onPdfUpload}
          accept=".pdf"
          className="hidden"
        />
      </div>
    </div>
  );
};