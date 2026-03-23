import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const IntroAnimation = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState<'logo' | 'done'>('logo');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('done'), 2200);
    const t2 = setTimeout(() => onComplete(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase === 'logo' && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: '#191919' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <div
              style={{
                width: 96, height: 96, borderRadius: 24,
                background: 'rgba(255,255,255,0.97)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 60px rgba(82,156,202,0.25), 0 20px 40px rgba(0,0,0,0.3)',
                padding: 12,
              }}
            >
              <img src="/logo.png" alt="Hallaon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col items-center gap-1"
            >
              <span style={{ color: '#CFCFCF', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                HALLAON
              </span>
              <span style={{ color: '#4D4D4D', fontSize: 11, fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
                Workspace · Jeju
              </span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.4 }}
            style={{ position: 'absolute', bottom: 40, display: 'flex', gap: 5 }}
          >
            {[0, 0.15, 0.3].map((d, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1, delay: d }}
                style={{ width: 4, height: 4, borderRadius: '50%', background: '#529CCA' }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
