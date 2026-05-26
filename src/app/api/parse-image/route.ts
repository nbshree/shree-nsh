import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.ALIYUN_API_BASE_URL || 'https://coding.dashscope.aliyuncs.com/v1';
const API_KEY = process.env.ALIYUN_API_KEY;
const MODEL = process.env.ALIYUN_MODEL || 'kimi-k2.5';

// 需要解析的属性列表
const ATTRIBUTES = [
  '破防',
  '攻击',
  '最大攻击',
  '最小攻击',
  '力量',
  '气海',
  '会心',
  '命中',
  '全元素攻',
  '流派元素攻',
  '身法',
  '根骨',
  '耐力',
  '内功克制',
  '外功克制',
];

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'API Key 未配置，请在 .env.local 中设置 ALIYUN_API_KEY' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: '未提供图片' }, { status: 400 });
    }

    // 将图片转为 base64
    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    // 构建提示词
    const prompt = `请分析这张游戏截图，提取属性数值。

首先判断这是"总和面板"还是"单个内功面板"：
- 如果是总和面板（所有内功属性加在一起的总属性），内功名字设为"总和"
- 如果是单个内功的属性面板，请识别内功的名字（如：日月两仪、鸣镝裂风、昆吾断玉、破霄摧星、鸣沙绝、五韵谣、啸凌云、土内功等）

请以JSON格式返回结果，格式如下：
{
  "内功名字": "总和" 或 单个内功的名字,
  "破防": 数值,
  "攻击": 数值,
  "最大最小攻击": 最大攻击+最小攻击的总数值,
  "力量气海": 数值（如果是力量或气海都写这个字段）,
  "会心": 数值,
  "命中": 数值,
  "全元素攻": 数值,
  "流派元素攻": 数值,
  "身法": 数值,
  "根骨": 数值,
  "耐力": 数值,
  "内外功克制": 内功克制+外功克制的总数值
}

需要提取的属性：${ATTRIBUTES.join(', ')}

注意事项：
1. 最大最小攻击 = 最大攻击 + 最小攻击 的总和
2. 内外功克制 = 内功克制 + 外功克制 的总和
3. 如果某个属性在图片中没有显示，请设为0
4. 内功名字必须填写，总和面板填"总和"，单个内功填具体的内功名字
5. 只返回JSON，不要有其他文字说明`;

    // 调用阿里云 API（OpenAI兼容格式）
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return NextResponse.json(
        { error: `API调用失败: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // 解析返回的JSON
    let parsedResult;
    try {
      // 尝试提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = JSON.parse(content);
      }
    } catch {
      console.error('JSON解析失败:', content);
      return NextResponse.json(
        { error: 'AI返回的数据格式无法解析', rawContent: content },
        { status: 500 }
      );
    }

    // 确保所有字段都有默认值
    const result = {
      内功名字: parsedResult['内功名字'] || parsedResult['名字'] || '未知',
      破防: parsedResult['破防'] || parsedResult['破防值'] || 0,
      攻击: parsedResult['攻击'] || parsedResult['攻击值'] || 0,
      最大最小攻击: parsedResult['最大最小攻击'] || parsedResult['最大攻击'] + parsedResult['最小攻击'] || 0,
      力量气海: parsedResult['力量气海'] || parsedResult['力量'] || parsedResult['气海'] || 0,
      会心: parsedResult['会心'] || parsedResult['会心值'] || 0,
      命中: parsedResult['命中'] || parsedResult['命中值'] || 0,
      全元素攻: parsedResult['全元素攻'] || parsedResult['全元素攻击'] || 0,
      流派元素攻: parsedResult['流派元素攻'] || parsedResult['流派元素攻击'] || 0,
      身法: parsedResult['身法'] || 0,
      根骨: parsedResult['根骨'] || 0,
      耐力: parsedResult['耐力'] || 0,
      内外功克制: parsedResult['内外功克制'] || parsedResult['内功克制'] + parsedResult['外功克制'] || 0,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('解析错误:', error);
    return NextResponse.json(
      { error: '图片解析失败，请重试' },
      { status: 500 }
    );
  }
}