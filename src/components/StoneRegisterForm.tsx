// src/components/StoneRegisterForm.tsx
import React, { useState, useEffect } from 'react';
import { useErpStore } from '../store/useErpStore';
import type { Stone } from '../firebase/mockDb';
import { Gem, Check } from 'lucide-react';

export const StoneRegisterForm: React.FC = () => {
  const { addStone } = useErpStore();

  const [name, setName] = useState('CZ');
  const [shape, setShape] = useState('RD');
  const [size, setSize] = useState('1.5');
  const [stoneName, setStoneName] = useState('CZ/RD/1.5');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('0.015');
  const [purchasePrice, setPurchasePrice] = useState('150');
  
  const [grade1Price, setGrade1Price] = useState('200');
  const [grade2Price, setGrade2Price] = useState('250');
  const [grade3Price, setGrade3Price] = useState('300');
  const [grade4Price, setGrade4Price] = useState('350');

  useEffect(() => {
    setStoneName(`${name}/${shape}/${size}`);
  }, [name, shape, size]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !shape || !size) return;

    const stoneId = `${name.toLowerCase()}_${shape.toLowerCase()}_${size.toLowerCase().replace(/\./g, '_')}`;

    const newStone: Stone = {
      stone_id: stoneId,
      name: stoneName,
      shape,
      size,
      weight_carat: parseFloat(weight) || 0,
      grade_prices: {
        grade_1: parseFloat(grade1Price) || 0,
        grade_2: parseFloat(grade2Price) || 0,
        grade_3: parseFloat(grade3Price) || 0,
        grade_4: parseFloat(grade4Price) || 0,
      },
      updated_at: new Date().toISOString()
    };

    await addStone(newStone);
    
    // Notify parent window to refresh its database and close self
    if (window.opener) {
      window.opener.postMessage('db_update', '*');
    }
    
    alert(`스톤 [${newStone.name}]이 등록되었습니다.`);
    window.close();
  };

  return (
    <div style={{ padding: '20px', background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', background: 'var(--bg-surface-solid)', border: '1px solid var(--primary)' }}>
        <h2 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
          <Gem size={16} style={{ color: 'var(--primary)' }} />
          신규 스톤 마스터 등록 (새창)
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(212, 175, 55, 0.05)', fontSize: '11px', color: 'var(--primary)', fontWeight: '600', width: 'fit-content' }}>
            * 표시는 반드시 입력해야 합니다.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>*이름</label>
              <select value={name} onChange={(e) => setName(e.target.value)} className="input-field" style={{ width: '100%', padding: '6px' }} required>
                <option value="CZ">CZ (큐빅)</option>
                <option value="DIA">DIA (다이아)</option>
                <option value="LAB">LAB (랩다이아)</option>
                <option value="RUBY">RUBY (루비)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>*모양</label>
              <select value={shape} onChange={(e) => setShape(e.target.value)} className="input-field" style={{ width: '100%', padding: '6px' }} required>
                <option value="RD">RD (라운드)</option>
                <option value="BG">BG (바게트)</option>
                <option value="SQ">SQ (사각)</option>
                <option value="OV">OV (오발)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>*사이즈</label>
              <input type="text" value={size} onChange={(e) => setSize(e.target.value)} className="input-field" style={{ width: '100%', padding: '6px' }} placeholder="1.5" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>스톤명 (자동 조합)</label>
              <input type="text" value={stoneName} className="input-field" style={{ width: '100%', padding: '6px', background: 'rgba(255, 255, 255, 0.03)', color: 'var(--primary)', fontWeight: '600' }} disabled />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>기타설명 (40자내)</label>
            <input type="text" maxLength={40} value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" style={{ width: '100%', padding: '6px' }} placeholder="특이사항 메모" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>중량(g)</label>
              <input type="number" step="0.00001" value={weight} onChange={(e) => setWeight(e.target.value)} className="input-field" style={{ width: '100%', padding: '6px', textAlign: 'right' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>구매단가</label>
              <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="input-field" style={{ width: '100%', padding: '6px', textAlign: 'right' }} />
            </div>
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', background: 'rgba(255,255,255,0.01)' }}>
            <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', display: 'block', marginBottom: '8px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '4px' }}>
              거래처 등급별 공급가 설정
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2px' }}>1등급</label>
                <input type="number" value={grade1Price} onChange={(e) => setGrade1Price(e.target.value)} className="input-field" style={{ width: '100%', padding: '4px', textAlign: 'right', fontSize: '11px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2px' }}>2등급</label>
                <input type="number" value={grade2Price} onChange={(e) => setGrade2Price(e.target.value)} className="input-field" style={{ width: '100%', padding: '4px', textAlign: 'right', fontSize: '11px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2px' }}>3등급</label>
                <input type="number" value={grade3Price} onChange={(e) => setGrade3Price(e.target.value)} className="input-field" style={{ width: '100%', padding: '4px', textAlign: 'right', fontSize: '11px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2px' }}>4등급</label>
                <input type="number" value={grade4Price} onChange={(e) => setGrade4Price(e.target.value)} className="input-field" style={{ width: '100%', padding: '4px', textAlign: 'right', fontSize: '11px' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
            <button type="button" onClick={() => window.close()} className="btn-primary" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
              닫기
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '6px 16px' }}>
              <Check size={14} /> 등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
