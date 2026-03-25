/**
 * AuthView - 로그인 화면
 * 좌측: 대형 로고 중앙 배치 / 우측: 흰색 박스 로고 + 로그인 폼
 */
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
      const mockSession = {
        user: { id: data.name, email: data.name, name: data.name, role: data.role || 'view' }
      };
      localStorage.setItem('hallaon_session', JSON.stringify(mockSession));
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--background)', overflow: 'hidden', position: 'relative',
    }}>
      {/* ── 좌측 패널 ── */}
      <div style={{
        width: '45%', flexShrink: 0,
        background: '#111111',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '40px 48px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* 배경 그라디언트 */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 30% 60%, rgba(35,131,226,0.07) 0%, transparent 60%)',
        }} />

        {/* 상단 텍스트 로고 */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#FFFFFF',          /* ← 흰색 박스 */
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}>
            <img src="/logo.png" alt="HALLAON" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ color: '#E8E8E8', fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em' }}>HALLAON</div>
            <div style={{ color: '#3A3A3A', fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Workspace</div>
          </div>
        </motion.div>

        {/* 중앙 - 대형 로고 */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}
        >
          {/* ★ 로고 크게 - 화면 좌측 패널의 절반 이상 차지 */}
          <motion.div
            animate={{
              y: [0, -8, 0],
              filter: [
                'drop-shadow(0 8px 28px rgba(35,131,226,0.2))',
                'drop-shadow(0 16px 40px rgba(35,131,226,0.45))',
                'drop-shadow(0 8px 28px rgba(35,131,226,0.2))',
              ],
            }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ display: 'inline-block', marginBottom: 28 }}
          >
            <img
              src="/logo.png"
              alt="HALLAON"
              style={{
                /* scale-125 이상 — 패널 너비의 ~60% */
                width: 'clamp(160px, 60%, 260px)',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            style={{
              color: '#E8E8E8', fontSize: 28, fontWeight: 800,
              letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: 12,
            }}
          >
            탐라영재관 자율회<br />
            <span style={{
              background: 'linear-gradient(135deg, #529CCA 0%, #7B61FF 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>한라온</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            style={{ color: '#AAAAAA', fontSize: 13, lineHeight: 1.85 }}
          >
            WBS · PERT/CPM · 의사결정 모델 · 문서 허브<br />
            모든 팀 운영 도구를 하나의 워크스페이스에서.
          </motion.p>

          {/* 팀 pill 배지 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 22, flexWrap: 'wrap' }}
          >
            {['📊 대시보드', '📋 WBS/PERT', '📅 캘린더', '⚖️ 의사결정', '📁 드라이브'].map((label, i) => (
              <motion.span
                key={label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.07 }}
                style={{
                  fontSize: 10, fontWeight: 600,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#555', padding: '4px 9px', borderRadius: 20,
                }}
              >
                {label}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>

        {/* 하단 카피라이트 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          style={{ color: '#2A2A2A', fontSize: 11, position: 'relative', zIndex: 1 }}
        >
          © 2025–2026 HALLAON · Jeju Talent Academy
        </motion.div>
      </div>

      {/* ── 우측 로그인 패널 ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px', position: 'relative',
        background: '#FFFFFF',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: 360 }}
        >
          {/* 우측 패널 상단 로고 - 흰색 박스 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: '#FFFFFF',          /* ← 흰색 박스 (어두운 로고 방지) */
              border: '1px solid rgba(0,0,0,0.08)',
              padding: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em', color: '#111111' }}>HALLAON</div>
              <div style={{ fontSize: 12, color: '#888888' }}>임원용 워크스페이스</div>
            </div>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: '#111111' }}>로그인</h2>
          <p style={{ color: '#666666', fontSize: 13, marginBottom: 28 }}>
            팀 계정으로 워크스페이스에 접속하세요
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#333333' }}>이름 (ID)</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="이름을 입력하세요"
                className="notion-input"
                style={{ fontSize: 14, padding: '10px 14px' }}
                autoComplete="username"
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#333333' }}>비밀번호</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="notion-input"
                  style={{ paddingRight: 44, fontSize: 14, padding: '10px 44px 10px 14px' }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--muted-foreground)', background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4,
                  }}
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
                  background: 'rgba(224,62,62,0.08)', border: '1px solid rgba(224,62,62,0.25)',
                  color: '#E03E3E', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14,
                }}
              >
                ⚠️ {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              style={{
                width: '100%', padding: '12px 20px',
                background: loading ? 'var(--border)' : 'var(--primary)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                letterSpacing: '-0.01em', transition: 'background 0.2s',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(35,131,226,0.35)',
              }}
            >
              {loading
                ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> 로그인 중...</>
                : <><LogIn size={17} /> 로그인</>
              }
            </motion.button>
          </form>

          <p style={{ textAlign: 'center', color: '#888888', fontSize: 12, marginTop: 24 }}>
            🔒 인가된 팀원만 접속 가능합니다
          </p>
        </motion.div>
      </div>
    </div>
  );
};
