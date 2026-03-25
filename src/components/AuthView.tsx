/**
 * AuthView - 로그인 화면
 * 좌측: 로고 + 타이틀 완전 중앙 정렬 (세로 flex center)
 * 우측: 흰색 배경 + 로고 선명하게 표시
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
      background: '#0A0A0A', overflow: 'hidden', position: 'relative',
    }}>
      {/* ── 좌측 패널 (로고 + 타이틀 완전 중앙) ── */}
      <div style={{
        width: '50%', flexShrink: 0,
        background: '#111111',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',       /* 가로 중앙 */
        justifyContent: 'center',   /* 세로 중앙 */
        padding: '60px 48px',
        position: 'relative', overflow: 'hidden',
        minHeight: '100vh',
      }}>
        {/* 배경 그라디언트 */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 45%, rgba(35,131,226,0.08) 0%, transparent 65%)',
        }} />

        {/* ── 중앙 콘텐츠 블록: 로고 + 타이틀 + 부제 ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center',
            position: 'relative', zIndex: 1,
            gap: 0,
          }}
        >
          {/* 로고 이미지 */}
          <motion.div
            animate={{
              y: [0, -10, 0],
              filter: [
                'drop-shadow(0 8px 28px rgba(35,131,226,0.18))',
                'drop-shadow(0 18px 44px rgba(35,131,226,0.40))',
                'drop-shadow(0 8px 28px rgba(35,131,226,0.18))',
              ],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ marginBottom: 32 }}
          >
            <img
              src="/logo.png"
              alt="HALLAON"
              style={{
                width: 'clamp(180px, 55%, 280px)',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </motion.div>

          {/* 타이틀 텍스트 — 로고와 같은 중앙 블록 */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.65 }}
            style={{
              color: '#E8E8E8', fontSize: 30, fontWeight: 800,
              letterSpacing: '-0.04em', lineHeight: 1.25, marginBottom: 12,
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
            style={{ color: '#888888', fontSize: 13, lineHeight: 1.85, marginBottom: 28 }}
          >
            WBS · PERT/CPM · 의사결정 모델 · 문서 허브<br />
            모든 팀 운영 도구를 하나의 워크스페이스에서.
          </motion.p>

          {/* 팀 pill 배지 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}
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
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#666', padding: '4px 10px', borderRadius: 20,
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
          transition={{ delay: 1.0 }}
          style={{ position: 'absolute', bottom: 28, color: '#333333', fontSize: 11, zIndex: 1 }}
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
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: 360 }}
        >
          {/* 우측 로고 — 어두운 배경 박스로 로고 선명하게 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: '#111111',         /* 어두운 배경 → 흰색 로고 선명하게 */
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 10, flexShrink: 0,
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            }}>
              <img
                src="/logo.png"
                alt="Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.04em', color: '#111111' }}>
                HALLAON
              </div>
              <div style={{ fontSize: 12, color: '#888888', letterSpacing: '0.02em' }}>
                임원용 워크스페이스
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, color: '#111111' }}>
            로그인
          </h2>
          <p style={{ color: '#666666', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
            팀 계정으로 워크스페이스에 접속하세요
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#333333' }}>
                이름 (ID)
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="이름을 입력하세요"
                style={{
                  width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                  border: '1.5px solid #E5E7EB', borderRadius: 10,
                  fontSize: 14, color: '#111111', background: '#FAFAFA',
                  outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2383E2')}
                onBlur={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
                autoComplete="username"
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#333333' }}>
                비밀번호
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  style={{
                    width: '100%', padding: '11px 44px 11px 14px', boxSizing: 'border-box',
                    border: '1.5px solid #E5E7EB', borderRadius: 10,
                    fontSize: 14, color: '#111111', background: '#FAFAFA',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#2383E2')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    color: '#888888', background: 'none', border: 'none',
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
                  background: 'rgba(224,62,62,0.07)', border: '1px solid rgba(224,62,62,0.22)',
                  color: '#C92A2A', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14,
                }}
              >
                ⚠️ {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.015 }}
              whileTap={{ scale: loading ? 1 : 0.985 }}
              style={{
                width: '100%', padding: '13px 20px',
                background: loading ? '#D1D5DB' : '#2383E2',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                letterSpacing: '-0.01em', transition: 'background 0.2s',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(35,131,226,0.38)',
              }}
            >
              {loading
                ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> 로그인 중...</>
                : <><LogIn size={17} /> 로그인</>
              }
            </motion.button>
          </form>

          <p style={{ textAlign: 'center', color: '#AAAAAA', fontSize: 12, marginTop: 24 }}>
            🔒 인가된 팀원만 접속 가능합니다
          </p>
        </motion.div>
      </div>
    </div>
  );
};
