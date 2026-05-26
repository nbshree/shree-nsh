'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ImageCropperProps {
  imageUrl: string;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageCropper({ imageUrl, onCropComplete, onCancel }: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  // 加载图片获取原始尺寸
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 计算显示缩放比例
  useEffect(() => {
    if (containerRef.current && imageLoaded) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight - 100; // 减去底部按钮区域
      const scaleX = containerWidth / imageDimensions.width;
      const scaleY = containerHeight / imageDimensions.height;
      setScale(Math.min(scaleX, scaleY, 1));
    }
  }, [imageLoaded, imageDimensions]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDragStart({ x, y });
    setIsDragging(true);
    setCropArea({ x, y, width: 0, height: 0 });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = x - dragStart.x;
    const height = y - dragStart.y;

    setCropArea({
      x: width > 0 ? dragStart.x : x,
      y: height > 0 ? dragStart.y : y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // 执行裁剪
  const handleCrop = useCallback(() => {
    if (!cropArea || !imageRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 计算原始图片上的裁剪区域（考虑缩放）
    const realX = cropArea.x / scale;
    const realY = cropArea.y / scale;
    const realWidth = cropArea.width / scale;
    const realHeight = cropArea.height / scale;

    canvas.width = realWidth;
    canvas.height = realHeight;

    // 绘制原图
    const originalImg = new Image();
    originalImg.onload = () => {
      ctx.drawImage(
        originalImg,
        realX,
        realY,
        realWidth,
        realHeight,
        0,
        0,
        realWidth,
        realHeight
      );

      // 转换为File
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
          onCropComplete(croppedFile);
        }
      }, 'image/jpeg', 0.9);
    };
    originalImg.src = imageUrl;
  }, [cropArea, scale, imageUrl, onCropComplete]);

  // 不裁剪直接使用原图
  const handleUseOriginal = useCallback(() => {
    // 将原图url转为File
    fetch(imageUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'original-image.jpg', { type: 'image/jpeg' });
        onCropComplete(file);
      });
  }, [imageUrl, onCropComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-slate-800 rounded-xl p-4 max-w-[90vw] max-h-[90vh] flex flex-col">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-white">裁剪图片</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 提示 */}
        <p className="text-gray-300 text-sm mb-3">
          拖拽框选需要解析的区域，或点击"使用原图"直接上传整张图片
        </p>

        {/* 图片裁剪区域 */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden rounded-lg bg-slate-900"
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {imageLoaded && (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="裁剪图片"
              style={{
                width: imageDimensions.width * scale,
                height: imageDimensions.height * scale,
              }}
              className="cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              draggable={false}
            />
          )}

          {/* 裁剪框 */}
          {cropArea && cropArea.width > 0 && cropArea.height > 0 && (
            <div
              className="absolute border-2 border-purple-500 bg-purple-500/20 pointer-events-none"
              style={{
                left: cropArea.x,
                top: cropArea.y,
                width: cropArea.width,
                height: cropArea.height,
              }}
            >
              <div className="absolute top-0 left-0 w-2 h-2 bg-purple-500" />
              <div className="absolute top-0 right-0 w-2 h-2 bg-purple-500" />
              <div className="absolute bottom-0 left-0 w-2 h-2 bg-purple-500" />
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-purple-500" />
            </div>
          )}
        </div>

        {/* 尺寸信息 */}
        {cropArea && cropArea.width > 0 && cropArea.height > 0 && (
          <div className="text-gray-400 text-xs mt-2">
            裁剪区域: {Math.round(cropArea.width / scale)} × {Math.round(cropArea.height / scale)} 像素
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleUseOriginal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            使用原图
          </button>
          <button
            onClick={handleCrop}
            disabled={!cropArea || cropArea.width < 10 || cropArea.height < 10}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确定裁剪
          </button>
        </div>
      </div>
    </div>
  );
}