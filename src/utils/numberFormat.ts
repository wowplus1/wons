// src/utils/numberFormat.ts

/**
 * 숫자를 천 단위 구분 쉼표(,)가 포함된 문자열로 포맷팅합니다.
 * @param val 변환할 숫자 혹은 문자열
 */
export const toCommaString = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  // 숫자, 소수점, 음수 부호 이외의 모든 문자(콤마 등) 제거
  const clean = val.toString().replace(/[^0-9.-]/g, '');
  const parts = clean.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

/**
 * 쉼표가 포함된 문자열에서 쉼표를 제거하고 정수로 파싱합니다.
 * @param val 쉼표가 포함된 문자열
 */
export const fromCommaStringInt = (val: string): number => {
  const clean = val.replace(/,/g, '');
  return parseInt(clean, 10) || 0;
};
