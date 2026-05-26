'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import BatchImageModal from '@/components/BatchImageModal';
import ImageCropper from '@/components/ImageCropper';
import { compressImage } from '@/lib/imageCompress';
import { ParseResult } from '@/lib/constants';
import { calculateAllAttributes, getEvaluation, CalculationResult } from '@/lib/calculator';

// 待裁剪的图片
interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

// 解析结果（包含loading状态）
interface ResultItem {
  id: string;
  previewUrl: string;
  name: string;
  attributes?: ParseResult;
  calculation?: CalculationResult;
  evaluation?: string;
  status: 'loading' | 'done' | 'error';
  error?: string;
}

export default function ComparePage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSingleCropper, setShowSingleCropper] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [singleCropImage, setSingleCropImage] = useState<PendingImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 处理文件选择 - 不阻止继续上传
  const handleFilesSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => f.type.startsWith('image/'));

    if (validFiles.length === 0) return;

    const newImages: PendingImage[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPendingImages(newImages);

    if (newImages.length > 1) {
      setShowBatchModal(true);
    } else if (newImages.length === 1) {
      setSingleCropImage(newImages[0]);
      setShowSingleCropper(true);
    }
  }, []);

  // 输入框选择
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesSelect(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFilesSelect]);

  // 拖拽处理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesSelect(files);
    }
  }, [handleFilesSelect]);

  // 粘贴图片处理 - 跳过裁剪直接使用原图
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) return;

        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const previewUrl = URL.createObjectURL(file);

        // 添加loading状态
        setResults(prev => [...prev, {
          id,
          previewUrl,
          name: '解析中...',
          status: 'loading',
        }]);

        // 压缩并解析
        let finalFile = file;
        try {
          finalFile = await compressImage(file);
        } catch {
          // 使用原文件
        }

        try {
          const formData = new FormData();
          formData.append('image', finalFile);

          const response = await fetch('/api/parse-image', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error || '解析失败');
          }

          const attributes: ParseResult = data.data;
          const calculation = calculateAllAttributes(attributes);
          const evaluation = getEvaluation(calculation.totalScore);

          setResults(prev =>
            prev.map(item =>
              item.id === id
                ? {
                    ...item,
                    name: attributes.内功名字 || '未知',
                    attributes,
                    calculation,
                    evaluation,
                    status: 'done',
                  }
                : item
            )
          );
        } catch (error) {
          console.error('解析错误:', error);
          setResults(prev =>
            prev.map(item =>
              item.id === id
                ? {
                    ...item,
                    name: '解析失败',
                    status: 'error',
                    error: error instanceof Error ? error.message : '解析失败',
                  }
                : item
            )
          );
        }
        break;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // 批量确认上传 - 添加到结果列表（loading状态），然后逐个解析
  const handleBatchConfirm = useCallback(async (items: { file: File; previewUrl: string; id: string }[]) => {
    setShowBatchModal(false);

    // 先添加loading状态的item到结果列表
    const loadingItems: ResultItem[] = items.map(item => ({
      id: item.id,
      previewUrl: item.previewUrl,
      name: '解析中...',
      status: 'loading',
    }));
    setResults(prev => [...prev, ...loadingItems]);

    // 逐个压缩并解析
    for (const item of items) {
      let finalFile = item.file;
      try {
        finalFile = await compressImage(item.file);
      } catch {
        // 使用原文件
      }

      // 解析单张图片
      parseImage(item.id, finalFile, item.previewUrl);
    }

    setPendingImages([]);
  }, []);

  // 批量取消
  const handleBatchCancel = useCallback(() => {
    setShowBatchModal(false);
    setPendingImages([]);
  }, []);

  // 单张裁剪完成 - 添加到结果列表并解析
  const handleSingleCropComplete = useCallback(async (croppedFile: File) => {
    if (!singleCropImage) return;

    setShowSingleCropper(false);

    // 为裁剪后的图片创建预览URL
    const croppedPreviewUrl = URL.createObjectURL(croppedFile);

    // 先添加loading状态到结果列表
    setResults(prev => [...prev, {
      id: singleCropImage.id,
      previewUrl: croppedPreviewUrl,
      name: '解析中...',
      status: 'loading',
    }]);

    // 压缩
    let finalFile = croppedFile;
    try {
      finalFile = await compressImage(croppedFile);
    } catch {
      // 使用原裁剪文件
    }

    // 解析
    parseImage(singleCropImage.id, finalFile, croppedPreviewUrl);

    setPendingImages([]);
    setSingleCropImage(null);
  }, [singleCropImage]);

  // 单张裁剪取消
  const handleSingleCropCancel = useCallback(() => {
    setShowSingleCropper(false);
    setPendingImages([]);
    setSingleCropImage(null);
  }, []);

  // 解析单张图片
  const parseImage = useCallback(async (id: string, file: File, previewUrl: string) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/parse-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '解析失败');
      }

      const attributes: ParseResult = data.data;
      const calculation = calculateAllAttributes(attributes);
      const evaluation = getEvaluation(calculation.totalScore);

      // 更新结果列表中的对应项
      setResults(prev =>
        prev.map(item =>
          item.id === id
            ? {
                ...item,
                name: attributes.内功名字 || '未知',
                attributes,
                calculation,
                evaluation,
                status: 'done',
              }
            : item
        )
      );
    } catch (error) {
      console.error('解析错误:', error);
      setResults(prev =>
        prev.map(item =>
          item.id === id
            ? {
                ...item,
                name: '解析失败',
                status: 'error',
                error: error instanceof Error ? error.message : '解析失败',
              }
            : item
        )
      );
    }
  }, []);

  // 移除结果
  const handleRemoveResult = useCallback((id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  }, []);

  // 点击预览
  const handleImagePreview = useCallback((url: string) => {
    setModalImageUrl(url);
    setShowPreviewModal(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowPreviewModal(false);
    setModalImageUrl(null);
  }, []);

  // 重新上传某张图片
  const handleReupload = useCallback((id: string) => {
    // 先移除旧的
    handleRemoveResult(id);
    // 然后触发文件选择
    fileInputRef.current?.click();
  }, [handleRemoveResult]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-white mb-1">
            逆水寒手游 · 内功对比计算器
          </h1>
          <p className="text-gray-300 text-sm">
            上传截图 → 裁剪解析区域 → AI自动解析对比
          </p>
        </div>

        {/* 导航 */}
        <div className="flex justify-center gap-3 mb-4">
          <Link
            href="/"
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors border border-white/20"
          >
            单个计算器
          </Link>
          <Link
            href="/compare"
            className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            对比计算器
          </Link>
        </div>

        {/* 图片上传区域 - 始终可点击 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 mb-4 shadow-xl border border-white/20">
          <div
            className={`relative border-2 rounded-xl p-5 transition-all cursor-pointer ${
              isDragging
                ? 'border-purple-400 bg-purple-500/20'
                : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleInputChange}
              className="hidden"
            />

            <div className="text-center">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-gray-300 text-sm mb-1">
                点击、拖拽或 Ctrl+V 粘贴上传内功属性截图
              </p>
              <p className="text-gray-400 text-xs">
                可持续上传，已上传的图片会显示在下方列表中
              </p>
            </div>
          </div>
        </div>

        {/* 结果列表 - 包含loading和done状态 */}
        {results.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 shadow-xl border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">对比结果</h2>
              <div className="text-gray-400 text-xs">
                {results.filter(r => r.status === 'loading').length > 0 && (
                  <span className="text-yellow-300">
                    {results.filter(r => r.status === 'loading').length} 张正在解析...
                  </span>
                )}
              </div>
            </div>

            {/* 表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-2 px-2 text-left text-gray-300 w-16">截图</th>
                    <th className="py-2 px-2 text-left text-gray-300 w-16">内功</th>
                    <th className="py-2 px-2 text-left text-gray-300">总分</th>
                    <th className="py-2 px-1 text-right text-gray-300">破防</th>
                    <th className="py-2 px-1 text-right text-gray-300">攻击</th>
                    <th className="py-2 px-1 text-right text-gray-300">最大最小</th>
                    <th className="py-2 px-1 text-right text-gray-300">力量气海</th>
                    <th className="py-2 px-1 text-right text-gray-300">会心</th>
                    <th className="py-2 px-1 text-right text-gray-300">命中</th>
                    <th className="py-2 px-1 text-right text-gray-300">全元素</th>
                    <th className="py-2 px-1 text-right text-gray-300">流派</th>
                    <th className="py-2 px-1 text-right text-gray-300">身法</th>
                    <th className="py-2 px-1 text-right text-gray-300">根骨</th>
                    <th className="py-2 px-1 text-right text-gray-300">耐力</th>
                    <th className="py-2 px-1 text-right text-gray-300">克制</th>
                    <th className="py-2 px-2 text-left text-gray-300">评价</th>
                    <th className="py-2 px-1 text-center text-gray-300 w-10">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 按上传顺序显示 */}
                  {results.filter(r => r.status === 'done').map((result) => (
                      <tr
                        key={result.id}
                        className="border-b border-white/10 bg-white/5"
                      >
                        <td className="py-1.5 px-2">
                          <img
                            src={result.previewUrl}
                            alt="截图"
                            className="w-14 h-10 object-cover rounded cursor-pointer hover:opacity-80"
                            onClick={() => handleImagePreview(result.previewUrl)}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <span className={`text-xs font-medium ${
                            result.name === '总和' ? 'text-blue-300' : 'text-green-300'
                          }`}>
                            {result.name}
                          </span>
                        </td>
                        <td className="py-1.5 px-2">
                          <span className="text-purple-300 font-bold text-sm">
                            {Math.round(result.calculation!.totalScore)}
                          </span>
                        </td>
                        {result.calculation!.attributes.map((attr, i) => (
                          <td key={i} className="py-1.5 px-1 text-right text-gray-200">
                            {attr.value || '-'}
                          </td>
                        ))}
                        <td className="py-1.5 px-2 text-gray-300 truncate max-w-[100px]">
                          {result.evaluation!.split(',')[0]}
                        </td>
                        <td className="py-1.5 px-1 text-center">
                          <button
                            onClick={() => handleRemoveResult(result.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  {/* 显示loading状态的项 */}
                  {results.filter(r => r.status === 'loading').map((result) => (
                    <tr
                      key={result.id}
                      className="border-b border-white/10 bg-white/5"
                    >
                      <td className="py-1.5 px-2">
                        <div className="relative">
                          <img
                            src={result.previewUrl}
                            alt="解析中"
                            className="w-14 h-10 object-cover rounded cursor-pointer hover:opacity-80"
                            onClick={() => handleImagePreview(result.previewUrl)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded pointer-events-none">
                            <div className="animate-spin text-lg">⚙️</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <span className="text-xs text-yellow-300 animate-pulse">AI解析中</span>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center">
                          <div className="animate-spin mr-1">⚙️</div>
                          <span className="text-gray-400 text-xs">计算中</span>
                        </div>
                      </td>
                      {[...Array(12)].map((_, i) => (
                        <td key={i} className="py-1.5 px-1 text-right">
                          <div className="h-3 bg-white/10 rounded animate-pulse"></div>
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-gray-400">
                        <div className="h-3 bg-white/10 rounded animate-pulse w-16"></div>
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        <button
                          onClick={() => handleRemoveResult(result.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* 显示error状态的项 */}
                  {results.filter(r => r.status === 'error').map((result) => (
                    <tr
                      key={result.id}
                      className="border-b border-white/10 bg-red-500/10"
                    >
                      <td className="py-1.5 px-2">
                        <img
                          src={result.previewUrl}
                          alt="失败"
                          className="w-14 h-10 object-cover rounded opacity-70"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <span className="text-xs text-red-300">解析失败</span>
                      </td>
                      <td className="py-1.5 px-2">
                        <span className="text-red-400">❌</span>
                      </td>
                      {[...Array(12)].map((_, i) => (
                        <td key={i} className="py-1.5 px-1 text-right text-gray-400">-</td>
                      ))}
                      <td className="py-1.5 px-2 text-red-300 truncate max-w-[100px]">
                        {result.error || '解析失败'}
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        <button
                          onClick={() => handleReupload(result.id)}
                          className="text-blue-400 hover:text-blue-300 mr-1"
                          title="重新上传"
                        >
                          ↻
                        </button>
                        <button
                          onClick={() => handleRemoveResult(result.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* 空状态 */}
        {results.length === 0 && (
          <div className="text-center text-gray-400 py-6">
            <p>上传截图开始对比计算</p>
          </div>
        )}
      </div>

      {/* 批量图片管理弹窗 */}
      {showBatchModal && pendingImages.length > 0 && (
        <BatchImageModal
          images={pendingImages}
          onConfirm={handleBatchConfirm}
          onCancel={handleBatchCancel}
        />
      )}

      {/* 单张图片裁剪弹窗 */}
      {showSingleCropper && singleCropImage && (
        <ImageCropper
          imageUrl={singleCropImage.previewUrl}
          onCropComplete={handleSingleCropComplete}
          onCancel={handleSingleCropCancel}
        />
      )}

      {/* 图片放大预览模态框 */}
      {showPreviewModal && modalImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleClosePreview}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={modalImageUrl}
              alt="放大预览"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            />
            <button
              onClick={handleClosePreview}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}