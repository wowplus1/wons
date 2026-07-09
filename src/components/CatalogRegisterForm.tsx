// src/components/CatalogRegisterForm.tsx
import React, { useState, useEffect } from 'react';
import { useErpStore } from '../store/useErpStore';
import type { CatalogItem } from '../firebase/mockDb';
import { PackagePlus } from 'lucide-react';
import { toCommaString, fromCommaStringInt } from '../utils/numberFormat';

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

  const manufacturer = '자체제작';
  const [manufacturerCode, setManufacturerCode] = useState('M-101');
  const [vendor, setVendor] = useState('');
  const [modelNo, setModelNo] = useState('');
  const [relatedSetNo, setRelatedSetNo] = useState('');
  const [baseWeight, setBaseWeight] = useState('3.75');
  const [category, setCategory] = useState('Ring');
  const [isSet, setIsSet] = useState(false);
  const [baseMaterial, setBaseMaterial] = useState('14K');
  const [discontinuedYn, setDiscontinuedYn] = useState('N');

  const [laborFees, setLaborFees] = useState([
    { type: '기본', color: 'G', cost: '0', grade1: '0', grade2: '0', grade3: '0', grade4: '0' }
  ]);

  const [stoneRows, setStoneRows] = useState<
    Array<{
      row_id: number;
      is_main: string;
      stone_id: string;
      quantity: number;
      weight_deduction: string;
      labor_apply: string;
      weight: number;
      buy_price: number;
      grade_prices: { grade_1: number; grade_2: number; grade_3: number; grade_4: number };
      description: string;
      search_term?: string;
      is_dropdown_open?: boolean;
    }>
  >(
    Array.from({ length: 4 }, (_, i) => ({
      row_id: i + 1,
      is_main: 'N',
      stone_id: '',
      quantity: 0,
      weight_deduction: 'Y',
      labor_apply: 'Y',
      weight: 0,
      buy_price: 0,
      grade_prices: { grade_1: 0, grade_2: 0, grade_3: 0, grade_4: 0 },
      description: '',
      search_term: '',
      is_dropdown_open: false
    }))
  );

  const [extraLaborFee, setExtraLaborFee] = useState('0');
  const [manualDeductionWeight, setManualDeductionWeight] = useState('0.000');
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // 이미지 편집기 관련 상태
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorOriginalSrc, setEditorOriginalSrc] = useState<string | null>(null);
  const [editorRotation, setEditorRotation] = useState<number>(0);
  const [editorZoom, setEditorZoom] = useState<number>(1.0);
  const [editorOffsetX, setEditorOffsetX] = useState<number>(0);
  const [editorOffsetY, setEditorOffsetY] = useState<number>(0);
  const [editorBrightness, setEditorBrightness] = useState<number>(0);
  const [editorContrast, setEditorContrast] = useState<number>(0);

  // 드래그(이동) 제어용 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const modelParam = queryParams.get('model');
    if (modelParam && catalog.length > 0) {
      const matched = catalog.find(c => c.model_number.toUpperCase() === modelParam.toUpperCase());
      if (matched) {
        setIsEditMode(true);
        setManufacturerCode(matched.manufacturer_code || '');
        setVendor(matched.vendor || '');
        setModelNo(matched.model_number);
        setRelatedSetNo(matched.set_model_numbers ? matched.set_model_numbers.join(', ') : '');
        setBaseWeight(matched.base_weight ? Number(matched.base_weight).toFixed(3) : '0.000');
        setCategory(matched.category);
        setIsSet(matched.is_set);
        const mat = matched.materials[0] || '14K';
        setBaseMaterial(mat);
        
        const baseLabor = matched.base_labor_fees[mat] || matched.base_labor_fees['14K'] || { grade_1: 0, grade_2: 0, grade_3: 0, grade_4: 0 };
        
        let updatedLaborFees: any[] = [];
        if (matched.labor_fees_v2 && matched.labor_fees_v2[mat] && matched.labor_fees_v2[mat].length > 0) {
          const baseV2 = matched.labor_fees_v2[mat].find(lf => lf.type === '기본');
          if (baseV2) {
            updatedLaborFees = [{
              type: '기본',
              color: baseV2.color || 'G',
              cost: String(baseV2.cost || 0),
              grade1: String(baseV2.grade_1 || 0),
              grade2: String(baseV2.grade_2 || 0),
              grade3: String(baseV2.grade_3 || 0),
              grade4: String(baseV2.grade_4 || 0)
            }];
          }
        }
        
        if (updatedLaborFees.length === 0) {
          updatedLaborFees = [
            { type: '기본', color: 'G', cost: '0', grade1: String(baseLabor.grade_1), grade2: String(baseLabor.grade_2), grade3: String(baseLabor.grade_3), grade4: String(baseLabor.grade_4) }
          ];
        }
        setLaborFees(updatedLaborFees);

        const updatedStoneRows = Array.from({ length: 4 }, (_, i) => {
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
              weight: (selectedStone?.weight_carat || 0) + (selectedStone?.deduction_weight || 0),
              buy_price: selectedStone?.purchase_price !== undefined ? selectedStone.purchase_price : 500,
              grade_prices: selectedStone ? {
                grade_1: selectedStone.grade_prices.grade_1,
                grade_2: selectedStone.grade_prices.grade_2,
                grade_3: selectedStone.grade_prices.grade_3,
                grade_4: selectedStone.grade_prices.grade_4
              } : { grade_1: 0, grade_2: 0, grade_3: 0, grade_4: 0 },
              description: ds.description || '',
              search_term: selectedStone?.name || '',
              is_dropdown_open: false
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
              description: '',
              search_term: '',
              is_dropdown_open: false
            };
          }
        });
        setStoneRows(updatedStoneRows);

        if (matched.extra_labor_fee !== undefined) {
          setExtraLaborFee(String(matched.extra_labor_fee || 0));
        }
        if (matched.manual_deduction_weight !== undefined) {
          setManualDeductionWeight(Number(matched.manual_deduction_weight).toFixed(3));
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

  // Canvas 실시간 렌더링 효과
  useEffect(() => {
    if (!isEditorOpen || !editorOriginalSrc) return;
    const canvas = document.getElementById('image-editor-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous'; // CORS 방지
    img.onload = () => {
      ctx.clearRect(0, 0, 400, 400);

      // 밝기 및 대비 필터 적용 (Canvas 2D API 하드웨어 가속 활용)
      ctx.filter = `brightness(${100 + editorBrightness}%) contrast(${100 + editorContrast}%)`;

      ctx.save();
      // 화면 기준 좌표(Center)로 먼저 평행 이동 후 회전 및 확대/축소 적용 (드래그 방향 일관성 유지)
      ctx.translate(200 + editorOffsetX, 200 + editorOffsetY);
      ctx.rotate((editorRotation * Math.PI) / 180);
      ctx.scale(editorZoom, editorZoom);

      // 이미지를 중앙 정렬하여 렌더링
      const imgRatio = img.width / img.height;
      let drawWidth = 400;
      let drawHeight = 400;
      if (imgRatio > 1) {
        drawHeight = 400 / imgRatio;
      } else {
        drawWidth = 400 * imgRatio;
      }

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    };
    img.src = editorOriginalSrc;
  }, [isEditorOpen, editorOriginalSrc, editorRotation, editorZoom, editorOffsetX, editorOffsetY, editorBrightness, editorContrast]);

  // 마우스 드래그를 이용한 이미지 이동 제어 핸들러
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - editorOffsetX, y: e.clientY - editorOffsetY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setEditorOffsetX(e.clientX - dragStart.x);
    setEditorOffsetY(e.clientY - dragStart.y);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleApplyEdit = () => {
    const canvas = document.getElementById('image-editor-canvas') as HTMLCanvasElement | null;
    if (canvas) {
      // 400x400 크기의 JPEG 포맷으로 0.7 압축율 변환
      const editedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setImages([editedDataUrl]);
      setIsEditorOpen(false);
      setEditorOriginalSrc(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditorOpen(false);
    setEditorOriginalSrc(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEditorOriginalSrc(event.target.result as string);
          setEditorRotation(0);
          setEditorZoom(1.0);
          setEditorOffsetX(0);
          setEditorOffsetY(0);
          setEditorBrightness(0);
          setEditorContrast(0);
          setIsEditorOpen(true);
        }
      };
      reader.readAsDataURL(file);
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
          weight: (selectedStone.weight_carat || 0) + (selectedStone.deduction_weight || 0),
          buy_price: selectedStone.purchase_price || 500,
          grade_prices: {
            grade_1: selectedStone.grade_prices.grade_1,
            grade_2: selectedStone.grade_prices.grade_2,
            grade_3: selectedStone.grade_prices.grade_3,
            grade_4: selectedStone.grade_prices.grade_4
          },
          search_term: selectedStone.name,
          is_dropdown_open: false
        };
      } else {
        updated[index] = {
          ...updated[index],
          stone_id: '',
          weight: 0,
          buy_price: 0,
          grade_prices: { grade_1: 0, grade_2: 0, grade_3: 0, grade_4: 0 },
          search_term: '',
          is_dropdown_open: false
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
      .map(row => {
        let finalStoneId = row.stone_id;
        if (!finalStoneId && row.search_term) {
          const matched = stones.find(
            s => s.name.toLowerCase().trim() === row.search_term!.toLowerCase().trim()
          );
          if (matched) {
            finalStoneId = matched.stone_id;
          }
        }
        return {
          stone_id: finalStoneId,
          quantity: row.quantity,
          description: row.description
        };
      })
      .filter(row => row.stone_id && row.quantity > 0);

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
      extra_labor_fee: parseFloat(extraLaborFee) || 0,
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
      
      if (window.opener) {
        window.close();
      } else {
        window.location.href = './';
      }
    } catch (err: any) {
      console.error("saveCatalogItem failed: ", err);
      alert(`카탈로그 저장 중 오류가 발생했습니다.\n오류 내용: ${err.message || err}`);
    }
  };

  const totalStonesQty = stoneRows.reduce((sum, r) => sum + (r.quantity || 0), 0);
  const totalStonesWeight = stoneRows.reduce((sum, r) => sum + (Number(r.weight || 0) * (r.quantity || 0)), 0);
  const totalBuyPriceSum = stoneRows.reduce((sum, r) => sum + (r.buy_price * (r.quantity || 0)), 0);
  const totalGrade1Sum = stoneRows.reduce((sum, r) => sum + ((r.grade_prices?.grade_1 || 0) * (r.quantity || 0)), 0);
  const totalGrade2Sum = stoneRows.reduce((sum, r) => sum + ((r.grade_prices?.grade_2 || 0) * (r.quantity || 0)), 0);
  const totalGrade3Sum = stoneRows.reduce((sum, r) => sum + ((r.grade_prices?.grade_3 || 0) * (r.quantity || 0)), 0);
  const totalGrade4Sum = stoneRows.reduce((sum, r) => sum + ((r.grade_prices?.grade_4 || 0) * (r.quantity || 0)), 0);
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
                        title="사진 삭제"
                      >
                        ✕
                      </button>
                      <button 
                        type="button" 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          setEditorOriginalSrc(images[0]);
                          setEditorRotation(0);
                          setEditorZoom(1.0);
                          setEditorOffsetX(0);
                          setEditorOffsetY(0);
                          setEditorBrightness(0);
                          setEditorContrast(0);
                          setIsEditorOpen(true);
                        }} 
                        style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0, 0, 0, 0.75)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                        title="사진 편집"
                      >
                        편집
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
                  <label style={{ display: 'block', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: '500' }}>제조코드(제조번호)</label>
                  <input type="text" value={manufacturerCode} onChange={e => setManufacturerCode(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px 10px', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: '500' }}>*모델번호</label>
                  <input type="text" value={modelNo} onChange={e => setModelNo(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px 10px', fontSize: '15px', border: '1px solid var(--border-color)', background: isEditMode ? 'rgba(0,0,0,0.05)' : 'var(--bg-surface)', textTransform: 'uppercase' }} required disabled={isEditMode} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: '500' }}>매입처</label>
                  <input type="text" value={vendor} onChange={e => setVendor(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px 10px', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: '500' }}>관련제품(세트)번호</label>
                  <input type="text" value={relatedSetNo} onChange={e => setRelatedSetNo(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px 10px', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: '500' }}>기본 중량(g)</label>
                  <input type="number" step="0.01" value={baseWeight} onChange={e => setBaseWeight(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px 10px', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', textAlign: 'right' }} />
                </div>
                <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: '500' }}>*모델분류</label>
                  <select value={category} onChange={e => { setCategory(e.target.value); setIsSet(e.target.value === 'Set'); }} className="input-field" style={{ width: '100%', padding: '5px', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                    <option value="Ring">반지 (Ring)</option>
                    <option value="Necklace">목걸이 (Necklace)</option>
                    <option value="Earring">귀걸이 (Earring)</option>
                    <option value="Set">세트상품 (Set)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: '500' }}>기본재질</label>
                  <select value={baseMaterial} onChange={e => setBaseMaterial(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                    <option value="14K">14K</option>
                    <option value="18K">18K</option>
                    <option value="24K">24K</option>
                    <option value="다이아">다이아</option>
                    <option value="은">은</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: '500' }}>단종여부</label>
                  <select value={discontinuedYn} onChange={e => setDiscontinuedYn(e.target.value)} className="input-field" style={{ width: '100%', padding: '5px', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                    <option value="N">N: 정상</option>
                    <option value="Y">Y: 단종</option>
                  </select>
                </div>
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
                        <select value={lf.color} onChange={e => handleLaborFeeChange(idx, 'color', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px 6px', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                          <option value="">전체색상</option>
                          <option value="G">G</option>
                          <option value="G/B">G/B</option>
                          <option value="G/P">G/P</option>
                          <option value="G/R/W">G/R/W</option>
                          <option value="G/W">G/W</option>
                          <option value="G/WP">G/WP</option>
                          <option value="P">P</option>
                          <option value="P/G">P/G</option>
                          <option value="P/W">P/W</option>
                          <option value="P/엔틱">P/엔틱</option>
                          <option value="W">W</option>
                          <option value="W/B">W/B</option>
                          <option value="W/G">W/G</option>
                          <option value="W/GP">W/GP</option>
                          <option value="W/P">W/P</option>
                          <option value="삼색">삼색</option>
                          <option value="엔틱">엔틱</option>
                        </select>
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input 
                          type="text" 
                          value={toCommaString(lf.cost === '0' || !lf.cost ? '' : lf.cost)} 
                          onChange={e => handleLaborFeeChange(idx, 'cost', String(fromCommaStringInt(e.target.value)))} 
                          onBlur={e => {
                            if (e.target.value.trim() === '') {
                              handleLaborFeeChange(idx, 'cost', '0');
                            }
                          }}
                          className="input-field" 
                          style={{ width: '100%', padding: '3px 6px', textAlign: 'right', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} 
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input 
                          type="text" 
                          value={toCommaString(lf.grade1 === '0' || !lf.grade1 ? '' : lf.grade1)} 
                          onChange={e => handleLaborFeeChange(idx, 'grade1', String(fromCommaStringInt(e.target.value)))} 
                          onBlur={e => {
                            if (e.target.value.trim() === '') {
                              handleLaborFeeChange(idx, 'grade1', '0');
                            }
                          }}
                          className="input-field" 
                          style={{ width: '100%', padding: '3px 6px', textAlign: 'right', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} 
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input 
                          type="text" 
                          value={toCommaString(lf.grade2 === '0' || !lf.grade2 ? '' : lf.grade2)} 
                          onChange={e => handleLaborFeeChange(idx, 'grade2', String(fromCommaStringInt(e.target.value)))} 
                          onBlur={e => {
                            if (e.target.value.trim() === '') {
                              handleLaborFeeChange(idx, 'grade2', '0');
                            }
                          }}
                          className="input-field" 
                          style={{ width: '100%', padding: '3px 6px', textAlign: 'right', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} 
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input 
                          type="text" 
                          value={toCommaString(lf.grade3 === '0' || !lf.grade3 ? '' : lf.grade3)} 
                          onChange={e => handleLaborFeeChange(idx, 'grade3', String(fromCommaStringInt(e.target.value)))} 
                          onBlur={e => {
                            if (e.target.value.trim() === '') {
                              handleLaborFeeChange(idx, 'grade3', '0');
                            }
                          }}
                          className="input-field" 
                          style={{ width: '100%', padding: '3px 6px', textAlign: 'right', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} 
                        />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input 
                          type="text" 
                          value={toCommaString(lf.grade4 === '0' || !lf.grade4 ? '' : lf.grade4)} 
                          onChange={e => handleLaborFeeChange(idx, 'grade4', String(fromCommaStringInt(e.target.value)))} 
                          onBlur={e => {
                            if (e.target.value.trim() === '') {
                              handleLaborFeeChange(idx, 'grade4', '0');
                            }
                          }}
                          className="input-field" 
                          style={{ width: '100%', padding: '3px 6px', textAlign: 'right', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} 
                        />
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
              기본 세팅 스톤 정보 (스톤 1~4행 설정)
            </span>
            <div className="catalog-stone-table-wrapper">
              <table className="catalog-stone-table stones-spec-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-main)', background: 'rgba(255, 255, 255, 0.04)', height: '28px' }}>
                    <th style={{ padding: '6px 4px', width: '65px', textAlign: 'center' }}>메인</th>
                    <th style={{ padding: '6px 4px', width: '150px' }}>스톤 종류</th>
                    <th style={{ padding: '6px 4px', width: '100px' }}>스톤 설명</th>
                    <th style={{ padding: '6px 4px', width: '40px', textAlign: 'right' }}>알수</th>
                    <th style={{ padding: '6px 4px', width: '65px', textAlign: 'center' }}>차감</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', width: '55px' }}>중량</th>
                    <th style={{ padding: '6px 4px', width: '65px', textAlign: 'center' }}>공임</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', width: '65px' }}>구매단가</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', color: 'var(--primary)', width: '60px' }}>1등급</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', color: 'var(--primary)', width: '60px' }}>2등급</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', color: 'var(--primary)', width: '60px' }}>3등급</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', color: 'var(--primary)', width: '60px' }}>4등급</th>
                  </tr>
                </thead>
                <tbody>
                  {stoneRows.map((row, idx) => (
                    <tr key={row.row_id} style={{ borderBottom: '1px solid var(--border-color)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.005)' : 'rgba(255,255,255,0.02)' }}>
                      {/* 메인 */}
                      <td style={{ padding: '2px' }}>
                        <select value={row.is_main} onChange={e => handleStoneRowChange(idx, 'is_main', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px 14px 3px 6px', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                          <option value="N">N</option>
                          <option value="Y">Y</option>
                        </select>
                      </td>
                      {/* 스톤 종류 */}
                      <td style={{ padding: '2px', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                          <input 
                            type="text" 
                            value={row.search_term || ''} 
                            placeholder="스톤 검색..."
                            onChange={e => {
                              const nextSearch = e.target.value;
                              const nextRows = [...stoneRows];
                              nextRows[idx] = { 
                                ...nextRows[idx], 
                                search_term: nextSearch,
                                is_dropdown_open: true 
                              };
                              if (nextSearch.trim() === '') {
                                nextRows[idx].stone_id = '';
                                nextRows[idx].weight = 0;
                                nextRows[idx].buy_price = 0;
                                nextRows[idx].grade_prices = { grade_1: 0, grade_2: 0, grade_3: 0, grade_4: 0 };
                              }
                              setStoneRows(nextRows);
                            }}
                            onFocus={() => {
                              const nextRows = [...stoneRows];
                              nextRows[idx] = { ...nextRows[idx], is_dropdown_open: true };
                              setStoneRows(nextRows);
                            }}
                            className="input-field" 
                            style={{ 
                              width: '100%', 
                              padding: '3px 20px 3px 6px',
                              fontSize: '15px', 
                              border: '1px solid var(--border-color)', 
                              background: 'var(--bg-surface)',
                              color: 'var(--text-main)'
                            }} 
                          />
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextRows = [...stoneRows];
                              nextRows[idx] = { ...nextRows[idx], is_dropdown_open: !nextRows[idx].is_dropdown_open };
                              setStoneRows(nextRows);
                            }}
                            style={{
                              position: 'absolute',
                              right: '4px',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '0 4px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: '100%'
                            }}
                          >
                            ▼
                          </button>
                        </div>

                        {row.is_dropdown_open && (
                          <>
                            <div 
                              onClick={() => {
                                const nextRows = [...stoneRows];
                                nextRows[idx] = { ...nextRows[idx], is_dropdown_open: false };
                                const matched = stones.find(s => s.name.toLowerCase() === (row.search_term || '').toLowerCase());
                                if (matched) {
                                  handleStoneRowChange(idx, 'stone_id', matched.stone_id);
                                } else if (!row.stone_id) {
                                  nextRows[idx].search_term = '';
                                  setStoneRows(nextRows);
                                }
                                setStoneRows(nextRows);
                              }}
                              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998, background: 'transparent' }} 
                            />
                            <div 
                              style={{ 
                                position: 'absolute', 
                                top: '100%', 
                                left: '2px', 
                                right: '2px', 
                                maxHeight: '200px', 
                                overflowY: 'auto', 
                                background: 'var(--bg-surface-solid)', 
                                border: '1px solid var(--primary)', 
                                borderRadius: '4px', 
                                zIndex: 9999, 
                                boxShadow: 'var(--glass-shadow)',
                                padding: '4px 0'
                              }}
                            >
                              {(() => {
                                const filterQuery = (row.search_term || '').toLowerCase().trim();
                                const filtered = stones.filter(s => s.name.toLowerCase().includes(filterQuery));
                                if (filtered.length === 0) {
                                  return (
                                    <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '14px' }}>
                                      검색된 스톤 없음
                                    </div>
                                  );
                                }
                                return filtered.map(s => (
                                  <div 
                                    key={s.stone_id}
                                    onClick={() => {
                                      handleStoneRowChange(idx, 'stone_id', s.stone_id);
                                    }}
                                    style={{ 
                                      padding: '6px 12px', 
                                      cursor: 'pointer', 
                                      fontSize: '14px',
                                      color: row.stone_id === s.stone_id ? 'var(--primary)' : 'var(--text-main)',
                                      background: row.stone_id === s.stone_id ? 'rgba(170, 133, 19, 0.1)' : 'transparent',
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(170, 133, 19, 0.18)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = row.stone_id === s.stone_id ? 'rgba(170, 133, 19, 0.1)' : 'transparent'; }}
                                  >
                                    {s.name} ({(s.weight_carat || 0).toFixed(3)}ct)
                                  </div>
                                ));
                              })()}
                            </div>
                          </>
                        )}
                      </td>
                      {/* 스톤 설명 */}
                      <td style={{ padding: '2px', width: '100px' }}>
                        <input type="text" value={row.description} onChange={e => handleStoneRowChange(idx, 'description', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px 6px', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} placeholder="메모" />
                      </td>
                      {/* 알수 */}
                      <td style={{ padding: '2px' }}>
                        <input 
                          type="number" 
                          min="0" 
                          value={row.quantity === 0 ? '' : row.quantity} 
                          onChange={e => handleStoneRowChange(idx, 'quantity', parseInt(e.target.value) || 0)} 
                          onBlur={e => {
                            if (e.target.value === '') {
                              handleStoneRowChange(idx, 'quantity', 0);
                            }
                          }}
                          className="input-field" 
                          style={{ width: '100%', padding: '3px', textAlign: 'right', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} 
                        />
                      </td>
                      {/* 차감 */}
                      <td style={{ padding: '2px' }}>
                        <select value={row.weight_deduction} onChange={e => handleStoneRowChange(idx, 'weight_deduction', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px 14px 3px 6px', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                          <option value="Y">Y</option>
                          <option value="N">N</option>
                        </select>
                      </td>
                      {/* 중량 */}
                      <td style={{ padding: '2px 4px', textAlign: 'right', color: 'var(--text-main)', fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: '500' }}>
                        {row.weight ? row.weight.toFixed(3) : '0.000'}
                      </td>
                      {/* 공임 */}
                      <td style={{ padding: '2px' }}>
                        <select value={row.labor_apply} onChange={e => handleStoneRowChange(idx, 'labor_apply', e.target.value)} className="input-field" style={{ width: '100%', padding: '3px 14px 3px 6px', fontSize: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                          <option value="Y">Y</option>
                          <option value="N">N</option>
                        </select>
                      </td>
                      {/* 구매단가 */}
                      <td style={{ padding: '2px 4px', textAlign: 'right', color: 'var(--text-main)', fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: '500' }}>
                        {row.buy_price.toLocaleString()}
                      </td>
                      
                      {/* 등급 단가 */}
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
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: '#b2ebf2', color: '#1e293b', fontWeight: '700', borderTop: '2px solid var(--border-color)' }}>
                  <tr style={{ height: '30px' }}>
                    <td style={{ padding: '4px' }}></td>
                    <td style={{ padding: '4px' }}></td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '14px', fontWeight: '700' }}>스톤합계:</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: '15px', fontFamily: 'var(--font-title)' }}>{totalStonesQty}</td>
                    <td style={{ padding: '4px' }}></td>
                    <td style={{ padding: '4px 4px', textAlign: 'right', fontSize: '15px', fontFamily: 'var(--font-title)' }}>
                      {totalStonesWeight.toFixed(3)}
                    </td>
                    <td style={{ padding: '4px' }}></td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: '15px', fontFamily: 'var(--font-title)' }}>{totalBuyPriceSum > 0 ? totalBuyPriceSum.toLocaleString() : '0'}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: '15px', fontFamily: 'var(--font-title)', color: 'var(--primary)' }}>{totalGrade1Sum > 0 ? totalGrade1Sum.toLocaleString() : '0'}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: '15px', fontFamily: 'var(--font-title)', color: 'var(--primary)' }}>{totalGrade2Sum > 0 ? totalGrade2Sum.toLocaleString() : '0'}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: '15px', fontFamily: 'var(--font-title)', color: 'var(--primary)' }}>{totalGrade3Sum > 0 ? totalGrade3Sum.toLocaleString() : '0'}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: '15px', fontFamily: 'var(--font-title)', color: 'var(--primary)' }}>{totalGrade4Sum > 0 ? totalGrade4Sum.toLocaleString() : '0'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="catalog-summary-bar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', background: 'rgba(0,0,0,0.03)', padding: '12px 16px', borderRadius: '4px', fontSize: '15px', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
              <div>알수소계: <strong>{totalStonesQty}개</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                중량소개: <strong>{totalStonesWeight.toFixed(3)}g</strong>
                <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>+</span>
                수동차감중량(입력): 
                <input 
                  type="number" 
                  step="0.001" 
                  value={manualDeductionWeight} 
                  onChange={e => setManualDeductionWeight(e.target.value)} 
                  onFocus={e => {
                    const valNum = parseFloat(manualDeductionWeight) || 0;
                    if (valNum === 0) {
                      setManualDeductionWeight('');
                    } else {
                      e.target.select();
                    }
                  }}
                  onBlur={e => {
                    if (e.target.value.trim() === '') {
                      setManualDeductionWeight('0.000');
                    } else {
                      const parsed = parseFloat(e.target.value) || 0;
                      setManualDeductionWeight(parsed.toFixed(3));
                    }
                  }}
                  className="input-field" 
                  style={{ width: '80px', padding: '3px 6px', fontSize: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', textAlign: 'right', borderRadius: '3px' }} 
                /> <span style={{ marginLeft: '2px' }}>g</span>
              </div>
              <div style={{ color: 'var(--warning)', fontWeight: '600' }}>
                = 총 차감중량: <strong>{totalDeductionWeight.toFixed(3)}g</strong>
              </div>
              <div style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '16px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                최종 금 중량(종합합계) = <strong>{finalTotalWeight.toFixed(3)}g</strong>
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
            <label style={{ display: 'block', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '4px' }}>기타 설명 및 사양 정보</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="input-field" style={{ width: '100%', height: '50px', resize: 'vertical', fontSize: '15px', padding: '6px' }} placeholder="제품 메모" />
          </div>

          <div className="catalog-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <button type="button" onClick={() => {
              if (window.opener) {
                window.close();
              } else {
                window.location.href = './';
              }
            }} className="btn-primary" style={{ padding: '6px 12px', background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
              닫기
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '6px 20px' }}>
              {isEditMode ? '카다로그 수정' : '카다로그 등록'}
            </button>
          </div>
        </form>
      </div>

      {/* 이미지 편집 모달 포탈/렌더러 */}
      {isEditorOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          padding: '16px'
        }}>
          <div style={{
            background: '#0f0f15',
            border: '1.5px solid var(--primary)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            color: 'var(--text-main)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: 'var(--primary)',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>📷 이미지 편집 및 자르기</span>
              <button 
                type="button" 
                onClick={handleCancelEdit} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <div 
              style={{ 
                position: 'relative',
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                background: '#050508', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                overflow: 'hidden', 
                width: '100%', 
                aspectRatio: '1',
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
            >
              <canvas 
                id="image-editor-canvas" 
                width={400} 
                height={400} 
                style={{ width: '100%', height: '100%', display: 'block' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
              />
              <div style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                background: 'rgba(0,0,0,0.6)',
                color: 'rgba(255,255,255,0.7)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                pointerEvents: 'none'
              }}>
                💡 드래그하여 이미지 이동
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              
              {/* Zoom Control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '60px', color: 'var(--text-muted)' }}>확대/축소</span>
                <input 
                  type="range" 
                  min="0.5" 
                  max="3.0" 
                  step="0.05" 
                  value={editorZoom} 
                  onChange={e => setEditorZoom(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--primary)' }}
                />
                <span style={{ width: '35px', textAlign: 'right' }}>{Math.round(editorZoom * 100)}%</span>
              </div>

              {/* Brightness Control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '60px', color: 'var(--text-muted)' }}>밝기 조절</span>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  step="5" 
                  value={editorBrightness} 
                  onChange={e => setEditorBrightness(parseInt(e.target.value, 10))}
                  style={{ flex: 1, accentColor: 'var(--primary)' }}
                />
                <span style={{ width: '35px', textAlign: 'right' }}>{editorBrightness > 0 ? `+${editorBrightness}` : editorBrightness}</span>
              </div>

              {/* Contrast Control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '60px', color: 'var(--text-muted)' }}>대비 조절</span>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  step="5" 
                  value={editorContrast} 
                  onChange={e => setEditorContrast(parseInt(e.target.value, 10))}
                  style={{ flex: 1, accentColor: 'var(--primary)' }}
                />
                <span style={{ width: '35px', textAlign: 'right' }}>{editorContrast > 0 ? `+${editorContrast}` : editorContrast}</span>
              </div>

              {/* Rotation & Reset Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setEditorRotation(prev => (prev + 90) % 360)}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    fontSize: '13px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'none',
                    cursor: 'pointer'
                  }}
                >
                  🔄 90° 회전
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditorZoom(1.0);
                    setEditorRotation(0);
                    setEditorOffsetX(0);
                    setEditorOffsetY(0);
                    setEditorBrightness(0);
                    setEditorContrast(0);
                  }}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    fontSize: '13px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'none',
                    cursor: 'pointer'
                  }}
                >
                  🧹 설정 초기화
                </button>
              </div>

            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  fontSize: '14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'none',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleApplyEdit}
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  fontSize: '14px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)',
                  color: '#000',
                  fontWeight: '700',
                  border: 'none',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                편집 적용하기
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
