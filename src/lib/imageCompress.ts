// 图片压缩配置
export const COMPRESS_CONFIG = {
  maxWidth: 1280,
  maxHeight: 720,
  quality: 0.8,
  mimeType: 'image/jpeg',
};

/**
 * 压缩图片
 * @param file 原始图片文件
 * @returns 压缩后的图片文件
 */
export async function compressImage(file: File): Promise<File> {
  // 如果已经是较小的图片，直接返回
  if (file.size < 200 * 1024) { // 小于200KB不压缩
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // 计算缩放比例
      const scale = Math.min(
        COMPRESS_CONFIG.maxWidth / width,
        COMPRESS_CONFIG.maxHeight / height,
        1 // 不放大
      );

      width = Math.floor(width * scale);
      height = Math.floor(height * scale);

      canvas.width = width;
      canvas.height = height;

      // 绘制压缩后的图片
      ctx?.drawImage(img, 0, 0, width, height);

      // 转换为Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: COMPRESS_CONFIG.mimeType,
            });
            resolve(compressedFile);
          } else {
            reject(new Error('压缩失败'));
          }
        },
        COMPRESS_CONFIG.mimeType,
        COMPRESS_CONFIG.quality
      );
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * 获取图片压缩后的预估大小
 */
export function estimateCompressedSize(originalSize: number): string {
  // 通常压缩后约为原图的 20-40%
  const estimated = originalSize * 0.3;
  if (estimated < 1024) {
    return `${Math.round(estimated)} B`;
  } else if (estimated < 1024 * 1024) {
    return `${Math.round(estimated / 1024)} KB`;
  } else {
    return `${Math.round(estimated / 1024 / 1024)} MB`;
  }
}