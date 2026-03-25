/**
 * IntroAnimation - 시네마틱 인트로
 * 흰색 배경 + 홀로그램 Glitch 효과
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const IntroAnimation = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState<'in' | 'glitch' | 'out' | 'done'>('in');
  const [glitchFrame, setGlitchFrame] = useState(0);

  useEffect(() => {
    // 0.8s 후 glitch 시작
    const t1 = setTimeout(() => setPhase('glitch'), 800);
    // 2.8s 후 페이드아웃
    const t2 = setTimeout(() => setPhase('out'), 2800);
    // 3.3s 후 done → onComplete
    const t3 = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  // Glitch 프레임 루프
  useEffect(() => {
    if (phase !== 'glitch') return;
    const interval = setInterval(() => {
      setGlitchFrame(f => (f + 1) % 6);
    }, 120);
    return () => clearInterval(interval);
  }, [phase]);

  // Glitch 오프셋 계산
  const glitchActive = phase === 'glitch';
  const glitchOffsets = [
    { x: 0,  y: 0  },
    { x: 3,  y: -2 },
    { x: -4, y: 1  },
    { x: 2,  y: 3  },
    { x: -2, y: -3 },
    { x: 5,  y: -1 },
  ];
  const currentOffset = glitchActive ? glitchOffsets[glitchFrame] : { x: 0, y: 0 };

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === 'out' ? 0 : 1 }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#FFFFFF',   /* 흰색 배경 */
            overflow: 'hidden',
          }}
        >
          {/* 노이즈 스캔라인 오버레이 */}
          {glitchActive && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
              animation: 'scanline 0.4s steps(1) infinite',
            }} />
          )}

          {/* Glitch 컬러 채널 - RED */}
          {glitchActive && glitchFrame % 2 === 0 && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img
                src="/logo.png"
                alt=""
                style={{
                  width: '55vmin', height: '55vmin', objectFit: 'contain',
                  opacity: 0.25,
                  mixBlendMode: 'multiply',
                  transform: `translate(${currentOffset.x * 2}px, ${currentOffset.y}px)`,
                  filter: 'hue-rotate(200deg) saturate(3)',
                  position: 'absolute',
                }}
              />
            </div>
          )}

          {/* 메인 로고 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, filter: 'blur(20px)' }}
            animate={phase === 'in'
              ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
              : {
                  opacity: 1, scale: 1, filter: 'blur(0px)',
                  x: currentOffset.x,
                  y: currentOffset.y,
                }
            }
            transition={phase === 'in'
              ? { duration: 0.75, ease: [0.16, 1, 0.3, 1] }
              : { duration: 0.06, ease: 'linear' }
            }
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 20, position: 'relative', zIndex: 3,
            }}
          >
            {/* 로고 이미지 - 화면 가득 */}
            <div style={{
              width: '52vmin', height: '52vmin', maxWidth: 420, maxHeight: 420,
              position: 'relative',
              filter: glitchActive && glitchFrame % 3 === 0
                ? 'drop-shadow(0 0 20px rgba(82,156,202,0.8)) drop-shadow(0 0 40px rgba(82,156,202,0.4))'
                : 'drop-shadow(0 4px 24px rgba(0,0,0,0.12))',
              transition: 'filter 0.06s',
            }}>
              <img
                src="/logo.png"
                alt="HALLAON"
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />

              {/* 홀로그램 shimmer */}
              {glitchActive && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(82,156,202,0.15) 0%, transparent 50%, rgba(174,62,201,0.1) 100%)',
                  animation: 'holoPulse 0.8s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
              )}
            </div>

            {/* 텍스트 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              <span style={{
                color: '#1A1A1A', fontSize: 26, fontWeight: 800,
                letterSpacing: '-0.02em',
                filter: glitchActive && glitchFrame % 2 === 1 ? 'blur(0.5px)' : 'none',
              }}>
                HALLAON
              </span>
              <span style={{
                color: '#888888', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.3em', textTransform: 'uppercase',
              }}>
                Workspace · Jeju
              </span>
            </motion.div>
          </motion.div>

          {/* 하단 로딩 점 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.3 }}
            style={{ position: 'absolute', bottom: 48, display: 'flex', gap: 6, zIndex: 4 }}
          >
            {[0, 0.18, 0.36].map((d, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.2, 0.8] }}
                transition={{ repeat: Infinity, duration: 1, delay: d, ease: 'easeInOut' }}
                style={{ width: 5, height: 5, borderRadius: '50%', background: '#1A1A1A' }}
              />
            ))}
          </motion.div>

          {/* Glitch 수평 막대 */}
          {glitchActive && glitchFrame === 3 && (
            <div style={{
              position: 'absolute', zIndex: 5,
              left: 0, right: 0,
              top: `${25 + Math.random() * 50}%`,
              height: 2,
              background: 'rgba(82,156,202,0.6)',
              pointerEvents: 'none',
            }} />
          )}

          <style>{`
            @keyframes scanline {
              0%   { background-position: 0 0; }
              100% { background-position: 0 8px; }
            }
            @keyframes holoPulse {
              0%,100% { opacity: 0.4; }
              50%      { opacity: 0.9; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
