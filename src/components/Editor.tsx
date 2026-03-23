import React, { useRef, useEffect } from 'react';

interface EditorProps {
  initialContent?: any;
  onChange?: (content: string) => void;
}

// Simple but feature-rich markdown-like editor without heavy dependencies
export const HanraonEditor = ({ initialContent, onChange }: EditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getInitialText = () => {
    if (!initialContent) return '';
    if (typeof initialContent === 'string') return initialContent;
    if (Array.isArray(initialContent)) {
      // Convert BlockNote JSON to plain text
      const extractText = (blocks: any[]): string => {
        return blocks.map(block => {
          if (!block) return '';
          const type = block.type || 'paragraph';
          const content = block.content || [];
          const text = Array.isArray(content) 
            ? content.map((c: any) => c?.text || '').join('') 
            : '';
          
          switch (type) {
            case 'heading': return `${'#'.repeat(block.props?.level || 1)} ${text}`;
            case 'bulletListItem': return `• ${text}`;
            case 'numberedListItem': return `1. ${text}`;
            case 'checkListItem': return `${block.props?.checked ? '✅' : '☐'} ${text}`;
            case 'codeBlock': return `\`\`\`\n${text}\n\`\`\``;
            default: return text;
          }
        }).filter(t => t.trim() !== '').join('\n\n');
      };
      return extractText(initialContent);
    }
    return JSON.stringify(initialContent, null, 2);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = getInitialText();
    }
  }, [initialContent]);

  const handleChange = () => {
    if (onChange && textareaRef.current) {
      onChange(textareaRef.current.value);
    }
  };

  // Auto-resize
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;

    // Tab = 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      el.value = newVal;
      el.selectionStart = el.selectionEnd = start + 2;
      handleChange();
    }
  };

  return (
    <div style={{ minHeight: 400, paddingTop: 20 }}>
      {/* Toolbar hints */}
      <div style={{ 
        display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap',
        fontSize: 11, color: 'var(--muted-foreground)',
        padding: '6px 10px', background: 'var(--secondary)', borderRadius: 6
      }}>
        <span style={{ fontWeight: 600 }}>마크다운 지원:</span>
        {[
          { key: '# 제목', label: '제목' },
          { key: '**굵게**', label: '굵게' },
          { key: '*기울임*', label: '기울임' },
          { key: '`코드`', label: '코드' },
          { key: '- 목록', label: '목록' },
          { key: '> 인용', label: '인용' },
          { key: '---', label: '구분선' },
        ].map(item => (
          <span key={item.key} style={{
            background: 'var(--card)', padding: '1px 5px', borderRadius: 3,
            border: '1px solid var(--border)', fontFamily: 'monospace', cursor: 'pointer',
          }}
            onClick={() => {
              const el = textareaRef.current;
              if (!el) return;
              const start = el.selectionStart;
              const newVal = el.value.substring(0, start) + item.key + el.value.substring(el.selectionEnd);
              el.value = newVal;
              el.selectionStart = el.selectionEnd = start + item.key.length;
              el.focus();
              handleChange();
            }}
          >{item.key}</span>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        onChange={() => { handleChange(); autoResize(); }}
        onKeyDown={handleKeyDown}
        onInput={autoResize}
        placeholder="여기에 내용을 작성하세요...&#10;&#10;마크다운 문법을 사용할 수 있습니다:&#10;# 큰 제목&#10;## 중간 제목&#10;**굵게** *기울임*&#10;- 목록 항목&#10;1. 번호 목록&#10;> 인용&#10;`인라인 코드`"
        style={{
          width: '100%',
          minHeight: 400,
          resize: 'vertical',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--foreground)',
          fontSize: 15,
          lineHeight: 1.8,
          fontFamily: '"Inter", -apple-system, sans-serif',
          padding: '8px 0',
        }}
      />
    </div>
  );
};
