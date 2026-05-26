'use client';

import { useState, useCallback, useEffect } from 'react';
import ImageCropper from './ImageCropper';

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  croppedFile?: File;
  croppedPreviewUrl?: string;  // 裁剪后的预览URL
  needsCrop: boolean;
}

interface BatchImageModalProps {
  images: ImageItem[];
  onConfirm: (items: { file: File; previewUrl: string; id: string }[]) => void;
  onCancel: () => void;
}

export default function BatchImageModal({ images, onConfirm, onCancel }: BatchImageModalProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [imageList, setImageList] = useState<ImageItem[]>(images);

  // 初始化时为每张图片设置默认的croppedFile为原图
  useEffect(() => {
    setImageList(prev =>
      prev.map(img => ({
        ...img,
        croppedFile: img.file,
        croppedPreviewUrl: img.previewUrl,
        needsCrop: true,
      }))
    );
  }, []);

  // 点击图片进行裁剪
  const handleImageClick = useCallback((imageId: string) => {
    setSelectedImageId(imageId);
    setShowCropper(true);
  }, []);

  // 裁剪完成 - 更新为裁剪后的图片
  const handleCropComplete = useCallback((croppedFile: File) => {
    // 为裁剪后的图片创建新的预览URL
    const croppedPreviewUrl = URL.createObjectURL(croppedFile);

    setImageList(prev =>
      prev.map(img =>
        img.id === selectedImageId
          ? {
              ...img,
              croppedFile,
              croppedPreviewUrl,
              needsCrop: false,
              isCropped: true,  // 标记为已裁剪（不是使用原图）
            }
          : img
      )
    );
    setShowCropper(false);
    setSelectedImageId(null);
  }, [selectedImageId]);

  // 取消裁剪
  const handleCropCancel = useCallback(() => {
    setShowCropper(false);
    setSelectedImageId(null);
  }, []);

  // 使用原图（不裁剪）
  const handleUseOriginal = useCallback((imageId: string) => {
    setImageList(prev =>
      prev.map(img =>
        img.id === imageId
          ? {
              ...img,
              croppedFile: img.file,
              croppedPreviewUrl: img.previewUrl,
              needsCrop: false,
              isCropped: false,  // 标记为使用原图
            }
          : img
      )
    );
  }, []);

  // 确认上传 - 传递裁剪后的文件和预览URL
  const handleConfirm = useCallback(() => {
    const items = imageList.map(img => ({
      id: img.id,
      file: img.croppedFile || img.file,
      previewUrl: img.croppedPreviewUrl || img.previewUrl,
    }));
    onConfirm(items);
  }, [imageList, onConfirm]);

  // 移除图片
  const handleRemoveImage = useCallback((imageId: string) => {
    setImageList(prev => prev.filter(img => img.id !== imageId));
  }, []);

  // 全部使用原图
  const handleUseAllOriginal = useCallback(() => {
    setImageList(prev =>
      prev.map(img => ({
        ...img,
        croppedFile: img.file,
        croppedPreviewUrl: img.previewUrl,
        needsCrop: false,
        isCropped: false,
      }))
    );
  }, []);

  const selectedImage = imageList.find(img => img.id === selectedImageId);

  return (
    <>
      {/* 批量图片管理弹窗 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="relative bg-slate-800 rounded-xl p-5 max-w-[700px] w-[90vw] max-h-[80vh] flex flex-col">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">批量图片管理</h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-white transition-colors text-xl"
            >
              ✕
            </button>
          </div>

          {/* 提示 */}
          <p className="text-gray-300 text-sm mb-3">
            点击图片可裁剪解析区域，裁剪后预览图会更新。或点击"原图"按钮直接使用整张图片。
          </p>

          {/* 图片列表 */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {imageList.map((image, index) => (
                <div
                  key={image.id}
                  className={`relative bg-white/5 rounded-lg overflow-hidden border transition-colors ${
                    image.isCropped
                      ? 'border-purple-500/50'
                      : image.needsCrop
                        ? 'border-white/10'
                        : 'border-blue-500/30'
                  }`}
                >
                  {/* 图片预览 - 使用裁剪后的预览URL */}
                  <img
                    src={image.croppedPreviewUrl || image.previewUrl}
                    alt={`图片 ${index + 1}`}
                    className="w-full h-20 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleImageClick(image.id)}
                  />

                  {/* 序号标记 */}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white">
                    #{index + 1}
                  </div>

                  {/* 状态标记 */}
                  {image.isCropped && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-purple-500/80 rounded text-xs text-white">
                      已裁剪
                    </div>
                  )}
                  {!image.needsCrop && !image.isCropped && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-blue-500/80 rounded text-xs text-white">
                      原图
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1 p-1 bg-black/60">
                    <button
                      onClick={() => handleImageClick(image.id)}
                      className="px-1.5 py-0.5 bg-purple-600/80 hover:bg-purple-600 text-white text-xs rounded transition-colors"
                    >
                      裁剪
                    </button>
                    <button
                      onClick={() => handleUseOriginal(image.id)}
                      className="px-1.5 py-0.5 bg-blue-600/80 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                    >
                      原图
                    </button>
                    <button
                      onClick={() => handleRemoveImage(image.id)}
                      className="px-1.5 py-0.5 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 底部操作 */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/10">
            <div className="text-gray-400 text-xs">
              共 {imageList.length} 张图片，
              {imageList.filter(img => img.isCropped).length} 张已裁剪，
              {imageList.filter(img => !img.needsCrop && !img.isCropped).length} 张用原图
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUseAllOriginal}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                全部使用原图
              </button>
              <button
                onClick={handleConfirm}
                disabled={imageList.length === 0}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认上传 ({imageList.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 裁剪弹窗 */}
      {showCropper && selectedImage && (
        <ImageCropper
          imageUrl={selectedImage.previewUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}