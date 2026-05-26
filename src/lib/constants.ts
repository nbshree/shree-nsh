// 输出词条类型定义
export interface OutputAttributes {
  破防: number;
  攻击: number;
  最大最小攻击: number;
  力量气海: number;
  会心: number;
  命中: number;
  全元素攻: number;
  流派元素攻: number;
  身法: number;
  根骨: number;
  耐力: number;
  内外功克制: number;
}

// 解析结果类型（包含内功名字）
export interface ParseResult extends OutputAttributes {
  内功名字: string;
}

// 计算参数配置（从Excel提取）
export interface AttributeConfig {
  name: string;
  maxValue: number;      // 满数值
  baseYield: number;     // 基础收益（1%）
}

// 各属性的配置参数
export const ATTRIBUTE_CONFIG: Record<keyof OutputAttributes, AttributeConfig> = {
  破防: { name: '破防', maxValue: 2323, baseYield: 0.97 },
  攻击: { name: '攻击', maxValue: 1586, baseYield: 1.25 },
  最大最小攻击: { name: '最大+最小攻击', maxValue: 2076, baseYield: 0.82 },
  力量气海: { name: '力量/气海', maxValue: 256, baseYield: 1.16 },
  会心: { name: '会心', maxValue: 807, baseYield: 0.75 },
  命中: { name: '命中', maxValue: 681, baseYield: 1.00 },
  全元素攻: { name: '全元素攻', maxValue: 942, baseYield: 0.85 },
  流派元素攻: { name: '流派元素攻', maxValue: 779, baseYield: 0.62 },
  身法: { name: '身法', maxValue: 256, baseYield: 0.71 },
  根骨: { name: '根骨', maxValue: 96, baseYield: 0.25 }, // 1根骨=96气血，约0.25%收益
  耐力: { name: '耐力', maxValue: 1, baseYield: 0.20 }, // 1耐力=0.8抗会心+6防御，约0.20%收益
  内外功克制: { name: '内功克制+外功克制', maxValue: 1178, baseYield: 0.17 },
};

// 一线牵加成系数
export const YIXIANQIAN_MULTIPLIER = 1.07;

// 评分转换系数（100分 = 1%收益）
export const SCORE_PER_YIELD = 100;

// 属性名称映射（用于显示）
export const ATTRIBUTE_DISPLAY_NAMES: Record<keyof OutputAttributes, string> = {
  破防: '破防',
  攻击: '攻击',
  最大最小攻击: '最大+最小攻击',
  力量气海: '力量/气海',
  会心: '会心',
  命中: '命中',
  全元素攻: '全元素攻',
  流派元素攻: '流派元素攻',
  身法: '身法',
  根骨: '根骨',
  耐力: '耐力',
  内外功克制: '内功克制+外功克制',
};