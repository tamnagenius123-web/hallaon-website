/**
 * DriveView - Google Drive 연동 파일 탐색기 (업로드 기능 추가)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder, FolderOpen, FileText, Image, Film, Music, Archive, Code,
  Download, ExternalLink, RefreshCw, ChevronRight, ChevronDown,
  Search, Grid, List, File, ArrowLeft, HardDrive, Loader2, Home, Upload // 👈 Upload 아이콘 추가
} from 'lucide-react';

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
  modifiedTime?: string;
}

interface BreadcrumbEntry {
  id: string;   // 'root' | actual folderId
  name: string;
}

// 파일 아이콘
function getFileIcon(mimeType: string, size = 16) {
  if (mimeType.includes('folder'))       return <Folder size={size} color="#F76707" />;
  if (mimeType.includes('image'))        return <Image  size={size} color="#AE3EC9" />;
  if (mimeType.includes('video'))        return <Film   size={size} color="#E03E3E" />;
  if (mimeType.includes('audio'))        return <Music  size={size} color="#2383E2" />;
  if (mimeType.includes('pdf'))          return <FileText size={size} color="#E03E3E" />;
  if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive size={size} color="#868E96" />;
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileText size={size} color="#37B24D" />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <FileText size={size} color="#F76707" />;
  if (mimeType.includes('document') || mimeType.includes('word')) return <FileText size={size} color="#2383E2" />;
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html')) return <Code size={size} color="#37B24D" />;
  return <File size={size} color="#868E96" />;
}

function formatSize(size?: string): string {
  if (!size) return '';
  const b = parseInt(size);
  if (b < 1024)           return `${b} B`;
  if (b < 1024 * 1024)    return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3)      return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(1)} GB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ───────────── 좌측 트리 노드 ─────────────
interface TreeNodeData {
  id: string;
  name: string;
  mimeType: string;
  children?: TreeNodeData[];
  loaded?: boolean;
}

interface TreeNodeProps {
  node: TreeNodeData;
  depth: number;
  activeFolderId: string;
  onFolderClick: (id: string, name: string) => void;
  onLoadChildren: (id: string) => Promise<DriveItem[]>;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, activeFolderId, onFolderClick, onLoadChildren }) => {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<TreeNodeData[]>(node.children || []);
  const [loading, setLoading] = useState(false);

  const isFolder = node.mimeType.includes('folder');
  const isActive = activeFolderId === node.id;

  const handleClick = async () => {
    if (!isFolder) return;
    onFolderClick(node.id, node.name);

    if (!expanded) {
      if (children.length === 0) {
        setLoading(true);
        try {
          const items = await onLoadChildren(node.id);
          setChildren(items.map(i => ({ id: i.id, name: i.name, mimeType: i.mimeType })));
        } finally {
          setLoading(false);
        }
      }
      setExpanded(true);
    } else {
      setExpanded(false);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: `5px 8px 5px ${8 + depth * 14}px`,
          borderRadius: 5, cursor: isFolder ? 'pointer' : 'default',
          background: isActive ? 'var(--secondary)' : 'transparent',
          userSelect: 'none',
          borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--secondary)'; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        {isFolder ? (
          loading
            ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite', color: 'var(--muted-foreground)' }} />
            : expanded
              ? <ChevronDown size={11} color="var(--muted-foreground)" />
              : <ChevronRight size={11} color="var(--muted-foreground)" />
        ) : (
          <span style={{ width: 11, display: 'inline-block' }} />
        )}

        {isFolder
          ? (expanded ? <FolderOpen size={13} color="#F76707" /> : <Folder size={13} color="#F76707" />)
          : getFileIcon(node.mimeType, 13)
        }
        <span style={{
          fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontWeight: isActive ? 600 : 400,
          color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
        }}>
          {node.name}
        </span>
      </div>

      {expanded && children.map(child => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          activeFolderId={activeFolderId}
          onFolderClick={onFolderClick}
          onLoadChildren={onLoadChildren}
        />
      ))}
    </div>
  );
};

// ───────────── 메인 DriveView ─────────────
export const DriveView = () => {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [treeRoots, setTreeRoots] = useState<TreeNodeData[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ id: 'root', name: 'Drive' }]);
  const [loading, setLoading] = useState(true);
  
  // 👇 업로드 로딩 상태 및 파일 입력창 참조 추가
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<DriveItem | null>(null);

  const activeFolderId = breadcrumbs[breadcrumbs.length - 1].id;

  const fetchItems = useCallback(async (folderId: string): Promise<DriveItem[]> => {
    const url = folderId === 'root'
      ? '/api/drive'
      : `/api/drive?folderId=${encodeURIComponent(folderId)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, []);

  const loadRoot = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSearch('');
    try {
      const data = await fetchItems('root');
      setItems(data);
      setTreeRoots(data
        .filter(d => d.mimeType.includes('folder'))
        .map(d => ({ id: d.id, name: d.name, mimeType: d.mimeType }))
      );
      setBreadcrumbs([{ id: 'root', name: 'Drive' }]);
      setSelectedId(null);
      setPreview(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fetchItems]);

  useEffect(() => { loadRoot(); }, [loadRoot]);

  const navigateInto = useCallback(async (folderId: string, folderName: string) => {
    setLoading(true);
    setError(null);
    setSearch('');
    setSelectedId(null);
    setPreview(null);
    try {
      const data = await fetchItems(folderId);
      setItems(data);
      setBreadcrumbs(prev => {
        const idx = prev.findIndex(b => b.id === folderId);
        if (idx !== -1) return prev.slice(0, idx + 1);
        return [...prev, { id: folderId, name: folderName }];
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fetchItems]);

  const navigateToCrumb = useCallback(async (crumb: BreadcrumbEntry) => {
    if (crumb.id === activeFolderId) return;
    setLoading(true);
    setError(null);
    setSearch('');
    setSelectedId(null);
    setPreview(null);
    try {
      const data = await fetchItems(crumb.id);
      setItems(data);
      setBreadcrumbs(prev => {
        const idx = prev.findIndex(b => b.id === crumb.id);
        return idx !== -1 ? prev.slice(0, idx + 1) : [crumb];
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeFolderId, fetchItems]);

  const loadChildrenForTree = useCallback(async (folderId: string): Promise<DriveItem[]> => {
    return await fetchItems(folderId);
  }, [fetchItems]);

  const handleDownload = (fileId: string, fileName: string) => {
    // Use window.open for 302 redirect compatibility (large files)
    window.open(
      `/api/drive/download/${fileId}?name=${encodeURIComponent(fileName)}`,
      '_blank'
    );
  };

  // 👇 파일 업로드 실행 함수 추가
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vercel Payload 제한 경고 (약 4MB 이상일 경우)
    if (file.size > 4 * 1024 * 1024) {
      alert("파일 크기가 너무 큽니다. (최대 4MB 지원)");
      return;
    }

    setUploading(true);
    try {
      // 파일을 Base64로 변환하여 전송
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        const response = await fetch('/api/drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            base64: base64String,
            folderId: activeFolderId
          }),
        });

        if (!response.ok) throw new Error("업로드 실패");
        
        // 업로드 성공 후 파일 목록 새로고침
        const data = await fetchItems(activeFolderId);
        setItems(data);
      };
    } catch (err: any) {
      alert("업로드 중 오류가 발생했습니다: " + err.message);
    } finally {
      setUploading(false);
      // 입력창 초기화 (같은 파일 다시 올릴 수 있도록)
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const displayed = search
    ? items.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const folders = displayed.filter(f => f.mimeType.includes('folder'));
  const files   = displayed.filter(f => !f.mimeType.includes('folder'));

  if (loading && breadcrumbs.length === 1 && items.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, gap: 12, color: 'var(--muted-foreground)' }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 14 }}>Google Drive 연결 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <HardDrive size={40} style={{ opacity: 0.15, margin: '0 auto 16px', display: 'block' }} />
        <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 12 }}>{error}</p>
        <button onClick={loadRoot} className="notion-btn-primary"><RefreshCw size={13} /> 다시 시도</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: 0, height: 'calc(100vh - 200px)', minHeight: 500 }}>

      {/* ── 좌측 트리 사이드바 ── */}
      <div style={{ width: 210, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', paddingBottom: 16 }}>
        <div style={{ padding: '12px 8px 6px', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          파일 트리
        </div>

        <div
          onClick={() => navigateToCrumb({ id: 'root', name: 'Drive' })}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 8px', borderRadius: 5, cursor: 'pointer',
            background: activeFolderId === 'root' ? 'var(--secondary)' : 'transparent',
            fontSize: 13, fontWeight: 600,
            borderLeft: activeFolderId === 'root' ? '2px solid var(--primary)' : '2px solid transparent',
          }}
          onMouseEnter={e => { if (activeFolderId !== 'root') (e.currentTarget as HTMLElement).style.background = 'var(--secondary)'; }}
          onMouseLeave={e => { if (activeFolderId !== 'root') (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <HardDrive size={13} color="var(--primary)" />
          <span style={{ color: 'var(--foreground)' }}>Drive 루트</span>
        </div>

        {treeRoots.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            activeFolderId={activeFolderId}
            onFolderClick={navigateInto}
            onLoadChildren={loadChildrenForTree}
          />
        ))}
      </div>

      {/* ── 메인 콘텐츠 영역 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingLeft: 20 }}>

        {/* 툴바 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexShrink: 0, flexWrap: 'wrap' }}>

          {/* 브레드크럼 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, flexWrap: 'wrap' }}>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={`${crumb.id}-${i}`}>
                <button
                  onClick={() => navigateToCrumb(crumb)}
                  style={{
                    fontSize: 13,
                    fontWeight: i === breadcrumbs.length - 1 ? 700 : 400,
                    color: i === breadcrumbs.length - 1 ? 'var(--foreground)' : 'var(--muted-foreground)',
                    background: 'none', border: 'none', cursor: i === breadcrumbs.length - 1 ? 'default' : 'pointer',
                    padding: '2px 4px', borderRadius: 4,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {i === 0 && <Home size={11} />}
                  {crumb.name}
                </button>
                {i < breadcrumbs.length - 1 && <ChevronRight size={11} color="var(--muted-foreground)" />}
              </React.Fragment>
            ))}
          </div>

          {/* 검색 */}
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="파일 검색..."
              className="notion-input"
              style={{ paddingLeft: 28, width: 150, fontSize: 12 }}
            />
          </div>

          {/* 뷰 모드 */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--secondary)', borderRadius: 6, padding: 2 }}>
            {(['grid', 'list'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{
                padding: '4px 9px', borderRadius: 4, border: 'none', cursor: 'pointer',
                background: viewMode === m ? 'var(--card)' : 'transparent',
                color: viewMode === m ? 'var(--foreground)' : 'var(--muted-foreground)',
                display: 'flex', alignItems: 'center',
              }}>
                {m === 'grid' ? <Grid size={13} /> : <List size={13} />}
              </button>
            ))}
          </div>

          {/* 새로고침 */}
          <button
            onClick={() => navigateToCrumb(breadcrumbs[breadcrumbs.length - 1])}
            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>

          {/* 👇 파일 업로드 버튼 (숨겨진 input 포함) */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ 
              padding: '6px 12px', borderRadius: 6, border: 'none', 
              background: 'var(--primary)', color: '#fff', cursor: uploading ? 'not-allowed' : 'pointer', 
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              opacity: uploading ? 0.7 : 1
            }}
          >
            {uploading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />}
            {uploading ? '업로드 중...' : '파일 업로드'}
          </button>

        </div>

        {/* 파일 통계 */}
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 12, flexShrink: 0 }}>
          {loading
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> 불러오는 중...</span>
            : <>
                {folders.length > 0 && <span>📁 폴더 {folders.length}개</span>}
                {folders.length > 0 && files.length > 0 && <span style={{ margin: '0 8px' }}>·</span>}
                {files.length > 0 && <span>📄 파일 {files.length}개</span>}
                {displayed.length === 0 && '이 폴더는 비어 있습니다.'}
              </>
          }
        </div>

        {/* 파일 목록 */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {!loading && viewMode === 'grid' && (
            <>
              {/* 폴더 섹션 */}
              {folders.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>폴더</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10 }}>
                    {folders.map(f => (
                      <div
                        key={f.id}
                        onClick={() => { setSelectedId(f.id); }}
                        onDoubleClick={() => navigateInto(f.id, f.name)}
                        style={{
                          padding: '14px 12px', borderRadius: 10, cursor: 'pointer',
                          border: `1px solid ${selectedId === f.id ? 'var(--primary)' : 'var(--border)'}`,
                          background: selectedId === f.id ? 'rgba(35,131,226,0.06)' : 'var(--card)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        <FolderOpen size={38} color="#F76707" />
                        <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, wordBreak: 'break-word', width: '100%' }}>{f.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{formatDate(f.modifiedTime)}</div>
                        <button
                          onClick={e => { e.stopPropagation(); navigateInto(f.id, f.name); }}
                          className="notion-btn-secondary"
                          style={{ fontSize: 10, padding: '3px 8px', width: '100%' }}
                        >열기</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 파일 섹션 */}
              {files.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>파일</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10 }}>
                    {files.map(f => (
                      <div
                        key={f.id}
                        onClick={() => { setSelectedId(f.id); setPreview(f); }}
                        style={{
                          padding: '14px 12px', borderRadius: 10, cursor: 'pointer',
                          border: `1px solid ${selectedId === f.id ? 'var(--primary)' : 'var(--border)'}`,
                          background: selectedId === f.id ? 'rgba(35,131,226,0.06)' : 'var(--card)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        {getFileIcon(f.mimeType, 36)}
                        <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, wordBreak: 'break-word', width: '100%' }}>{f.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>
                          {[formatSize(f.size), formatDate(f.modifiedTime)].filter(Boolean).join(' · ')}
                        </div>
                        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                          {f.webViewLink && (
                            <a href={f.webViewLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                              style={{ flex: 1, fontSize: 10, padding: '4px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--secondary)', color: 'var(--foreground)', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                              <ExternalLink size={9} /> 보기
                            </a>
                          )}
                          <button onClick={e => { e.stopPropagation(); handleDownload(f.id, f.name); }}
                            style={{ flex: 1, fontSize: 10, padding: '4px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--secondary)', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                            <Download size={9} /> 다운
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && viewMode === 'list' && (
            <div className="notion-card" style={{ overflow: 'hidden' }}>
              <table className="notion-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th style={{ width: 80 }}>크기</th>
                    <th style={{ width: 120 }}>수정일</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--muted-foreground)', fontSize: 13 }}>비어 있습니다</td></tr>
                  )}
                  {displayed.map(f => (
                    <tr
                      key={f.id}
                      style={{ cursor: 'pointer', background: selectedId === f.id ? 'rgba(35,131,226,0.04)' : undefined }}
                      onClick={() => { setSelectedId(f.id); if (!f.mimeType.includes('folder')) setPreview(f); }}
                      onDoubleClick={() => f.mimeType.includes('folder') && navigateInto(f.id, f.name)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {getFileIcon(f.mimeType, 14)}
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{formatSize(f.size) || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{formatDate(f.modifiedTime)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {f.mimeType.includes('folder') ? (
                            <button onClick={e => { e.stopPropagation(); navigateInto(f.id, f.name); }} className="notion-btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }}>열기</button>
                          ) : (
                            <>
                              {f.webViewLink && (
                                <a href={f.webViewLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                  style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}>
                                  <ExternalLink size={13} />
                                </a>
                              )}
                              <button onClick={e => { e.stopPropagation(); handleDownload(f.id, f.name); }}
                                style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}>
                                <Download size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── 우측 파일 미리보기 패널 ── */}
      {preview && (
        <div style={{ width: 230, borderLeft: '1px solid var(--border)', padding: 16, flexShrink: 0, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)' }}>파일 정보</span>
            <button onClick={() => { setPreview(null); setSelectedId(null); }}
              style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={13} />
            </button>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>{getFileIcon(preview.mimeType, 48)}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, wordBreak: 'break-all', lineHeight: 1.4 }}>{preview.name}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 16 }}>
            {preview.size && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>크기</span><span style={{ color: 'var(--foreground)' }}>{formatSize(preview.size)}</span>
              </div>
            )}
            {preview.modifiedTime && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>수정일</span><span style={{ color: 'var(--foreground)' }}>{formatDate(preview.modifiedTime)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>형식</span>
              <span style={{ color: 'var(--foreground)', fontSize: 11, maxWidth: 120, textAlign: 'right', wordBreak: 'break-all' }}>
                {preview.mimeType.split('/').pop()?.replace('vnd.google-apps.', '') || '—'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {preview.webViewLink && (
              <a href={preview.webViewLink} target="_blank" rel="noreferrer"
                className="notion-btn-primary"
                style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}>
                <ExternalLink size={13} /> Drive에서 열기
              </a>
            )}
            <button onClick={() => handleDownload(preview.id, preview.name)}
              className="notion-btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}>
              <Download size={13} /> 다운로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
