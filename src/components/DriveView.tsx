import React, { useState, useEffect } from 'react';
import { DriveFile } from '../types';
import { HardDrive, ExternalLink, Download, AlertCircle, RefreshCw } from 'lucide-react';

export const DriveView = () => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = () => {
    setLoading(true);
    setError(null);
    fetch('/api/drive')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setFiles(data);
        else setError('파일 목록을 불러올 수 없습니다.');
        setLoading(false);
      })
      .catch(err => {
        console.error('Drive fetch error:', err);
        setError('구글 드라이브 연결에 실패했습니다.\nGOOGLE_SERVICE_ACCOUNT_JSON 환경 변수를 설정해주세요.');
        setLoading(false);
      });
  };

  useEffect(() => { fetchFiles(); }, []);

  const getMimeTypeLabel = (mimeType: string): string => {
    if (mimeType.includes('folder')) return '폴더';
    if (mimeType.includes('spreadsheet')) return 'Sheets';
    if (mimeType.includes('document')) return 'Docs';
    if (mimeType.includes('presentation')) return 'Slides';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('image')) return '이미지';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'ZIP';
    return '파일';
  };

  const getMimeTypeColor = (mimeType: string): string => {
    if (mimeType.includes('folder')) return '#F76707';
    if (mimeType.includes('spreadsheet')) return '#37B24D';
    if (mimeType.includes('document')) return '#2383E2';
    if (mimeType.includes('presentation')) return '#F59F00';
    if (mimeType.includes('pdf')) return '#E03E3E';
    if (mimeType.includes('image')) return '#AE3EC9';
    return '#868E96';
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
          구글 서비스 계정으로 연동된 공용 드라이브 자료실
        </div>
        <button onClick={fetchFiles} className="notion-btn-ghost" style={{ padding: '6px 10px', fontSize: 12, gap: 5 }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {loading ? (
        <div className="notion-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--muted-foreground)' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13 }}>파일 목록을 불러오는 중...</span>
        </div>
      ) : error ? (
        <div className="notion-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: '#F76707', opacity: 0.6, margin: '0 auto 16px' }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>구글 드라이브 연결 필요</div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'pre-line', lineHeight: 1.7, marginBottom: 20 }}>
            {error}
          </div>
          <div style={{ background: 'var(--secondary)', borderRadius: 8, padding: 14, textAlign: 'left', fontSize: 12, fontFamily: 'monospace', color: 'var(--muted-foreground)' }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontFamily: 'inherit', color: 'var(--foreground)' }}>설정 방법:</div>
            <div>1. Google Cloud Console에서 서비스 계정 생성</div>
            <div>2. 서비스 계정에 드라이브 폴더 접근 권한 부여</div>
            <div>3. .env 파일에 GOOGLE_SERVICE_ACCOUNT_JSON 추가</div>
            <div>4. GOOGLE_DRIVE_FOLDER_ID 추가 (선택)</div>
          </div>
        </div>
      ) : files.length === 0 ? (
        <div className="notion-card" style={{ padding: 60, textAlign: 'center', color: 'var(--muted-foreground)' }}>
          <HardDrive size={48} style={{ opacity: 0.15, margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14 }}>연결된 파일이 없습니다</div>
          <div style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>구글 드라이브 폴더에 파일을 추가하거나 GOOGLE_DRIVE_FOLDER_ID를 확인해주세요.</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
            총 {files.length}개 파일
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {files.map(file => {
              const color = getMimeTypeColor(file.mimeType);
              const label = getMimeTypeLabel(file.mimeType);
              return (
                <div
                  key={file.id}
                  className="notion-card"
                  style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {file.iconLink ? (
                        <img src={file.iconLink} alt="icon" style={{ width: 20, height: 20 }} referrerPolicy="no-referrer" />
                      ) : (
                        <HardDrive size={18} style={{ color: 'var(--muted-foreground)' }} />
                      )}
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                        background: `${color}15`, color,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ padding: 4, borderRadius: 4, color: 'var(--muted-foreground)', display: 'flex', textDecoration: 'none' }}
                        title="열기"
                      >
                        <ExternalLink size={13} />
                      </a>
                      <button
                        onClick={() => window.open(`/api/drive/download/${file.id}?name=${encodeURIComponent(file.name)}`, '_blank')}
                        style={{ padding: 4, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                        title="다운로드"
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                      {file.name}
                    </div>
                    {file.modifiedTime && (
                      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 3 }}>
                        수정: {new Date(file.modifiedTime).toLocaleDateString('ko-KR')}
                      </div>
                    )}
                    {file.size && (
                      <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                        {(parseInt(file.size) / 1024 / 1024).toFixed(1)} MB
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
