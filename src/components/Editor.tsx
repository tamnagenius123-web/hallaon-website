import React, { useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react'; // 👈 에러 안 나는 최신 훅으로 교체!
import { BlockNoteView } from '@blocknote/mantine'; // 👈 사용자님 프로젝트에 맞는 mantine 디자인 적용!
import { getDefaultReactSlashMenuItems } from '@blocknote/react';
import '@blocknote/mantine/style.css';
import type { Block } from '@blocknote/core';
import { HardDrive } from 'lucide-react';

interface EditorProps {
  initialContent?: any;
  onChange?: (content: string) => void;
}

// 초기 데이터 안전하게 파싱 (에러 방지용)
function parseContentToBlocks(raw: any): Block[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    if (raw.length > 0 && raw[0]?.type) return raw as Block[];
    return undefined;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed[0]?.type) return parsed as Block[];
      } catch {}
    }
  }
  return undefined;
}

export const HanraonEditor = ({ initialContent, onChange }: EditorProps) => {
  // 1. 데이터 파싱
  const parsedContent = useMemo(() => parseContentToBlocks(initialContent), [initialContent]);

  // 2. 최신 버전에 맞는 안전한 에디터 생성 훅 사용!
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

  // 4. 기존 메뉴에 커스텀 메뉴 추가
  const customSlashMenuItems = [
    ...getDefaultReactSlashMenuItems(editor),
    insertDriveFileItem,
  ];

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
        slashMenu={false} // 기본 슬래시 메뉴 비활성화
      >
        {/* 우리가 만든 구글 드라이브 슬래시 메뉴 주입! */}
        <editor.SlashMenu
          getItems={(query) => {
            const queryLower = query.toLowerCase();
            return customSlashMenuItems.filter(
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
