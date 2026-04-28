import { useEffect } from "react";
import { MdClose } from "react-icons/md";

const API_BASE = "http://localhost:8000/api/v1";

interface Props {
  photoId: number;
  onClose: () => void;
}

export default function PhotoLightbox({ photoId, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
      >
        <MdClose className="text-2xl" />
      </button>
      <img
        src={`${API_BASE}/journal/photos/${photoId}`}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-lg cursor-default"
      />
    </div>
  );
}
