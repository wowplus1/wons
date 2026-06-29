// src/components/CatalogRegisterForm.tsx
import React, { useState, useEffect } from 'react';
import { useErpStore } from '../store/useErpStore';
import type { CatalogItem } from '../firebase/mockDb';
import { PackagePlus } from 'lucide-react';

export const CatalogRegisterForm: React.FC = () => {
  const { stones, catalog, saveCatalogItem } = useErpStore();

  const [isEditMode, setIsEditMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [manufacturer, setManufacturer] = useState('자체제작');
  const [manufacturerCode, setManufacturerCode] = useState('M-101');
  const [vendor, setVendor] = useState('JP');
  const [modelNo, setModelNo] = useState('');
  const [relatedSetNo, setRelatedSetNo] = useState('');
  const [baseWeight, setBaseWeight] = useState('3.75');
  const [category, setCategory] = useState('Ring');
  const [isSet, setIsSet] = useState(false);
  const [baseMaterial, setBaseMaterial] = useState('14K');
  const [setClassification, setSetClassification] = useState('N');
  const [publicYn, setPublicYn] = useState('Y');
  const [discontinuedYn, setDiscontinuedYn] = useState('N');

  const [laborFees, setLaborFees] = useState([
    { type: '기본', color: 'YG', cost: '0', grade1: '0', grade2: '0', grade3: '0', grade4: '0' },
    { type: '추가1', color: 'WG', cost: '0', grade1: '0', grade2: '0', grade3: '0', grade4: '0' },
    { type: '추가2', color: 'RG', cost: '0', grade1: '0', grade2: '0', grade3: '0', grade4: '0' },
    { type: '추가3', color: '', cost: '0', grade1: '0', grade2: '0', grade3: '0', grade4: '0' }
  ]);

  const [stoneRows, setStoneRows] = useState(
    Array.from({ length: 7 }, (_, i) => ({
      row_id: i + 1,
      is_main: 'N',
      stone_id: '',
      quantity: 0,
      weight_deduction: 'Y',
      labor_apply: 'Y',
      weight: 0,
      buy_price: 0,
      grade_prices: { grade_1: 0, grade_2: 0, grade_3: 0, grade_4: 0 },
      description: ''
    }))
  );

  const [manualDeductionWeight, setManualDeductionWeight] = useState('0.00000');
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const modelParam = queryParams.get('model');
    if (modelParam && catalog.length > 0) {
      const matched = catalog.find(c => c.model_number.toUpperCase() === modelParam.toUpperCase());
      if (matched) {
        setIsEditMode(true);
        setManufacturer(matched.manufacturer || '자체제작');
        setManufacturerCode(matched.manufacturer_code || '');
        setVendor(matched.vendor || '');
        setModelNo(matched.model_number);
        setRelatedSetNo(matched.set_model_numbers ? matched.set_model_numbers.join(', ') : '');
        setBaseWeight(matched.base_weight ? String(matched.base_weight) : '0.00');
        setCategory(matched.category);
        setIsSet(matched.is_set);
        const mat = matched.materials[0] || '14K';
        setBaseMaterial(mat);
        setSetClassification(matched.is_set ? 'Y' : 'N');
        
        const baseLabor = matched.base_labor_fees[mat] || matched.base_labor_fees['14K'] || { grade_1: 0, grade_2: 0, grade_3: 0, grade_4: 0 };
        
        let updatedLaborFees = [];
        if (matched.labor_fees_v2 && matched.labor_fees_v2[mat] && matched.labor_fees_v2[mat].length > 0) {
          updatedLaborFees = matched.labor_fees_v2[mat].map(lf => ({
            type: lf.type || '',
            color: lf.color || '',
            cost: String(lf.cost || 0),
            grade1: String(lf.grade_1 || 0),
            grade2: String(lf.grade_2 || 0),
            grade3: String(lf.grade_3 || 0),
            grade4: String(lf.grade_4 || 0)
          }));
          
          const types = ['기본', '추가1', '추가2', '추가3'];
          while (updatedLaborFees.length < 4) {
            const currentIdx = updatedLaborFees.length;
            const type = types[currentIdx] || `추가${currentIdx}`;
            const defaultColor = type === '기본' ? 'YG' : type === '추가1' ? 'WG' : type === '추가2' ? 'RG' : '';
            updatedLaborFees.push({
              type,
              color: defaultColor,
              cost: '0',
              grade1: '0',
              grade2: '0',
              grade3: '0',
              grade4: '0'
            });
          }
        } else {
          updatedLaborFees = [
            { type: '기본', color: 'YG', cost: '0', grade1: String(baseLabor.grade_1), grade2: String(baseLabor.grade_2), grade3: String(baseLabor.grade_3), grade4: String(baseLabor.grade_4) },
            { type: '추가1', color: 'WG', cost: '0', grade1: String(matched.extra_labor_fee), grade2: String(matched.extra_labor_fee), grade3: String(matched.extra_labor_fee), grade4: String(matched.extra_labor_fee) },
            { type: '추가2', color: 'RG', cost: '0', grade1: '0', grade2: '0', grade3: '0', grade4: '0' },
            { type: '추가3', color: '', cost: '0', grade1: '0', grade2: '0', grade3: '0', grade4: '0' }
          ];
        }
        setLaborFees(updatedLaborFees);

        const updatedStoneRows = Array.from({ length: 7 }, (_, i) => {
          const ds = matched.default_stones[i];
          if (ds) {
            const selectedStone = stones.find(s => s.stone_id === ds.stone_id);
            return {
              row_id: i + 1,
              is_main: i === 0 ? 'Y' : 'N',
              stone_id: ds.stone_id,
              quantity: ds.quantity,
              weight_deduction: 'Y',
              labor_apply: 'Y',
              weight: selectedStone?.weight_carat || 0,
              buy_price: 500,
              grade_prices: selectedStone ? {
                grade_1: selectedStone.grade_prices.grade_1,
                grade_2: selectedStone.grade_prices.grade_2,
                grade_3: selectedStone.grade_prices.grade_3,
                grade_4: selectedStone.grade_prices.grade_4
              } : { grade_1: 0, grade_2: 0, grade_3: 0, grade_4: 0 },
              description: ''
            };
          } else {
            return {
              row_id: i + 1,
              is_main: 'N',
              stone_id: '',
              quantity: 0,
              weight_deduction: 'Y',
              labor_apply: 'Y',
              weight: 0,
              buy_price: 0,
              grade_prices: { grade_1: 0, grade_2: 0, grade_3: 0, grade_4: 0 },
              description: ''
            };
          }
        });
        setStoneRows(updatedStoneRows);

        if (matched.manual_deduction_weight !== undefined) {
          setManualDeductionWeight(String(matched.manual_deduction_weight));
        }
        if (matched.note) {
          setNote(matched.note);
        }
        if (matched.images && matched.images.length > 0) {
          setImages(matched.images);
        }
      }
    }
  }, [catalog, stones]);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
          }
          // 60% 압축율로 JPEG Base64 추출 (용량 극적 축소)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        };
        img.onerror = () => {
          reject(new Error('이미지 파일 변환에 실패했습니다.'));
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('파일을 읽는 중에 오류가 발생했습니다.'));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const promises = files.map(file => resizeImage(file));

      Promise.all(promises)
        .then(base64Urls => {
          setImages(prev => [...prev, ...base64Urls]);
        })
        .catch(err => {
          console.error(err);
          alert('이미지 처리 중 오류가 발생했습니다: ' + (err.message || err));
        });
    }
  };

  const handleLaborFeeChange = (index: number, field: string, val: string) => {
    const updated = [...laborFees];
    updated[index] = { ...updated[index], [field]: val };
    setLaborFees(updated);
  };

  const handleStoneRowChange = (index: number, field: string, val: any) => {
    const updated = [...stoneRows];
    if (field === 'stone_id') {
      const selectedStone = stones.find(s => s.stone_id === val);
      if (selectedStone) {
        updated[index] = {
          ...updated[index],
          stone_id: val,
          weight: selectedStone.weight_carat || 0,
          buy_price: 500,
          grade_prices: {
            grade_1: selectedStone.grade_prices.grade_1,
            grade_2: selectedStone.grade_prices.grade_2,
            grade_3: selectedStone.grade_prices.grade_3,
            grade_4: selectedStone.grade_prices.grade_4
          }
        };
      } else {
        updated[index] = {
          ...updated[index],
          stone_id: '',
          weight: 0,
          buy_price: 0,
          grade_prices: { grade_1: 0, grade_2: 0, grade_3: 0, grade_4: 0 }
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setStoneRows(updated);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelNo) return;

    const baseLaborRow = laborFees.find(lf => lf.type === '기본');
    const baseLaborFeesMap = {
      [baseMaterial]: {
        grade_1: parseFloat(baseLaborRow?.grade1 || '0') || 0,
        grade_2: parseFloat(baseLaborRow?.grade2 || '0') || 0,
        grade_3: parseFloat(baseLaborRow?.grade3 || '0') || 0,
        grade_4: parseFloat(baseLaborRow?.grade4 || '0') || 0
      }
    };

    const defaultStonesMap = stoneRows
      .filter(row => row.stone_id && row.quantity > 0)
      .map(row => ({
        stone_id: row.stone_id,
        quantity: row.quantity
      }));

    const store = useErpStore.getState();
    const existingItem = store.catalog.find(c => c.model_number.toUpperCase() === modelNo.toUpperCase());

    const newItem: CatalogItem = {
      model_number: modelNo.toUpperCase().trim(),
      category: category || 'Ring',
      is_set: isSet || false,
      materials: (() => {
        const currentMat = baseMaterial || '14K';
        if (existingItem && existingItem.materials) {
          return existingItem.materials.includes(currentMat)
            ? existingItem.materials
            : [...existingItem.materials, currentMat];
        }
        return [currentMat];
      })(),
      base_labor_fees: baseLaborFeesMap,
      extra_labor_fee: parseFloat(laborFees.find(lf => lf.type === '추가1')?.grade2 || '0') || 0,
      labor_fees_v2: {
        ...(existingItem?.labor_fees_v2 || {}),
        [baseMaterial]: laborFees.map(lf => ({
          type: lf.type,
          color: lf.color,
          cost: parseFloat(lf.cost) || 0,
          grade_1: parseFloat(lf.grade1) || 0,
          grade_2: parseFloat(lf.grade2) || 0,
          grade_3: parseFloat(lf.grade3) || 0,
          grade_4: parseFloat(lf.grade4) || 0,
        }))
      },
      default_stones: defaultStonesMap,
      images: images.length > 0 ? images : [],
      created_at: existingItem?.created_at || new Date().toISOString(),
      manufacturer: manufacturer || '자체제작',
      manufacturer_code: manufacturerCode || '',
      vendor: vendor || '',
      base_weight: parseFloat(baseWeight) || 0,
      stock_qty: existingItem?.stock_qty || 0,
      rental_qty: existingItem?.rental_qty || 0,
      sold_qty: existingItem?.sold_qty || 0,
      note: note || '',
      manual_deduction_weight: parseFloat(manualDeductionWeight) || 0
    };

    if (!isEditMode) {
      const isDuplicate = store.catalog.some(c => c.model_number.toUpperCase() === modelNo.toUpperCase());
      if (isDuplicate) {
        alert(`이미 존재하는 모델번호 [${modelNo.toUpperCase()}] 입니다.`);
        return;
      }
    }

    try {
      await saveCatalogItem(newItem);

      if (window.opener) {
        window.opener.postMessage('db_update', '*');
      }

      alert(isEditMode ? `카탈로그 [${newItem.model_number}]이 정상 수정되었습니다.` : `카탈로그 [${newItem.model_number}]이 정상 등록되었습니다.`);
      window.close();
    } catch (err: any) {
      console.error("saveCatalogItem failed: ", err);
      alert(`카탈로그 저장 중 오류가 발생했습니다.\n오류 내용: ${err.message || err}`);
    }
  };

  const totalStonesQty = stoneRows.reduce((sum, r) => sum + (r.quantity || 0), 0);
  const totalStonesWeight = stoneRows.reduce((sum, r) => sum + (r.weight * (r.quantity || 0)), 0);
  const totalDeductionWeight = totalStonesWeight + (parseFloat(manualDeductionWeight) || 0);
  const finalTotalWeight = Math.max(0, (parseFloat(baseWeight) || 0) - totalDeductionWeight);

  return (
    <div style={{ padding: isMobile ? '8px' : '20px', background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '980px', background: 'var(--bg-surface-solid)', border: '1px solid var(--primary)', height: 'fit-content', padding: isMobile ? '12px' : '20px' }}>
        <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
          <PackagePlus size={18} style={{ color: 'var(--primary)' }} />
          {isEditMode ? 'B2B 카다로그 상품 정보 수정 (새창)' : 'B2B 카다로그 상품 정보 등록 (새창)'}
        </h2>

        <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Section 1: Model Info */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: '600', display: 'block', borderBottom: '1px dashed var(--border-color)', paddingBottom: '4px' }}>
              모델 기본 정보 설정
            </span>
            <div className="catalog-form-container" style={{ display: 'flex', gap: '16px' }}>
              <div className="catalog-form-section" style={{ width: isMobile ? '100%' : '180px', flexShrink: 0 }}>
                <label style={{ display: 'block', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '4px' }}>대표 사진 등록</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} id="reg-catalog-file" />
                <label htmlFor="reg-catalog-file" style={{ display: 'flex', height: '130px', border: '1px dashed var(--border-color)', borderRadius: '6px', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', fontSize: '15px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}>
                  {images.length > 0 ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <img src={images[0]} alt="업로드" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImages([]); }} 
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span>사진 등록</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>터치하여 카메라/앨범</span>
                    </div>
                  )}
                </label>
              </div>
              <div className="catalog-form-section" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', color: '#a3a8b8', marginBottom: '2px', fontWeight: '500' }}>*제조사</label>
                  <input type="text" value={manufacturer} onChange={e => setManufacturer(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px 10px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', color: '#a3a8b8', marginBottom: '2px', fontWeight: '500' }}>제조코드(제조번호)</label>
                  <input type="text" value={manufacturerCode} onChange={e => setManufacturerCode(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px 10px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', color: '#a3a8b8', marginBottom: '2px', fontWeight: '500' }}>*모델번호</label>
                  <input type="text" value={modelNo} onChange={e => setModelNo(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px 10px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: isEditMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)', textTransform: 'uppercase' }} required disabled={isEditMode} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', color: '#a3a8b8', marginBottom: '2px', fontWeight: '500' }}>매입처</label>
                  <input type="text" value={vendor} onChange={e => setVendor(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px 10px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', color: '#a3a8b8', marginBottom: '2px', fontWeight: '500' }}>관련제품(세트)번호</label>
                  <input type="text" value={relatedSetNo} onChange={e => setRelatedSetNo(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px 10px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', color: '#a3a8b8', marginBottom: '2px', fontWeight: '500' }}>기본 중량(g)</label>
                  <input type="number" step="0.01" value={baseWeight} onChange={e => setBaseWeight(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px 10px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)', textAlign: 'right' }} />
                </div>
                <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '15px', color: '#a3a8b8', marginBottom: '2px', fontWeight: '500' }}>*모델분류</label>
                  <select value={category} onChange={e => { setCategory(e.target.value); if (e.target.value === 'Set') setIsSet(true); }} className="input-field" style={{ width: '100%', padding: '5px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }}>
                    <option value="Ring">반지 (Ring)</option>
                    <option value="Necklace">목걸이 (Necklace)</option>
                    <option value="Earring">귀걸이 (Earring)</option>
                    <option value="Set">세트상품 (Set)</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginTop: '6px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '15px', color: '#a3a8b8', marginBottom: '2px', fontWeight: '500' }}>기본재질</label>
                <select value={baseMaterial} onChange={e => setBaseMaterial(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }}>
                  <option value="14K">14K</option>
                  <option value="18K">18K</option>
                  <option value="24K">순금</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '15px', color: '#a3a8b8', marginBottom: '2px', fontWeight: '500' }}>세트구분</label>
                <select value={setClassification} onChange={e => { setSetClassification(e.target.value); setIsSet(e.target.value === 'Y'); }} className="input-field" style={{ width: '100%', padding: '5px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }}>
                  <option value="N">N: 단품</option>
                  <option value="Y">Y: 세트</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '15px', color: '#a3a8b8', marginBottom: '2px', fontWeight: '500' }}>공개여부</label>
                <select value={publicYn} onChange={e => setPublicYn(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }}>
                  <option value="Y">Y: 공개</option>
                  <option value="N">N: 비공개</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '15px', color: '#a3a8b8', marginBottom: '2px', fontWeight: '500' }}>단종여부</label>
                <select value={discontinuedYn} onChange={e => setDiscontinuedYn(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }}>
                  <option value="N">N: 정상</option>
                  <option value="Y">Y: 단종</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Labor Setting */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
            <span style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: '600', display: 'block', borderBottom: '1px dashed var(--border-color)', paddingBottom: '4px', marginBottom: '8px' }}>
              공임 및 원가 설정
            </span>
            <div className="catalog-stone-table-wrapper">
              <table className="catalog-stone-table labor-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-main)', background: 'rgba(255, 255, 255, 0.04)', height: '28px' }}>
                    <th style={{ padding: '6px 8px' }}>구분</th>
                    <th style={{ padding: '6px 8px', width: '100px' }}>색상</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>구매원가</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>판매가(1등급)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>판매가(2등급)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>판매가(3등급)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>판매가(4등급)</th>
                  </tr>
                </thead>
                <tbody>
                  {laborFees.map((lf, idx) => (
                    <tr key={lf.type} style={{ borderBottom: '1px solid var(--border-color)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.005)' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: '700', color: 'var(--primary)' }}>{lf.type}</td>
                      <td style={{ padding: '4px 6px' }}>
                        <select value={lf.color} onChange={e => handleLaborFeeChange(idx, 'color', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px 6px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }}>
                          <option value="">전체색상</option>
                          <option value="YG">YG (옐로우)</option>
                          <option value="WG">WG (화이트)</option>
                          <option value="RG">RG (핑크)</option>
                        </select>
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" value={lf.cost} onChange={e => handleLaborFeeChange(idx, 'cost', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px 6px', textAlign: 'right', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" value={lf.grade1} onChange={e => handleLaborFeeChange(idx, 'grade1', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px 6px', textAlign: 'right', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" value={lf.grade2} onChange={e => handleLaborFeeChange(idx, 'grade2', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px 6px', textAlign: 'right', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" value={lf.grade3} onChange={e => handleLaborFeeChange(idx, 'grade3', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px 6px', textAlign: 'right', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" value={lf.grade4} onChange={e => handleLaborFeeChange(idx, 'grade4', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px 6px', textAlign: 'right', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Stones Specification */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
            <span style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: '600', display: 'block', borderBottom: '1px dashed var(--border-color)', paddingBottom: '4px', marginBottom: '8px' }}>
              기본 세팅 스톤 정보 (스톤 1~7행 설정)
            </span>
            <div className="catalog-stone-table-wrapper">
              <table className="catalog-stone-table stones-spec-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-main)', background: 'rgba(255, 255, 255, 0.04)', height: '28px' }}>
                    <th style={{ padding: '6px 4px', width: '50px', textAlign: 'center' }}>구분</th>
                    <th style={{ padding: '6px 4px', width: '40px', textAlign: 'center' }}>메인</th>
                    <th style={{ padding: '6px 4px', width: '140px' }}>스톤명 검색</th>
                    <th style={{ padding: '6px 4px', width: '40px', textAlign: 'right' }}>알수</th>
                    <th style={{ padding: '6px 4px', width: '55px', textAlign: 'center' }}>중량차감</th>
                    <th style={{ padding: '6px 4px', width: '55px', textAlign: 'center' }}>공임적용</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', width: '70px' }}>개당중량</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', width: '65px' }}>구매단가</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', color: 'var(--primary)', width: '60px' }}>1등급</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', color: 'var(--primary)', width: '60px' }}>2등급</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', color: 'var(--primary)', width: '60px' }}>3등급</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', color: 'var(--primary)', width: '60px' }}>4등급</th>
                    <th style={{ padding: '6px 4px', width: '120px' }}>스톤 설명</th>
                  </tr>
                </thead>
                <tbody>
                  {stoneRows.map((row, idx) => (
                    <tr key={row.row_id} style={{ borderBottom: '1px solid var(--border-color)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.005)' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '4px', textAlign: 'center', color: 'var(--text-muted)' }}>스톤{row.row_id}</td>
                      <td style={{ padding: '2px' }}>
                        <select value={row.is_main} onChange={e => handleStoneRowChange(idx, 'is_main', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }}>
                          <option value="N">N</option>
                          <option value="Y">Y</option>
                        </select>
                      </td>
                      <td style={{ padding: '2px' }}>
                        <select value={row.stone_id} onChange={e => handleStoneRowChange(idx, 'stone_id', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }}>
                          <option value="">-- 선택 --</option>
                          {stones.map(s => <option key={s.stone_id} value={s.stone_id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '2px' }}>
                        <input type="number" min="0" value={row.quantity} onChange={e => handleStoneRowChange(idx, 'quantity', parseInt(e.target.value) || 0)} className="input-field" style={{ width: '100%', padding: '3px', textAlign: 'right', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }} />
                      </td>
                      <td style={{ padding: '2px' }}>
                        <select value={row.weight_deduction} onChange={e => handleStoneRowChange(idx, 'weight_deduction', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }}>
                          <option value="Y">Y</option>
                          <option value="N">N</option>
                        </select>
                      </td>
                      <td style={{ padding: '2px' }}>
                        <select value={row.labor_apply} onChange={e => handleStoneRowChange(idx, 'labor_apply', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }}>
                          <option value="Y">Y</option>
                          <option value="N">N</option>
                        </select>
                      </td>
                      <td style={{ padding: '2px 4px', textAlign: 'right', color: '#e5e7eb', fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: '500' }}>
                        {row.weight ? row.weight.toFixed(5) : '0.00000'}
                      </td>
                      <td style={{ padding: '2px 4px', textAlign: 'right', color: '#e5e7eb', fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: '500' }}>
                        {row.buy_price.toLocaleString()}
                      </td>
                      
                      {/* Render 1, 2, 3, 4 grade prices individually */}
                      <td style={{ padding: '2px 4px', textAlign: 'right', fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: '600', color: 'var(--primary)' }}>
                        {row.stone_id ? row.grade_prices.grade_1.toLocaleString() : '-'}
                      </td>
                      <td style={{ padding: '2px 4px', textAlign: 'right', fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: '600', color: 'var(--primary)' }}>
                        {row.stone_id ? row.grade_prices.grade_2.toLocaleString() : '-'}
                      </td>
                      <td style={{ padding: '2px 4px', textAlign: 'right', fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: '600', color: 'var(--primary)' }}>
                        {row.stone_id ? row.grade_prices.grade_3.toLocaleString() : '-'}
                      </td>
                      <td style={{ padding: '2px 4px', textAlign: 'right', fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: '600', color: 'var(--primary)' }}>
                        {row.stone_id ? row.grade_prices.grade_4.toLocaleString() : '-'}
                      </td>
                      
                      <td style={{ padding: '2px', width: '120px' }}>
                        <input type="text" value={row.description} onChange={e => handleStoneRowChange(idx, 'description', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px 6px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }} placeholder="메모" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="catalog-summary-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginTop: '10px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', fontSize: '15px', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>알수 소계: <strong>{totalStonesQty} 개</strong></div>
              <div>중량 소계: <strong>{totalStonesWeight.toFixed(5)} g</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                수동 차감중량: 
                <input type="number" step="0.0001" value={manualDeductionWeight} onChange={e => setManualDeductionWeight(e.target.value)} className="input-field" style={{ width: '70px', padding: '3px', fontSize: '15px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)', textAlign: 'right' }} />
              </div>
              <div style={{ color: 'var(--warning)', fontWeight: '600' }}>
                총 차감중량: <strong>{totalDeductionWeight.toFixed(5)} g</strong>
              </div>
              <div style={{ color: 'var(--primary)', fontWeight: '600' }}>
                최종 금중량(종합합계): <strong>{finalTotalWeight.toFixed(5)} g</strong>
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
            <label style={{ display: 'block', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '4px' }}>기타 설명 및 사양 정보</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="input-field" style={{ width: '100%', height: '50px', resize: 'vertical', fontSize: '15px', padding: '6px' }} placeholder="제품 메모" />
          </div>

          <div className="catalog-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <button type="button" onClick={() => window.close()} className="btn-primary" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
              닫기
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '6px 20px' }}>
              {isEditMode ? '카다로그 수정' : '카다로그 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
