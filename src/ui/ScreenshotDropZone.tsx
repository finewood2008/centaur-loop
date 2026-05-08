import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Camera } from 'lucide-react';

interface ScreenshotDropZoneProps {
  onScreenshot: (base64: string) => void;
  processing: boolean;
}

export default function ScreenshotDropZone({ onScreenshot, processing }: ScreenshotDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') onScreenshot(reader.result);
      };
      reader.readAsDataURL(file);
    },
    [onScreenshot],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) handleFile(file);
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleFile]);

  return (
    <div
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${
        dragOver
          ? 'border-terracotta bg-terracotta/5'
          : 'border-border-cream bg-ivory/50 hover:border-terracotta/30'
      }`}
    >
      {processing ? (
        <>
          <Loader2 size={24} className="animate-spin text-terracotta" />
          <span className="text-sm text-olive-gray">正在识别截图数据…</span>
        </>
      ) : (
        <>
          <Camera size={24} className="text-stone-gray" />
          <span className="text-sm text-olive-gray">拖入或粘贴平台数据截图</span>
          <span className="text-xs text-stone-gray">支持 Ctrl+V 粘贴</span>
        </>
      )}
    </div>
  );
}
