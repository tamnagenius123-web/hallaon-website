import React, { useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController, getDefaultReactSlashMenuItems } from '@blocknote/react';
import '@blocknote/mantine/style.css';
import type { Block } from '@blocknote/core';
import { 
  HardDrive, Type, Heading1, Heading2, Heading3, 
  List, ListOrdered, CheckSquare, Quote, 
  Image as ImageIcon, Code, Minus, Table,
  Lightbulb, AlertCircle, Info, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from 'next-themes';

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

// 슬래시 메뉴 아이콘 및 설명 매핑
const SLASH_MENU_CONFIG: Record<string, { icon: any, subtext: string }> = {
  'Text': { icon: Type, subtext: '일반 텍스트 단락' },
  'Heading 1': { icon: Heading1, subtext: '큰 제목' },
  'Heading 2': { icon: Heading2, subtext: '중간 제목' },
  'Heading 3': { icon: Heading3, subtext: '작은 제목' },
  'Bullet List': { icon: List, subtext: '글머리 목록' },
  'Numbered List': { icon: ListOrdered, subtext: '번호 목록' },
  'Check List': { icon: CheckSquare, subtext: '체크리스트' },
  'Blockquote': { icon: Quote, subtext: '인용구' },
  'Image': { icon: ImageIcon, subtext: '이미지 삽입' },
  'Code Block': { icon: Code, subtext: '코드 블록' },
  'Divider': { icon: Minus, subtext: '구분선' },
  'Table': { icon: Table, subtext: '표 삽입' },
};

export const HanraonEditor = ({ initialContent, onChange }: EditorProps) => {
  const { resolvedTheme } = useTheme();
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

  const calloutItems = [
    {
      title: '💡 팁',
      onItemClick: () => {
        editor.insertBlocks(
          [
            {
              type: 'paragraph',
              content: '💡 유용한 팁을 입력하세요.',
            },
          ],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
      aliases: ['팁', 'tip', 'lightbulb'],
      group: 'Advanced',
      icon: <Lightbulb size={18} />,
      subtext: '유용한 팁을 강조합니다.',
    },
    {
      title: '⚠️ 경고',
      onItemClick: () => {
        editor.insertBlocks(
          [
            {
              type: 'paragraph',
              content: '⚠️ 주의할 사항을 입력하세요.',
            },
          ],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
      aliases: ['경고', 'warning', 'alert'],
      group: 'Advanced',
      icon: <AlertCircle size={18} />,
      subtext: '주의사항을 강조합니다.',
    },
    {
      title: 'ℹ️ 정보',
      onItemClick: () => {
        editor.insertBlocks(
          [
            {
              type: 'paragraph',
              content: 'ℹ️ 중요한 정보를 입력하세요.',
            },
          ],
          editor.getTextCursorPosition().block,
          'after'
        );
      },
      aliases: ['정보', 'info', 'information'],
      group: 'Advanced',
      icon: <Info size={18} />,
      subtext: '중요한 정보를 강조합니다.',
    },
  ];

  return (
    <div className="min-h-[500px] w-full max-w-4xl mx-auto">
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
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
              ...calloutItems,
            ];
            
            const queryLower = query.toLowerCase();
            return customMenuItems.filter(
              (item) =>
                (item.title && item.title.toLowerCase().includes(queryLower)) ||
                (item.aliases && item.aliases.some((alias) => alias.toLowerCase().includes(queryLower)))
            );
          }}
          renderItem={({ item, isSelected, onClick }) => {
            const config = SLASH_MENU_CONFIG[item.title] || { icon: Zap, subtext: item.subtext || '' };
            
            return (
              <div
                onClick={onClick}
                className={cn(
                  "bn-slash-menu-item",
                  isSelected && "bg-accent"
                )}
              >
                <div className="bn-slash-menu-item-icon">
                  {item.icon || <config.icon size={18} />}
                </div>
                <div className="bn-slash-menu-item-text">
                  <span className="bn-slash-menu-item-title">{item.title}</span>
                  <span className="bn-slash-menu-item-subtext">{config.subtext || item.subtext || ''}</span>
                </div>
              </div>
            );
          }}
        />
      </BlockNoteView>
    </div>
  );
};
