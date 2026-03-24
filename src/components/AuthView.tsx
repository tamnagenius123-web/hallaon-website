import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AuthView = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('name', username)
        .eq('password', password)
        .single();

      if (queryError || !data) throw new Error('ID 또는 비밀번호가 일치하지 않습니다.');

      // users 테이블에 id 컬럼이 없으므로 name을 id로 사용
      const mockSession = { user: { id: data.name, email: data.name, name: data.name, role: data.role || 'view' } };
      localStorage.setItem('hallaon_session', JSON.stringify(mockSession));
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-2/5 p-12"
        style={{ background: '#191919', borderRight: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.95)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ color: '#CFCFCF', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>HALLAON</div>
            <div style={{ color: '#4D4D4D', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Workspace</div>
          </div>
        </div>

        <div>
          <div style={{ color: '#CFCFCF', fontSize: 28, fontWeight: 700, lineHeight: 1.3, marginBottom: 16, letterSpacing: '-0.03em' }}>
            탐라영재관 자율회<br />
            <span style={{ color: '#529CCA' }}>한라온</span>의 협업 공간
          </div>
          <p style={{ color: '#696969', fontSize: 14, lineHeight: 1.7 }}>
            WBS · PERT/CPM · 의사결정 모델 · 문서 허브<br />
            모든 팀 운영 도구를 하나의 워크스페이스에서.
          </p>
        </div>

        <div style={{ color: '#3A3A3A', fontSize: 12 }}>
          © 2025 HALLAON · Jeju Talent Academy
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0,0,0,0.06)', padding: 5 }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>HALLAON</div>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>워크스페이스 로그인</h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginBottom: 32 }}>팀 계정으로 접속하세요</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>이름 (ID)</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="이름을 입력하세요"
                className="notion-input"
                required
                autoFocus
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>비밀번호</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="notion-input"
                  style={{ paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'rgba(224,62,62,0.08)',
                  border: '1px solid rgba(224,62,62,0.2)',
                  color: '#E03E3E',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                }}
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="notion-btn-primary w-full justify-center py-3 mt-2"
              style={{ borderRadius: 8, fontSize: 14, fontWeight: 600 }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              <span>{loading ? '로그인 중...' : '로그인'}</span>
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 12, marginTop: 24 }}>
            인가된 팀원만 접속 가능합니다
          </p>
        </motion.div>
      </div>
    </div>
  );
};
