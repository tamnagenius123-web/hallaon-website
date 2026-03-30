import React, { useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
// 👇 에러의 원인이었던 SlashMenu 대신, 최신 문법인 SuggestionMenuController를 가져옵니다.
import { SuggestionMenuController, getDefaultReactSlashMenuItems } from '@blocknote/react';
import '@blocknote/mantine/style.css';
import type { Block } from '@blocknote/core';
import { HardDrive } from 'lucide-react';

interface EditorProps {
  initialContent?: any;
  onChange?: (content: string) => void;
}

// 초기 데이터 안전하게 파싱 (옛날 텍스트 문서도 에러 없이 열리도록 복구!)
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
    // 예전 싸구려 에디터로 썼던 텍스트 호환성 복구
    return trimmed.split('\n').filter(Boolean).map(line => ({
      type: 'paragraph',
      content: line,
    })) as any;
  }
  return undefined;
}

export const HanraonEditor = ({ initialContent, onChange }: EditorProps) => {
  // 1. 데이터 파싱
  const parsedContent = useMemo(() => parseContentToBlocks(initialContent), [initialContent]);

  // 2. 에디터 생성
  const editor = useCreateBlockNote({
    initialContent: parsedContent,
  });

  // 3. 구글 드라이브 커스텀 메뉴 아이템
  const insertDriveFileItem = {
    name: '구글 드라이브 파일',
    execute: (ed: any) => {
      const fileUrl = window.prompt('구글 드라이브 파일 공유 링크를 입력하세요:');
      const fileName = window.prompt('파일 이름을 입력하세요 (예: 회의록.pdf):', '드라이브 파일');

      if (fileUrl) {
        ed.insertBlocks(
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
          ed.getTextCursorPosition().block,
          'after'
        );
      }
    },
    aliases: ['drive', '구글', '드라이브', '파일'],
    group: '첨부파일',
    icon: <HardDrive size={18} color="#2383E2" />,
    hint: '구글 드라이브 링크를 삽입합니다.',
  };

  return (
    <div style={{ paddingTop: 10, minHeight: 400 }}>
      {/* 화면 렌더링 */}
      <BlockNoteView
        editor={editor}
        theme="light" // 'dark' 또는 'light'
        onChange={() => {
          if (onChange) {
            onChange(JSON.stringify(editor.document));
          }
        }}
        slashMenu={false} // 기본 슬래시 메뉴 끄기
      >
        {/* 👇 하얀 화면 원인 완벽 해결: 최신 SuggestionMenuController 적용 👇 */}
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
                item.name.toLowerCase().includes(queryLower) ||
                (item.aliases && item.aliases.some((alias) => alias.toLowerCase().includes(queryLower)))
            );
          }}
        />
      </BlockNoteView>
    </div>
  );
};
