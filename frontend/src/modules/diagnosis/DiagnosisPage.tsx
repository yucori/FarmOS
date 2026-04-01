import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { MdCameraAlt, MdHistory, MdWarning, MdCheckCircle, MdError } from 'react-icons/md';
import { DIAGNOSIS_RESULTS, TREATMENT_RECOMMENDATIONS } from '@/mocks/diagnosis';
import type { DiagnosisResult } from '@/types';

function ConfidenceGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.8 ? 'text-success' : value >= 0.6 ? 'text-warning' : 'text-danger';
  const label = value >= 0.8 ? '높은 신뢰도' : value >= 0.6 ? '확인 권장' : '전문가 확인 필요';
  const Icon = value >= 0.8 ? MdCheckCircle : value >= 0.6 ? MdWarning : MdError;

  return (
    <div className={`flex items-center gap-2 ${color}`}>
      <Icon className="text-xl" />
      <div>
        <span className="font-bold text-lg">{pct}%</span>
        <span className="text-sm ml-1">{label}</span>
      </div>
    </div>
  );
}

export default function DiagnosisPage() {
  const [selectedResult, setSelectedResult] = useState<DiagnosisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  const onDrop = useCallback((_files: File[]) => {
    setIsAnalyzing(true);
    setShowHistory(false);
    setTimeout(() => {
      const nextIdx = Math.floor(Math.random() * DIAGNOSIS_RESULTS.length);
      setSelectedResult(DIAGNOSIS_RESULTS[nextIdx]);
      setIsAnalyzing(false);
    }, 2500);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
    maxFiles: 1,
  });

  const treatment = selectedResult?.treatmentId
    ? TREATMENT_RECOMMENDATIONS[selectedResult.treatmentId]
    : null;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`card border-2 border-dashed cursor-pointer transition-colors text-center py-12 ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <MdCameraAlt className="text-5xl text-gray-400 mx-auto mb-3" />
        <p className="text-lg font-semibold text-gray-700">
          {isDragActive ? '여기에 놓으세요!' : '사진을 촬영하거나 업로드하세요'}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          작물 사진을 드래그하거나 클릭하여 AI 진단을 시작합니다
        </p>
        <button className="btn-primary mt-4 mx-auto">
          <MdCameraAlt /> 사진 선택
        </button>
      </div>

      {/* Analyzing State — with progress animation */}
      <AnimatePresence>
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="card text-center py-12"
        >
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <div className="absolute inset-2 animate-spin rounded-full border-4 border-primary-light/20 border-b-primary-light" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <MdCameraAlt className="text-2xl text-primary" />
            </div>
          </div>
          <p className="mt-5 text-xl font-bold text-gray-800">AI가 분석 중입니다...</p>
          <p className="text-base text-gray-500 mt-1">Qwen2.5-VL 모델이 이미지를 검사하고 있습니다</p>
          <div className="mt-4 max-w-xs mx-auto">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '90%' }}
                transition={{ duration: 2.5, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Diagnosis Result — animated reveal */}
      {selectedResult && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="space-y-4">
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <span className={`badge ${
                  selectedResult.severity === '심각' ? 'badge-danger' :
                  selectedResult.severity === '중증' ? 'badge-warning' : 'badge-success'
                }`}>
                  {selectedResult.severity}
                </span>
                <h3 className="text-xl font-bold mt-2">{selectedResult.pestName}</h3>
                <p className="text-gray-500">{selectedResult.cropName}</p>
              </div>
              <ConfidenceGauge value={selectedResult.confidence} />
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-600">피해 상황</p>
              <p className="text-gray-800 mt-1">{selectedResult.affectedArea}</p>
            </div>

            {/* Guardrail Badge */}
            {selectedResult.guardrailTriggered ? (
              <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 rounded-xl">
                <MdWarning className="text-danger text-xl" />
                <div>
                  <p className="text-sm font-semibold text-danger">가드레일 발동</p>
                  <p className="text-xs text-gray-600">신뢰도가 낮아 전문가 확인이 필요합니다</p>
                </div>
                <button className="ml-auto btn-big bg-danger text-white text-sm !min-h-[40px] !px-4">
                  전문가 연결
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <MdCheckCircle className="text-success" />
                <span className="text-sm text-green-700">AI 응답 검증됨</span>
              </div>
            )}
          </div>

          {/* Treatment */}
          {treatment && (
            <div className="card">
              <h3 className="section-title">방제 추천</h3>
              <p className="text-gray-600 mt-2">{treatment.method}</p>

              <div className="mt-4 space-y-3">
                <h4 className="font-medium text-gray-700">등록 농약</h4>
                {treatment.registeredPesticides.map((p, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl">
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-500">
                      희석: {p.dosage} · 살포 간격: {p.interval}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="font-medium text-blue-800">살포 시기</p>
                  <p className="text-blue-600">{treatment.applicationTiming}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <p className="font-medium text-amber-800">안전 사용 기준</p>
                  <p className="text-amber-600">{treatment.safetyPeriod}</p>
                </div>
              </div>

              <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm">
                <p className="font-medium text-gray-600">혼용 정보</p>
                <p className="text-gray-800">{treatment.mixingNotes}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* History */}
      {showHistory && !isAnalyzing && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <MdHistory className="text-xl text-gray-500" />
            <h3 className="section-title">진단 이력</h3>
          </div>
          <div className="space-y-3">
            {DIAGNOSIS_RESULTS.map(r => (
              <button
                key={r.id}
                onClick={() => { setSelectedResult(r); setShowHistory(false); }}
                className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-primary/20 hover:bg-primary/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`badge text-xs ${
                        r.severity === '심각' ? 'badge-danger' :
                        r.severity === '중증' ? 'badge-warning' : 'badge-success'
                      }`}>
                        {r.severity}
                      </span>
                      <span className="font-semibold">{r.pestName}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {new Date(r.timestamp).toLocaleDateString('ko-KR')} · 신뢰도 {Math.round(r.confidence * 100)}%
                    </p>
                  </div>
                  {r.guardrailTriggered && <MdWarning className="text-danger text-xl" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
