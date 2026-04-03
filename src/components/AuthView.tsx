/**
 * AuthView - 로그인 화면
 * 매직 링크 인증 시스템 적용 및 세션 처리 수정
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LogIn, Loader2, Mail, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AuthView = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState(''); // 이름 상태 추가
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 컴포넌트 마운트 시 및 인증 상태 변화 감지
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Supabase 메타데이터의 full_name을 우선적으로 가져오도록 수정
          const mockSession = {
            user: { 
              id: session.user.id, 
              email: session.user.email, 
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              role: 'authenticated' 
            }
          };
          localStorage.setItem('hallaon_session', JSON.stringify(mockSession));
          onAuthSuccess();
        }
      } catch (err) {
        console.error('세션 확인 중 오류:', err);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const mockSession = {
            user: { 
              id: session.user.id, 
              email: session.user.email, 
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              role: 'authenticated' 
            }
          };
          localStorage.setItem('hallaon_session', JSON.stringify(mockSession));
          onAuthSuccess();
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [onAuthSuccess]);

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      setError('이름과 이메일을 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const redirectUrl = window.location.origin;
      
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name, // 입력받은 이름을 메타데이터로 전송
          }
        },
      });

      if (signInError) {
        setError(signInError.message || '매직 링크 요청 중 오류가 발생했습니다.');
      } else {
        setMessage('✉️ 이메일로 매직 링크가 발송되었습니다! 메일함을 확인해주세요.');
        setEmail('');
        setName('');
      }
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0A0A0A',
      }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#2383E2' }} />
      </div>
    );
  }

  return (
    <div className="auth-container" style={{
      minHeight: '100vh', display: 'flex', background: '#0A0A0A',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* ── 좌측 패널 ── */}
      <div className="auth-left-panel" style={{
        width: '50%', flexShrink: 0, background: '#111111',
        borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '60px 48px', position: 'relative', overflow: 'hidden', minHeight: '100vh',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 45%, rgba(35,131,226,0.08) 0%, transparent 65%)',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center', position: 'relative', zIndex: 1, gap: 0,
          }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ marginBottom: 32, width: '100%' }}
          >
            <img src="/logo.png" alt="HALLAON" style={{
              width: '240px', height: 'auto', objectFit: 'contain',
              display: 'block', margin: '0 auto',
              filter: 'brightness(0) invert(1) drop-shadow(0 8px 28px rgba(35,131,226,0.45))',
            }} />
          </motion.div>

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
        </motion.div>

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
      <div className="auth-right-panel" style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px', position: 'relative', background: '#FFFFFF',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: 360 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, background: '#111111',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 10, flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
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
            매직 링크 로그인
          </h2>
          <p style={{ color: '#666666', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
            이름과 이메일을 입력해 매직 링크를 받으세요
          </p>

          <form onSubmit={handleMagicLinkLogin}>
            {/* 이름 입력 필드 추가 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#333333' }}>
                이름
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="본명 (예: 장민성)"
                  style={{
                    width: '100%', padding: '11px 44px 11px 14px', boxSizing: 'border-box',
                    border: '1.5px solid #E5E7EB', borderRadius: 10,
                    fontSize: 14, color: '#111111', background: '#FAFAFA',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#2383E2')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
                  required
                  autoFocus
                />
                <User size={16} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#888888', pointerEvents: 'none',
                }} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#333333' }}>
                이메일
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="이메일을 입력하세요"
                  style={{
                    width: '100%', padding: '11px 44px 11px 14px', boxSizing: 'border-box',
                    border: '1.5px solid #E5E7EB', borderRadius: 10,
                    fontSize: 14, color: '#111111', background: '#FAFAFA',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#2383E2')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
                  autoComplete="email"
                  required
                />
                <Mail size={16} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#888888', pointerEvents: 'none',
                }} />
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

            {message && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.22)',
                  color: '#16A34A', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14,
                }}
              >
                {message}
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
                ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> 전송 중...</>
                : <><Mail size={17} /> 매직 링크 받기</>
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
