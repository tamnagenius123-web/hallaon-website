import React, { useMemo } from 'react';
import { BlockNoteView } from '@blocknote/react';
import { BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { getDefaultReactSlashMenuItems } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/react/style.css';
import { HardDrive } from 'lucide-react'; // 👈 드라이브 아이콘 추가

interface EditorProps {
  initialContent?: any;
  onChange?: (content: any) => void;
}

export const HanraonEditor = ({ initialContent, onChange }: EditorProps) => {
  // 에디터 생성
  const editor = useMemo(() => {
    // 1. 초기 콘텐츠 파싱 (안전하게)
    let parsedContent: PartialBlock[] | undefined = undefined;
    
    if (initialContent) {
      if (typeof initialContent === 'string') {
        try {
          parsedContent = JSON.parse(initialContent);
        } catch (e) {
          // JSON 파싱 실패 시 일반 텍스트 블록으로 변환
          parsedContent = [
            {
              type: "paragraph",
              content: initialContent,
            },
          ];
        }
      } else if (Array.isArray(initialContent) && initialContent.length > 0) {
        parsedContent = initialContent;
      }
    }

    return BlockNoteEditor.create({
      initialContent: parsedContent,
    });
  }, [initialContent]);

  // 👇 2. 구글 드라이브 슬래시(/) 커맨드 메뉴 생성 👇
  const insertDriveFileItem = {
    name: '구글 드라이브 파일',
    execute: (editor: BlockNoteEditor) => {
      // 메뉴 클릭 시 파일 링크를 물어보는 팝업(prompt) 띄우기
      const fileUrl = window.prompt('구글 드라이브 파일 공유 링크를 입력하세요:');
      const fileName = window.prompt('파일 이름을 입력하세요 (예: 회의록.pdf):', '드라이브 파일');

      if (fileUrl) {
        // 현재 커서 위치에 파일 링크 블록(북마크 형태) 삽입
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
          'after' // 커서 아래에 삽입
        );
      }
    },
    aliases: ['drive', '구글', '드라이브', '파일'],
    group: '첨부파일',
    // 커스텀 메뉴 아이콘 (React 노드)
    icon: <HardDrive size={18} color="#2383E2" />,
    hint: '구글 드라이브 링크를 삽입합니다.',
  };

  // 기존 기본 메뉴에 우리가 만든 커스텀 메뉴 추가
  const customSlashMenuItems = [
    ...getDefaultReactSlashMenuItems(editor),
    insertDriveFileItem,
  ];

  return (
    <div style={{ paddingTop: 20, minHeight: 400 }}>
      {/* 진짜 노션 스타일의 BlockNote 에디터 렌더링 */}
      <BlockNoteView
        editor={editor}
        onChange={() => {
          if (onChange) {
            onChange(JSON.stringify(editor.document));
          }
        }}
        theme="dark" // 화면 테마에 맞게 'dark' 또는 'light'로 변경 가능
        slashMenu={false} // 기본 메뉴를 끄고 아래에서 커스텀 메뉴를 주입
      >
        <div className="bn-slash-menu">
          {/* 커스텀 슬래시 메뉴 연결 */}
          <editor.SlashMenu
            getItems={(query) => {
              const queryLower = query.toLowerCase();
              return customSlashMenuItems.filter(
                (item) =>
                  item.name.toLowerCase().includes(queryLower) ||
                  item.aliases?.some((alias) => alias.toLowerCase().includes(queryLower))
              );
            }}
          />
        </div>
      </BlockNoteView>
    </div>
  );
};
