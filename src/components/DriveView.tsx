import React, { useState, useEffect } from 'react';
import { DriveFile } from '../types';
import { HardDrive, Settings, ExternalLink, Download } from 'lucide-react';

export const DriveView = () => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/drive')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFiles(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Drive fetch error:', err);
        setLoading(false);
      });
  }, []);

  const handleDownload = (fileId: string, fileName: string) => {
    // In a real app, we'd call a download endpoint
    // For now, we'll just open the webViewLink or a proxy
    window.open(`/api/drive/download/${fileId}?name=${encodeURIComponent(fileName)}`, '_blank');
  };

  return (
    <div className="toss-card min-h-[600px]">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-2xl font-bold">구글 드라이브 자료실</h2>
          <p className="text-sm text-muted-foreground mt-2">공용 드라이브의 자료를 실시간으로 조회합니다.</p>
        </div>
        <button className="bg-secondary hover:bg-muted p-2 rounded-xl transition-all">
          <Settings size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
          <HardDrive size={48} strokeWidth={1} />
          <p>연결된 파일이 없거나 설정이 필요합니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map(file => (
            <div key={file.id} className="bg-muted/30 p-5 rounded-2xl border border-border group hover:border-primary transition-all">
              <div className="flex items-start justify-between mb-4">
                <img src={file.iconLink} alt="icon" className="w-8 h-8" referrerPolicy="no-referrer" />
                <div className="flex gap-2">
                  <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-all">
                    <ExternalLink size={16} />
                  </a>
                  <button 
                    onClick={() => handleDownload(file.id, file.name)}
                    className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-all"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
              <h4 className="font-bold text-sm truncate mb-1">{file.name}</h4>
              <p className="text-[10px] text-muted-foreground">
                수정일: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '-'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
