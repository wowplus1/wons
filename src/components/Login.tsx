import React, { useState } from 'react';
import { useErpStore } from '../store/useErpStore';
import { ShieldAlert, Key, User, ArrowRight, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useErpStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('이메일과 비밀번호를 모두 입력해 주십시오.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('이메일 주소 또는 비밀번호가 일치하지 않습니다.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMsg('올바르지 않은 이메일 형식입니다.');
      } else {
        setErrorMsg(`로그인 실패: ${err.message || '알 수 없는 서버 오류'}`);
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at 50% 50%, #fefefe 0%, #f5f3e9 100%)',
      fontFamily: 'var(--font-main)',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px 30px',
          boxShadow: '0 20px 40px rgba(212, 175, 55, 0.15), 0 1px 3px rgba(0,0,0,0.05)',
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* LOGO AREA */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 16px rgba(212, 175, 55, 0.3)'
          }}>
            <Sparkles size={28} />
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '800',
            color: 'var(--text-main)',
            letterSpacing: '-0.5px',
            margin: '8px 0 0 0'
          }}>
            원스쥬얼리 ERP
          </h1>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            원스 주얼리 비즈니스 통합 관리 시스템
          </span>
        </div>

        {/* ERROR MESSAGE BAR */}
        {errorMsg && (
          <div style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            boxSizing: 'border-box'
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>이메일 계정</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                placeholder="admin@wons.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 38px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14.5px',
                  color: 'var(--text-main)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>비밀번호</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Key size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 38px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14.5px',
                  color: 'var(--text-main)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)',
              color: 'var(--text-inverse)',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '12px',
              boxShadow: '0 4px 12px rgba(212, 175, 55, 0.25)'
            }}
          >
            {loading ? '인증 처리 중...' : '시스템 로그인'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* HELPFUL NOTICE & GUEST ACCESS */}
        <div style={{
          marginTop: '32px',
          textAlign: 'center',
          width: '100%',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '24px'
        }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
            본 시스템은 내부 권한이 부여된 임직원 전용 ERP 장부입니다.<br />
            계정 생성/조회는 <strong>Firebase Console Auth</strong>를 이용하십시오.
          </p>
        </div>
      </div>
    </div>
  );
};
