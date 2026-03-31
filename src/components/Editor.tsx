import React, { useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController, getDefaultReactSlashMenuItems } from '@blocknote/react';
import '@blocknote/mantine/style.css';
import type { Block } from '@blocknote/core';
import { 
  HardDrive, Type, Heading1, Heading2, Heading3, 
  List, ListOrdered, CheckSquare, Quote, 
  Image as ImageIcon, Code, Minus, Table
} from 'lucide-react';
import { cn } from '../lib/utils';

interface EditorProps {
  initialContent?: any;
  onChange?: (content: string) => void;
}

// 초기 데이터 안전하게 파싱
function parseContentToBlocks(raw: any): Block[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw) && raw.length > 0 && raw[0]?.type) return raw as Block[];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed[0]?.type) return parsed as Block[];
      } catch {}
    }
    return trimmed.split('\n').filter(Boolean).map(line => ({
      type: 'paragraph',
      content: line,
    })) as any;
  }
  return undefined;
}

// 슬래시 메뉴 아이콘 매핑
const getIcon = (title: string) => {
  switch (title) {
    case 'Text': return <Type size={18} />;
    case 'Heading 1': return <Heading1 size={18} />;
    case 'Heading 2': return <Heading2 size={18} />;
    case 'Heading 3': return <Heading3 size={18} />;
    case 'Bullet List': return <List size={18} />;
    case 'Numbered List': return <ListOrdered size={18} />;
    case 'Check List': return <CheckSquare size={18} />;
    case 'Blockquote': return <Quote size={18} />;
    case 'Image': return <ImageIcon size={18} />;
    case 'Code Block': return <Code size={18} />;
    case 'Divider': return <Minus size={18} />;
    case 'Table': return <Table size={18} />;
    default: return <Type size={18} />;
  }
};

export const HanraonEditor = ({ initialContent, onChange }: EditorProps) => {
  const parsedContent = useMemo(() => parseContentToBlocks(initialContent), [initialContent]);

  const editor = useCreateBlockNote({
    initialContent: parsedContent,
  });

  const insertDriveFileItem = {
    title: '구글 드라이브 파일',
    onItemClick: () => {
      const fileUrl = window.prompt('구글 드라이브 파일 공유 링크를 입력하세요:');
      const fileName = window.prompt('파일 이름을 입력하세요 (예: 회의록.pdf):', '드라이브 파일');

      if (fileUrl) {
        editor.insertBlocks(
          [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'link',
                  href: fileUrl,
                  content: `📁 ${fileName || '구글 드라이브 파일'} (클릭하여 열기)`,
                },
              ],
            },
          ],
          editor.getTextCursorPosition().block,
          'after'
        );
      }
    },
    aliases: ['drive', '구글', '드라이브', '파일'],
    group: 'Media',
    icon: <HardDrive size={18} />,
    subtext: '구글 드라이브 링크를 삽입합니다.',
  };

  return (
    <div className="min-h-[500px] w-full max-w-4xl mx-auto">
      <BlockNoteView
        editor={editor}
        theme="light"
        onChange={() => {
          if (onChange) {
            onChange(JSON.stringify(editor.document));
          }
        }}
        slashMenu={false}
        className="bn-editor"
      >
        <SuggestionMenuController
          triggerCharacter={"/"}
          getItems={async (query) => {
            const defaultItems = getDefaultReactSlashMenuItems(editor);
            const customMenuItems = [
              ...defaultItems,
              insertDriveFileItem,
            ];
            
            const queryLower = query.toLowerCase();
            return customMenuItems.filter(
              (item) =>
                (item.title && item.title.toLowerCase().includes(queryLower)) ||
                (item.aliases && item.aliases.some((alias) => alias.toLowerCase().includes(queryLower)))
            );
          }}
          renderItem={({ item, isSelected, onClick }) => (
            <div
              onClick={onClick}
              className={cn(
                "bn-slash-menu-item",
                isSelected && "bg-accent"
              )}
            >
              <div className="bn-slash-menu-item-icon">
                {item.icon || getIcon(item.title)}
              </div>
              <div className="bn-slash-menu-item-text">
                <span className="bn-slash-menu-item-title">{item.title}</span>
                {item.subtext && (
                  <span className="bn-slash-menu-item-subtext">{item.subtext}</span>
                )}
              </div>
            </div>
          )}
        />
      </BlockNoteView>
    </div>
  );
};
