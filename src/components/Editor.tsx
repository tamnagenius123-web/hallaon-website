import React, { useEffect, useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController, getDefaultReactSlashMenuItems } from '@blocknote/react';
import '@blocknote/mantine/style.css';
import type { PartialBlock } from '@blocknote/core';
import { 
  HardDrive, Type, Heading1, Heading2, Heading3, 
  List, ListOrdered, CheckSquare, Quote, 
  Image as ImageIcon, Code, Minus, Table,
  Lightbulb, AlertCircle, Info, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useDebouncedCallback } from '../lib/useDebounce';
import { useTheme } from 'next-themes';

interface EditorProps {
  initialContent?: any;
  onChange?: (content: string) => void;
}

// 초기 데이터 안전하게 파싱
// PartialBlock 정합 shape 반환 (BlockNote PartialBlockFromConfigNoChildren).
// fallback string lines 도 styled-text inline content 로 정규화하여 paragraph 블록 일관성 유지.
function parseContentToBlocks(raw: any): PartialBlock[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw) && raw.length > 0 && raw[0]?.type) return raw as PartialBlock[];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed[0]?.type) return parsed as PartialBlock[];
      } catch {}
    }
    return trimmed.split('\n').filter(Boolean).map(line => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line, styles: {} }],
    })) as PartialBlock[];
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

  // keystroke 마다 JSON.stringify + 부모 setState / supabase UPDATE 폭주 차단 (300ms idle 후 1회).
  // 미저장 손실 위험은 cycle 4 의 onBlur flush 별도 사이클에서 다룬다.
  const debouncedOnChange = useDebouncedCallback((content: string) => {
    if (onChange) onChange(content);
  }, 300);

  const editor = useCreateBlockNote({
    initialContent: parsedContent,
  });

  // useCreateBlockNote 는 initialContent 변화를 추적하지 않는다. side-peek 전환 (selectedTask 변경 등)
  // 시 editor 의 document 를 새 blocks 로 교체. DocsView 는 key remount 도 병행하나 AgendasView /
  // TasksView 는 그렇지 않아 본 hook 이 stale editor 보호의 주 경로.
  useEffect(() => {
    if (!parsedContent) return;
    editor.replaceBlocks(editor.document, parsedContent);
  }, [parsedContent, editor]);

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
          debouncedOnChange(JSON.stringify(editor.document));
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
        />
      </BlockNoteView>
    </div>
  );
};
