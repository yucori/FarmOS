import { useState } from 'react';
import { MdDescription, MdCheckCircle, MdWarning, MdDownload } from 'react-icons/md';
import { DOCUMENT_TEMPLATES, SUBSIDY_MATCHES, GENERATED_DOCUMENTS } from '@/mocks/documents';
import type { DocumentTemplate } from '@/types';

export default function DocumentsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [showGenerated, setShowGenerated] = useState(true);

  return (
    <div className="space-y-6">
      {/* Subsidy Matching */}
      <div className="card">
        <h3 className="section-title mb-4">지원금 매칭 결과</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SUBSIDY_MATCHES.map(s => (
            <div key={s.id} className="p-4 rounded-xl border border-gray-100">
              <div className="flex items-start justify-between">
                <h4 className="font-semibold text-gray-900 text-sm">{s.name}</h4>
                <span className={`badge text-xs ${
                  s.status === '신청가능' ? 'badge-success' :
                  s.status === '마감임박' ? 'badge-warning' : 'badge-danger'
                }`}>
                  {s.status}
                </span>
              </div>

              {/* Eligibility Score Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>적격도</span>
                  <span className="font-bold text-primary">{s.eligibilityScore}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div
                    className={`h-full rounded-full ${
                      s.eligibilityScore >= 90 ? 'bg-success' :
                      s.eligibilityScore >= 70 ? 'bg-primary' : 'bg-warning'
                    }`}
                    style={{ width: `${s.eligibilityScore}%` }}
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600 mt-2">지원금: {s.amount}</p>
              <p className="text-xs text-gray-400 mt-1">마감: {s.deadline}</p>

              <div className="mt-2">
                <p className="text-xs text-gray-500">충족 조건:</p>
                {s.matchedCriteria.map((c, i) => (
                  <div key={i} className="flex items-center gap-1 mt-0.5">
                    <MdCheckCircle className="text-success text-sm" />
                    <span className="text-xs text-gray-600">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document Templates */}
      <div className="card">
        <h3 className="section-title mb-4">서류 템플릿</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DOCUMENT_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => { setSelectedTemplate(t); setShowGenerated(false); }}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedTemplate?.id === t.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-100 hover:border-primary/30'
              }`}
            >
              <MdDescription className="text-2xl text-primary mb-2" />
              <h4 className="font-semibold text-gray-900 text-sm">{t.name}</h4>
              <p className="text-xs text-gray-500 mt-1">{t.description}</p>
              <p className="text-xs text-gray-400 mt-2">
                필수 항목 {t.requiredFields.length}개 중 자동완성 {t.requiredFields.filter(f => f.isAvailableFromProfile).length}개
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Template Detail */}
      {selectedTemplate && !showGenerated && (
        <div className="card">
          <h3 className="section-title mb-4">{selectedTemplate.name} — 필수 항목</h3>
          <div className="space-y-2">
            {selectedTemplate.requiredFields.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                {f.isAvailableFromProfile ? (
                  <MdCheckCircle className="text-success text-lg flex-shrink-0" />
                ) : (
                  <MdWarning className="text-warning text-lg flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{f.label}</p>
                  <p className="text-xs text-gray-400">
                    {f.isAvailableFromProfile ? '프로필에서 자동 입력' : '직접 입력 필요'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowGenerated(true)}
            className="btn-primary mt-4 w-full"
          >
            서류 생성하기
          </button>
        </div>
      )}

      {/* Generated Documents */}
      {showGenerated && (
        <div className="card">
          <h3 className="section-title mb-4">생성된 서류</h3>
          {GENERATED_DOCUMENTS.length === 0 ? (
            <p className="text-gray-400 text-center py-6">생성된 서류가 없습니다</p>
          ) : (
            <div className="space-y-3">
              {GENERATED_DOCUMENTS.map(doc => (
                <div key={doc.id} className="p-4 rounded-xl border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{doc.title}</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        생성일: {new Date(doc.generatedAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge-success text-xs">
                        완성도 {doc.completeness}%
                      </span>
                    </div>
                  </div>

                  {/* Field Preview */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {Object.entries(doc.fields).slice(0, 6).map(([key, val]) => (
                      <div key={key} className="p-2 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-400">{key}</p>
                        <p className="text-sm text-gray-700 truncate">{val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button className="btn-primary flex-1 !min-h-[44px]">
                      <MdDownload /> 다운로드
                    </button>
                    <button className="btn-outline flex-1 !min-h-[44px]">
                      미리보기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
