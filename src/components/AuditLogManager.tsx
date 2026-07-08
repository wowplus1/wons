import React, { useState, useEffect } from 'react';
import { useErpStore } from '../store/useErpStore';
import { Shield, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';

export const AuditLogManager: React.FC = () => {
  const { auditLogs, fetchDb, restoreFromAuditLog } = useErpStore();
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    fetchDb(['audit_logs']);
  }, [fetchDb]);

  const toggleExpand = (logId: string) => {
    if (expandedLogId === logId) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(logId);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <span style={{ display: 'inline-block', fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: '600' }}>신설</span>;
      case 'modify':
        return <span style={{ display: 'inline-block', fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontWeight: '600' }}>수정</span>;
      case 'delete':
        return <span style={{ display: 'inline-block', fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: '600' }}>삭제</span>;
      default:
        return <span style={{ display: 'inline-block', fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', fontWeight: '600' }}>{action}</span>;
    }
  };

  const formatJson = (valStr?: string) => {
    if (!valStr) return '없음';
    try {
      const obj = JSON.parse(valStr);
      return JSON.stringify(obj, null, 2);
    } catch {
      return valStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={22} style={{ color: 'var(--primary)' }} />
          시스템 감사 로그 (Audit Log)
        </h2>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          총 {auditLogs.length}건의 시스템 변경 이력이 기록되었습니다.
        </span>
      </div>

      <div className="glass-panel" style={{ padding: '0px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left', background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', width: '180px' }}>일시</th>
                <th style={{ padding: '12px 16px', width: '80px' }}>구분</th>
                <th style={{ padding: '12px 16px', width: '100px' }}>작업자</th>
                <th style={{ padding: '12px 16px' }}>변경 내용 설명</th>
                <th style={{ padding: '12px 16px', width: '120px', textAlign: 'center' }}>데이터 상세</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    아직 등록된 감사 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                auditLogs.map(log => {
                  const isExpanded = expandedLogId === log.log_id;
                  const hasDetails = log.before_value || log.after_value;

                  return (
                    <React.Fragment key={log.log_id}>
                      <tr 
                        style={{ 
                          borderBottom: '1px solid var(--border-color)', 
                          background: isExpanded ? 'rgba(0,0,0,0.01)' : 'transparent',
                          cursor: hasDetails ? 'pointer' : 'default'
                        }}
                        onClick={() => hasDetails && toggleExpand(log.log_id)}
                      >
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={13} />
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {getActionBadge(log.action_type)}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '500' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={13} style={{ color: 'var(--text-muted)' }} />
                            {log.operator}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-main)' }}>
                          {log.description}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {hasDetails ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(log.log_id);
                              }}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--primary)', 
                                cursor: 'pointer', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                fontSize: '13px',
                                fontWeight: '600'
                              }}
                            >
                              상세보기 {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>없음</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasDetails && (
                        <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                          <td colSpan={5} style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div>
                                <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>변경 전 데이터 스냅샷</h4>
                                <pre style={{ 
                                  margin: 0, 
                                  padding: '12px', 
                                  background: 'var(--bg-app)', 
                                  border: '1px solid var(--border-color)', 
                                  borderRadius: '6px', 
                                  overflowX: 'auto',
                                  fontSize: '12px',
                                  fontFamily: 'Consolas, monospace',
                                  color: 'var(--text-main)',
                                  maxHeight: '200px',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {formatJson(log.before_value)}
                                </pre>
                              </div>
                              <div>
                                <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>변경 후 데이터 스냅샷</h4>
                                <pre style={{ 
                                  margin: 0, 
                                  padding: '12px', 
                                  background: 'var(--bg-app)', 
                                  border: '1px solid var(--border-color)', 
                                  borderRadius: '6px', 
                                  overflowX: 'auto',
                                  fontSize: '12px',
                                  fontFamily: 'Consolas, monospace',
                                  color: 'var(--text-main)',
                                  maxHeight: '200px',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {formatJson(log.after_value)}
                                </pre>
                              </div>
                            </div>
                            
                            {/* 복원(되돌리기) 실행 영역 */}
                            {log.before_value && (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const confirmRestore = window.confirm(
                                      `⚠️ 경고: 정말로 이 감사 로그(ID: ${log.log_id})를 기준으로 데이터를 복구하시겠습니까?\n\n` +
                                      `대상 유형: ${log.target_type === 'customer' ? '거래처' : (log.target_type === 'order' ? '주문서' : '금시세')}\n` +
                                      `현재의 실제 데이터가 과거 시점의 스냅샷 데이터로 강제 변경됩니다.`
                                    );
                                    if (confirmRestore) {
                                      const success = await restoreFromAuditLog(log.log_id);
                                      if (success) {
                                        alert("이전 상태로 데이터를 성공적으로 되돌렸습니다!");
                                        setExpandedLogId(null);
                                      } else {
                                        alert("데이터 되돌리기에 실패했습니다. 권한 및 데이터를 확인해 주십시오.");
                                      }
                                    }
                                  }}
                                  className="btn-primary"
                                  style={{
                                    padding: '8px 16px',
                                    fontSize: '13.5px',
                                    fontWeight: '700',
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)'
                                  }}
                                >
                                  🔄 이 시점 데이터로 되돌리기 (롤백)
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
