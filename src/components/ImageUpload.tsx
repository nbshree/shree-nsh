'use client';

import { useState, useRef, useCallback } from 'react';
import { compressImage } from '@/lib/imageCompress';

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  isProcessing: boolean;
}

export default function ImageUpload({ onImageUpload, isProcessing }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    // 创建预览（使用原图）
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // 压缩图片
    setIsCompressing(true);
    try {
      const compressedFile = await compressImage(file);
      console.log(`压缩: ${(file.size / 1024).toFixed(0)}KB -> ${(compressedFile.size / 1024).toFixed(0)}KB`);
      onImageUpload(compressedFile);
    } catch (error) {
      console.error('压缩失败，使用原图:', error);
      onImageUpload(file);
    } finally {
      setIsCompressing(false);
    }
  }, [onImageUpload]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleReupload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  return (
    <>
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 shadow-xl border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">上传截图解析</h2>

        <div
          className={`relative border-2 rounded-xl p-8 transition-all ${
            isDragging
              ? 'border-purple-400 bg-purple-500/20'
              : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
          } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />

          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="预览图片"
                className="max-h-64 mx-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleImageClick}
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={handleReupload}
                  className="px-3 py-1 bg-blue-500/80 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                >
                  重新上传
                </button>
                <button
                  onClick={handleClear}
                  className="px-3 py-1 bg-red-500/80 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                >
                  清除
                </button>
              </div>
              <p className="text-center text-gray-400 text-xs mt-2">点击图片可放大预览</p>
            </div>
          ) : (
            <div
              className="text-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-6xl mb-4">📷</div>
              <p className="text-gray-300 mb-2">
                点击或拖拽上传内功属性截图
              </p>
              <p className="text-gray-400 text-sm">
                支持 PNG、JPG、JPEG 格式
              </p>
            </div>
          )}

          {(isProcessing || isCompressing) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
              <div className="text-center">
                <div className="animate-spin text-4xl mb-2">⚙️</div>
                <p className="text-white">
                  {isCompressing ? '正在压缩图片...' : 'AI 正在解析图片...'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 图片放大预览模态框 */}
      {showModal && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={previewUrl}
              alt="放大预览"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            />
            <button
              onClick={handleCloseModal}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}