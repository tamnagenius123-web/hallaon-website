import React, { useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController, getDefaultReactSlashMenuItems } from '@blocknote/react';
import '@blocknote/mantine/style.css';
import type { Block } from '@blocknote/core';
import { HardDrive } from 'lucide-react';

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

export const HanraonEditor = ({ initialContent, onChange }: EditorProps) => {
  const parsedContent = useMemo(() => parseContentToBlocks(initialContent), [initialContent]);

  const editor = useCreateBlockNote({
    initialContent: parsedContent,
  });

  // 👇 최신 BlockNote 문법에 맞게 속성 이름 변경 (title, onItemClick, subtext) 👇
  const insertDriveFileItem = {
    title: '구글 드라이브 파일', // 👈 name 대신 title
    onItemClick: () => {         // 👈 execute 대신 onItemClick
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
    group: '첨부파일',
    icon: <HardDrive size={18} color="#2383E2" />,
    subtext: '구글 드라이브 링크를 삽입합니다.', // 👈 hint 대신 subtext
  };

  return (
    <div style={{ paddingTop: 10, minHeight: 400 }}>
      <BlockNoteView
        editor={editor}
        theme="system"
        onChange={() => {
          if (onChange) {
            onChange(JSON.stringify(editor.document));
          }
        }}
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter={"/"}
          getItems={async (query) => {
            const customMenuItems = [
              ...getDefaultReactSlashMenuItems(editor),
              insertDriveFileItem,
            ];
            const queryLower = query.toLowerCase();
            return customMenuItems.filter(
              (item) =>
                // 👇 필터링할 때도 name 대신 title을 검색하도록 수정! 👇
                (item.title && item.title.toLowerCase().includes(queryLower)) ||
                (item.aliases && item.aliases.some((alias) => alias.toLowerCase().includes(queryLower)))
            );
          }}
        />
      </BlockNoteView>
    </div>
  );
};
