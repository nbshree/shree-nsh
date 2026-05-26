'use client';

import { useState, useRef, useCallback } from 'react';
import { compressImage } from '@/lib/imageCompress';

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'compressing' | 'processing' | 'done' | 'error';
  error?: string;
}

interface MultiImageUploadProps {
  onImagesUpload: (files: File[]) => void;
  images: ImageItem[];
  onRemoveImage: (id: string) => void;
}

export default function MultiImageUpload({ onImagesUpload, images, onRemoveImage }: MultiImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = useCallback(async (files: FileList) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      // 压缩所有图片
      const compressedFiles: File[] = [];
      for (const file of validFiles) {
        try {
          const compressed = await compressImage(file);
          console.log(`压缩: ${(file.size / 1024).toFixed(0)}KB -> ${(compressed.size / 1024).toFixed(0)}KB`);
          compressedFiles.push(compressed);
        } catch (error) {
          console.error('压缩失败，使用原图:', error);
          compressedFiles.push(file);
        }
      }
      onImagesUpload(compressedFiles);
    }
  }, [onImagesUpload]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesSelect(files);
    }
    // 重置input以允许重复选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFilesSelect]);

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

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFilesSelect(files);
    }
  }, [handleFilesSelect]);

  const handleImageClick = useCallback((url: string) => {
    setModalImageUrl(url);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setModalImageUrl(null);
  }, []);

  const isProcessing = images.some(img => img.status === 'processing');

  return (
    <>
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 shadow-xl border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">上传多张截图对比</h2>

        <div
          className={`relative border-2 rounded-xl p-8 transition-all ${
            isDragging
              ? 'border-purple-400 bg-purple-500/20'
              : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
          } ${isProcessing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleInputChange}
            className="hidden"
          />

          {images.length === 0 ? (
            <div className="text-center">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-gray-300 mb-2">
                点击或拖拽上传多张内功属性截图
              </p>
              <p className="text-gray-400 text-sm">
                支持 PNG、JPG、JPEG 格式，可同时上传多张
              </p>
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm">
              <p>继续上传更多图片 或 点击下方查看已上传的图片</p>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
              <div className="text-center">
                <div className="animate-spin text-4xl mb-2">⚙️</div>
                <p className="text-white">AI 正在解析图片...</p>
              </div>
            </div>
          )}
        </div>

        {/* 已上传的图片列表 */}
        {images.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">
              已上传 {images.length} 张图片
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative bg-white/5 rounded-lg overflow-hidden border border-white/10"
                >
                  <img
                    src={image.previewUrl}
                    alt="预览"
                    className="w-full h-24 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleImageClick(image.previewUrl)}
                  />

                  {/* 状态指示 */}
                  {image.status === 'processing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="animate-spin text-xl">⚙️</div>
                    </div>
                  )}
                  {image.status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/50">
                      <div className="text-xl">❌</div>
                    </div>
                  )}
                  {image.status === 'done' && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}

                  {/* 删除按钮 */}
                  <button
                    onClick={() => onRemoveImage(image.id)}
                    className="absolute bottom-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center text-xs text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 图片放大预览模态框 */}
      {showModal && modalImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={modalImageUrl}
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