# 项目规则说明

## 引用基础规则
@AGENTS.md

## 项目概述

这是一个逆水寒手游内功计算器应用，使用 Next.js + TypeScript + Tailwind CSS 开发。

## 技术栈

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- 阿里云 Coding API (kimi-k2.5) 用于图片解析

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 单个计算器页面
│   ├── compare/page.tsx      # 对比计算器页面
│   └── api/parse-image/route.ts  # AI解析API
├── components/               # React组件
├── lib/
│   ├── constants.ts          # 属性配置（不要随意修改计算参数）
│   ├── calculator.ts         # 计算逻辑
│   └── imageCompress.ts      # 图片压缩
```

## 开发规范

### 样式
- 使用 Tailwind CSS
- 深色主题为主，背景使用 `bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900`
- 卡片使用 `bg-white/10 backdrop-blur-lg rounded-xl`

### 组件
- 组件使用 `'use client'` 指令（涉及交互的组件）
- 使用 TypeScript 类型定义
- 使用 useCallback 包装事件处理函数

### API
- API Key 在 `.env.local` 中配置，不要硬编码
- 模型名称：`kimi-k2.5`
- API 返回 JSON 格式，包含 `内功名字` 字段

### 图片处理
- 上传前压缩图片（1280×720，80%质量）
- 裁剪使用 Canvas 实现
- 预览使用 `URL.createObjectURL()`

## 注意事项

- 修改计算参数时参考 `src/lib/constants.ts`
- 属性顺序：破防、攻击、最大最小攻击、力量气海、会心、命中、全元素攻、流派元素攻、身法、根骨、耐力、内外功克制
- 评分规则：100分 = 1%收益，一线牵加成 = 1.07倍