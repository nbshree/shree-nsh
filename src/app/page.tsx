'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  OutputAttributes,
  ATTRIBUTE_CONFIG,
  ATTRIBUTE_DISPLAY_NAMES,
} from '@/lib/constants';
import {
  calculateAllAttributes,
  getEvaluation,
  AttributeResult,
} from '@/lib/calculator';
import ImageCropper from '@/components/ImageCropper';
import { compressImage } from '@/lib/imageCompress';

// 默认空值
const defaultAttributes: OutputAttributes = {
  破防: 0,
  攻击: 0,
  最大最小攻击: 0,
  力量气海: 0,
  会心: 0,
  命中: 0,
  全元素攻: 0,
  流派元素攻: 0,
  身法: 0,
  根骨: 0,
  耐力: 0,
  内外功克制: 0,
};

export default function Home() {
  const [attributes, setAttributes] = useState<OutputAttributes>(defaultAttributes);
  const [result, setResult] = useState<ReturnType<typeof calculateAllAttributes> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback((key: keyof OutputAttributes, value: string) => {
    const numValue = parseFloat(value) || 0;
    setAttributes(prev => ({
      ...prev,
      [key]: numValue,
    }));
  }, []);

  const handleCalculate = useCallback(() => {
    const calcResult = calculateAllAttributes(attributes);
    setResult(calcResult);
  }, [attributes]);

  const handleReset = useCallback(() => {
    setAttributes(defaultAttributes);
    setResult(null);
    setParseError(null);
    setPreviewUrl(null);
  }, []);

  // 选择图片后显示裁剪弹窗
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }
    const url = URL.createObjectURL(file);
    setPendingImageUrl(url);
    setShowCropper(true);
  }, []);

  const handleInputChangeFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // 粘贴图片处理 - 跳过裁剪直接使用原图
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) return;

        // 直接使用原图，跳过裁剪
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setIsProcessing(true);
        setParseError(null);

        try {
          let finalFile = file;
          try {
            finalFile = await compressImage(file);
          } catch {
            // 使用原文件
          }

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

          setAttributes(prev => ({
            ...prev,
            ...data.data,
          }));
        } catch (error) {
          console.error('解析错误:', error);
          setParseError(error instanceof Error ? error.message : '图片解析失败，请重试');
        } finally {
          setIsProcessing(false);
        }
        break;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // 裁剪完成，上传AI解析
  const handleCropComplete = useCallback(async (croppedFile: File) => {
    setShowCropper(false);

    // 为裁剪后的图片创建预览URL
    const croppedPreviewUrl = URL.createObjectURL(croppedFile);
    setPreviewUrl(croppedPreviewUrl);

    setIsProcessing(true);
    setParseError(null);

    try {
      // 压缩图片
      let finalFile = croppedFile;
      try {
        finalFile = await compressImage(croppedFile);
      } catch {
        // 使用原裁剪文件
      }

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

      // 将解析结果填入表单
      setAttributes(prev => ({
        ...prev,
        ...data.data,
      }));

    } catch (error) {
      console.error('解析错误:', error);
      setParseError(error instanceof Error ? error.message : '图片解析失败，请重试');
    } finally {
      setIsProcessing(false);
      setPendingImageUrl(null);
    }
  }, [pendingImageUrl]);

  // 取消裁剪
  const handleCropCancel = useCallback(() => {
    setShowCropper(false);
    setPendingImageUrl(null);
  }, []);

  // 清除预览
  const handleClearPreview = useCallback(() => {
    setPreviewUrl(null);
    setAttributes(defaultAttributes);
    setResult(null);
    setParseError(null);
  }, []);

  // 预览模态框
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const handlePreviewClick = useCallback(() => {
    if (previewUrl) {
      setShowPreviewModal(true);
    }
  }, [previewUrl]);

  const handleClosePreviewModal = useCallback(() => {
    setShowPreviewModal(false);
  }, []);

  // 重新上传
  const handleReupload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">
            逆水寒手游 · 进攻团内功计算器
          </h1>
          <p className="text-gray-300 text-sm">
            上传截图 → 裁剪解析区域 → AI自动解析 → 计算评分
          </p>
        </div>

        {/* 导航 */}
        <div className="flex justify-center gap-3 mb-4">
          <Link
            href="/"
            className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            单个计算器
          </Link>
          <Link
            href="/compare"
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors border border-white/20"
          >
            对比计算器
          </Link>
        </div>

        {/* 图片上传区域 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 mb-4 shadow-xl border border-white/20">
          <h2 className="text-lg font-semibold text-white mb-3">上传截图解析</h2>

          <div
            className={`relative border-2 rounded-xl p-6 transition-all ${
              isDragging
                ? 'border-purple-400 bg-purple-500/20'
                : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
            } ${isProcessing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !isProcessing && !previewUrl && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChangeFile}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="预览图片"
                  className="max-h-48 mx-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={handlePreviewClick}
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={handleReupload}
                    className="px-3 py-1 bg-blue-500/80 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                  >
                    重新上传
                  </button>
                  <button
                    onClick={handleClearPreview}
                    className="px-3 py-1 bg-red-500/80 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                  >
                    清除
                  </button>
                </div>
                <p className="text-center text-gray-400 text-xs mt-2">点击图片可放大预览</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-3">📷</div>
                <p className="text-gray-300 mb-2">
                  点击、拖拽或 Ctrl+V 粘贴上传内功属性截图
                </p>
                <p className="text-gray-400 text-xs">
                  上传后可裁剪解析区域
                </p>
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
        </div>

        {/* 解析错误提示 */}
        {parseError && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 mb-4">
            <p className="text-red-300 text-sm">{parseError}</p>
          </div>
        )}

        {/* 输入表单 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 mb-4 shadow-xl border border-white/20">
          <h2 className="text-lg font-semibold text-white mb-3">输出词条</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(Object.keys(ATTRIBUTE_CONFIG) as (keyof OutputAttributes)[]).map(key => (
              <div key={key} className="space-y-1">
                <label className="block text-sm font-medium text-gray-200">
                  {ATTRIBUTE_DISPLAY_NAMES[key]}
                </label>
                <input
                  type="number"
                  value={attributes[key] || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCalculate}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-purple-500/25"
            >
              计算评分
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              重置
            </button>
          </div>
        </div>

        {/* 结果显示 */}
        {result && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 shadow-xl border border-white/20">
            {/* 总分 */}
            <div className="text-center mb-4 p-3 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-xl">
              <div className="text-3xl font-bold text-white mb-1">
                {Math.round(result.totalScore)} 分
              </div>
              <div className="text-lg text-purple-200">
                总收益: {result.totalYield.toFixed(2)}% / 一线牵: {result.totalYieldWithYixianqian.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-300 mt-1">
                评价: {getEvaluation(result.totalScore)}
              </div>
            </div>

            {/* 详细结果表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-2 px-3 text-gray-200">词条类型</th>
                    <th className="text-right py-2 px-3 text-gray-200">数值</th>
                    <th className="text-right py-2 px-3 text-gray-200">收益</th>
                    <th className="text-right py-2 px-3 text-gray-200">一线牵</th>
                    <th className="text-right py-2 px-3 text-gray-200">评分</th>
                  </tr>
                </thead>
                <tbody>
                  {result.attributes.map((attr: AttributeResult, index: number) => (
                    <tr
                      key={index}
                      className={`border-b border-white/10 ${attr.value > 0 ? 'bg-white/5' : ''}`}
                    >
                      <td className="py-2 px-3 text-gray-100">{attr.name}</td>
                      <td className="text-right py-2 px-3 text-gray-100">{attr.value}</td>
                      <td className="text-right py-2 px-3 text-gray-100">
                        {attr.yieldPercent > 0 ? `${attr.yieldPercent.toFixed(2)}%` : '0.00%'}
                      </td>
                      <td className="text-right py-2 px-3 text-gray-100">
                        {attr.yieldWithYixianqian > 0 ? `${attr.yieldWithYixianqian.toFixed(2)}%` : '0.00%'}
                      </td>
                      <td className="text-right py-2 px-3 text-purple-300 font-medium">
                        {Math.round(attr.score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 评分等级说明 */}
            <div className="mt-4 p-3 bg-white/5 rounded-xl">
              <h3 className="text-sm font-medium text-white mb-2">评分等级参考</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-300">
                <div>≥6300: 拆道万古如长夜</div>
                <div>≥6000: 世间无我这般人</div>
                <div>≥5800: 手握日月拆星辰</div>
                <div>≥5300: 拆之巅、傲世间</div>
                <div>≥4800: 塔已有取死之道</div>
                <div>≥4100: 饮水机管理员</div>
                <div>&lt;4100: 疑似伪人</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 裁剪弹窗 */}
      {showCropper && pendingImageUrl && (
        <ImageCropper
          imageUrl={pendingImageUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* 图片放大预览模态框 */}
      {showPreviewModal && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleClosePreviewModal}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={previewUrl}
              alt="放大预览"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            />
            <button
              onClick={handleClosePreviewModal}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}