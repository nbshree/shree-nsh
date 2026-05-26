import {
  OutputAttributes,
  ATTRIBUTE_CONFIG,
  YIXIANQIAN_MULTIPLIER,
  SCORE_PER_YIELD,
} from './constants';

// 单个属性的计算结果
export interface AttributeResult {
  name: string;
  value: number;
  yieldPercent: number;       // 基础收益百分比
  yieldWithYixianqian: number; // 一线牵加成后的收益
  score: number;               // 评分
}

// 总计算结果
export interface CalculationResult {
  attributes: AttributeResult[];
  totalYield: number;
  totalYieldWithYixianqian: number;
  totalScore: number;
}

/**
 * 计算单个属性的收益和评分
 */
function calculateAttribute(
  key: keyof OutputAttributes,
  value: number
): AttributeResult {
  const config = ATTRIBUTE_CONFIG[key];

  // 收益计算：value / maxValue * baseYield
  const yieldPercent = value > 0 ? (value / config.maxValue) * config.baseYield : 0;

  // 一线牵加成后的收益
  const yieldWithYixianqian = yieldPercent * YIXIANQIAN_MULTIPLIER;

  // 评分计算：收益百分比 * 100
  const score = yieldWithYixianqian * SCORE_PER_YIELD;

  return {
    name: config.name,
    value,
    yieldPercent,
    yieldWithYixianqian,
    score,
  };
}

/**
 * 计算所有属性的收益和评分
 */
export function calculateAllAttributes(
  attributes: OutputAttributes
): CalculationResult {
  const attributeResults: AttributeResult[] = [];
  let totalYield = 0;
  let totalYieldWithYixianqian = 0;
  let totalScore = 0;

  // 按照Excel中的顺序计算
  const order: (keyof OutputAttributes)[] = [
    '破防',
    '攻击',
    '最大最小攻击',
    '力量气海',
    '会心',
    '命中',
    '全元素攻',
    '流派元素攻',
    '身法',
    '根骨',
    '耐力',
    '内外功克制',
  ];

  for (const key of order) {
    const result = calculateAttribute(key, attributes[key]);
    attributeResults.push(result);
    totalYield += result.yieldPercent;
    totalYieldWithYixianqian += result.yieldWithYixianqian;
    totalScore += result.score;
  }

  return {
    attributes: attributeResults,
    totalYield,
    totalYieldWithYixianqian,
    totalScore,
  };
}

/**
 * 根据总分获取评价等级
 */
export function getEvaluation(score: number): string {
  if (score >= 6300) return '自定义内功，拆道万古如长夜';
  if (score >= 6000) return '均6输出词条，世间无我这般人';
  if (score >= 5800) return '5-5.5输出词条，手握日月拆星辰';
  if (score >= 5300) return '4-5输出词条，拆之巅、傲世间';
  if (score >= 4800) return '3-4输出词条，塔已有取死之道';
  if (score >= 4100) return '1.5-3输出词条，可担饮水机大任';
  if (score < 4100) return '不如试用内功的东西，疑似伪人';
  return '';
}