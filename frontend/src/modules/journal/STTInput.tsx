import {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { MdMic, MdStop, MdAutorenew, MdClose } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import type { STTParseResult } from "@/types";

interface Props {
  onParsed: (result: STTParseResult) => void;
  parseSTT: (rawText: string) => Promise<STTParseResult | null>;
  transcribeAudio: (blob: Blob) => Promise<string | null>;
}

export type STTStatus = "idle" | "recording" | "transcribing" | "parsing";

export interface STTInputHandle {
  start: () => void;
}

// MediaRecorder가 지원하는 mimeType 찾기
function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const c of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(c)
    ) {
      return c;
    }
  }
  return "";
}

const STTInput = forwardRef<STTInputHandle, Props>(function STTInput(
  { onParsed, parseSTT, transcribeAudio },
  ref,
) {
  const [status, setStatus] = useState<STTStatus>("idle");
  const [level, setLevel] = useState<number>(0); // 0~1
  const [elapsed, setElapsed] = useState<number>(0); // seconds
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);

  const stopMeters = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setLevel(0);
    setElapsed(0);
  }, []);

  const cleanupStream = useCallback(() => {
    stopMeters();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
  }, [stopMeters]);

  const handleBlob = useCallback(
    async (blob: Blob) => {
      setStatus("transcribing");
      const text = await transcribeAudio(blob);
      if (!text) {
        setStatus("idle");
        return;
      }
      setStatus("parsing");
      const result = await parseSTT(text);
      if (result) onParsed(result);
      setStatus("idle");
    },
    [transcribeAudio, parseSTT, onParsed],
  );

  const startRecording = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const wasCancelled = cancelledRef.current;
        const chunks = chunksRef.current;
        const type = recorder.mimeType || mimeType || "audio/webm";
        cleanupStream();
        if (wasCancelled) {
          setStatus("idle");
          return;
        }
        if (chunks.length === 0) {
          setStatus("idle");
          return;
        }
        const blob = new Blob(chunks, { type });
        void handleBlob(blob);
      };

      recorder.start();
      recorderRef.current = recorder;
      setStatus("recording");

      // 볼륨 레벨 + 경과 시간 미터 시작
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;

        const buf = new Uint8Array(analyser.fftSize);
        const tick = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteTimeDomainData(buf);
          // RMS 계산 (0~1)
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          setLevel(Math.min(1, rms * 2.5));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // 메터 실패해도 녹음은 계속
      }

      startTsRef.current = Date.now();
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000));
      }, 250);
    } catch {
      cleanupStream();
      setStatus("idle");
    }
  }, [cleanupStream, handleBlob]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      cancelledRef.current = false;
      rec.stop();
    }
  }, []);

  const handleCancel = useCallback(() => {
    const rec = recorderRef.current;
    cancelledRef.current = true;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    } else {
      cleanupStream();
      setStatus("idle");
    }
  }, [cleanupStream]);

  useImperativeHandle(ref, () => ({ start: startRecording }), [startRecording]);

  const handleFABClick = useCallback(() => {
    if (status === "idle") {
      void startRecording();
    } else if (status === "recording") {
      stopRecording();
    }
  }, [status, startRecording, stopRecording]);

  const isSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof MediaRecorder !== "undefined";

  if (!isSupported) return null;

  const isBusy = status === "transcribing" || status === "parsing";

  return (
    <>
      {/* FAB */}
      {status === "idle" && (
        <button
          onClick={handleFABClick}
          className="fixed bottom-[88px] right-4 lg:bottom-8 lg:right-8 z-30
            h-12 px-5 rounded-full shadow-lg flex items-center justify-center gap-2
            bg-red-500 hover:bg-red-600 active:scale-95 cursor-pointer
            transition-colors duration-200"
        >
          <MdMic className="text-white text-xl" />
          <span className="text-white text-sm font-medium">영농일지 녹음</span>
        </button>
      )}

      {/* 녹음 중 / 전사 중 / 분석 중 — 오버레이 */}
      <AnimatePresence>
        {(status === "recording" || isBusy) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          >
            {/* 중앙 문구 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              {status === "recording" && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-white text-lg font-medium">
                    녹음 중입니다...
                  </p>
                  {/* 경과 시간 */}
                  <p className="text-white/90 text-3xl font-mono tabular-nums">
                    {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
                    {String(elapsed % 60).padStart(2, "0")}
                  </p>
                  {/* 볼륨 레벨 바 */}
                  <div className="w-56 h-3 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-red-400 transition-[width] duration-75"
                      style={{ width: `${Math.round(level * 100)}%` }}
                    />
                  </div>
                  <p className="text-white/70 text-xs">
                    말할 때 바가 움직이면 마이크가 정상입니다
                  </p>
                </div>
              )}
              {status === "transcribing" && (
                <>
                  <MdAutorenew className="text-white text-5xl animate-spin" />
                  <p className="text-white text-lg font-medium">
                    음성을 텍스트로 변환 중...
                  </p>
                </>
              )}
              {status === "parsing" && (
                <>
                  <MdAutorenew className="text-white text-5xl animate-spin" />
                  <p className="text-white text-lg font-medium">
                    AI가 분석하고 있습니다...
                  </p>
                </>
              )}
            </div>

            {/* 취소 + 정지 버튼 */}
            {status === "recording" && (
              <div className="fixed bottom-[88px] right-4 lg:bottom-8 lg:right-8 z-50 flex flex-col gap-2 items-end">
                <button
                  onClick={handleCancel}
                  className="h-12 px-5 rounded-full shadow-lg flex items-center justify-center gap-2
                    bg-white/90 cursor-pointer transition-colors hover:bg-white"
                >
                  <MdClose className="text-gray-600 text-xl" />
                  <span className="text-gray-600 text-sm font-medium">
                    녹음 취소
                  </span>
                </button>
                <button
                  onClick={stopRecording}
                  className="h-12 px-5 rounded-full shadow-lg flex items-center justify-center gap-2
                    bg-gray-700 cursor-pointer animate-pulse"
                >
                  <MdStop className="text-white text-xl" />
                  <span className="text-white text-sm font-medium">
                    녹음 중지
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default STTInput;
