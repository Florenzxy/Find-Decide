import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyzeInterviewReview,
  analyzeJobDescription,
  analyzeResumeOptimization,
  generatePreparationQuestion,
  generatePreparationStrategyStrict
} from "../src/services/aiService";
import { db } from "../src/db/db";

const { chatCreateMock } = vi.hoisted(() => ({
  chatCreateMock: vi.fn()
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: chatCreateMock
      }
    };
  }
}));

function mockAiJsonResponse(payload: unknown) {
  chatCreateMock.mockResolvedValueOnce({
    choices: [
      {
        message: {
          content: JSON.stringify(payload)
        }
      }
    ]
  });
}

describe("ai service", () => {
  beforeEach(async () => {
    chatCreateMock.mockReset();
    await db.analysisCache.clear();
  });

  it("calls Qwen through the OpenAI compatible client for JD analysis", async () => {
    mockAiJsonResponse({
      basicInfo: {
        jobTitle: "B 端产品经理",
        company: "测试科技",
        department: "产品部",
        location: "上海",
        employmentType: "全职"
      },
      mustHave: {
        education: "本科及以上",
        experience: "3年以上",
        requiredSkills: ["SQL", "需求分析"],
        requiredCerts: [],
        language: null
      },
      niceToHave: {
        preferredSkills: ["SaaS"],
        preferredExperience: ["B 端业务经验"],
        preferredCerts: []
      },
      keywords: [
        { word: "SaaS", weight: 3 },
        { word: "数据分析", weight: 2 },
        { word: "需求分析", weight: 2 }
      ],
      riskPoints: [
        {
          label: "行业背景要求",
          description: "JD 对 B 端 SaaS 经验有明确偏好，缺少相关背景会影响匹配度。",
          severity: "medium"
        }
      ],
      profile: "适合具备 B 端 SaaS 产品经验，并能使用 SQL 做数据分析的产品经理。"
    });

    const result = await analyzeJobDescription("负责 SaaS 产品的数据分析与跨部门协作");

    expect(result.basicInfo.jobTitle).toBe("B 端产品经理");
    expect(result.keywords).toEqual([
      { word: "SaaS", weight: 3 },
      { word: "数据分析", weight: 2 },
      { word: "需求分析", weight: 2 }
    ]);
    expect(result.riskPoints[0]).toEqual(
      expect.objectContaining({
        label: "行业背景要求",
        severity: "medium"
      })
    );
    expect(chatCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "qwen3.7-max",
        max_tokens: 800,
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "负责 SaaS 产品的数据分析与跨部门协作" })
        ])
      }),
      expect.objectContaining({ timeout: 60000 })
    );
  });

  it("reuses the cached JD analysis result for identical JD text", async () => {
    mockAiJsonResponse({
      basicInfo: {
        jobTitle: "数据产品经理",
        company: null,
        department: null,
        location: "北京",
        employmentType: "全职"
      },
      mustHave: {
        education: "本科及以上",
        experience: null,
        requiredSkills: ["SQL"],
        requiredCerts: [],
        language: null
      },
      niceToHave: {
        preferredSkills: [],
        preferredExperience: [],
        preferredCerts: []
      },
      keywords: [{ word: "SQL", weight: 3 }],
      riskPoints: [
        {
          label: "职责较宽",
          description: "岗位覆盖分析、规划和协同，实际职责可能较宽。",
          severity: "low"
        }
      ],
      profile: "适合熟悉 SQL 和数据分析的产品经理。"
    });

    const jdText = "缓存测试 JD：负责 SQL 数据分析和产品规划";
    const firstResult = await analyzeJobDescription(jdText);
    const secondResult = await analyzeJobDescription(jdText);

    expect(secondResult).toEqual(firstResult);
    expect(chatCreateMock).toHaveBeenCalledTimes(1);
    expect(await db.analysisCache.count()).toBe(1);
  });

  it("uses both JD and resume text for resume optimization", async () => {
    mockAiJsonResponse({
      matchScore: 86,
      coreStrengths: ["具备 B 端 SaaS 产品经验"],
      optimizationDirections: ["商业化项目指标不够明确"],
      specificSuggestions: ["补充转化率提升等量化结果"]
    });

    const result = await analyzeResumeOptimization("岗位 JD：需要 SQL 和 SaaS 经验", "简历：3 年 SaaS 产品经验，熟悉 SQL");

    expect(result.matchScore).toBe(86);
    expect(result.coreStrengths).toEqual(["具备 B 端 SaaS 产品经验"]);
    expect(chatCreateMock.mock.calls[0][0].messages[1].content).toContain("岗位 JD：需要 SQL 和 SaaS 经验");
    expect(chatCreateMock.mock.calls[0][0].messages[1].content).toContain("简历：3 年 SaaS 产品经验，熟悉 SQL");
    expect(chatCreateMock.mock.calls[0][1]).toEqual(expect.objectContaining({ timeout: 120000 }));
  });

  it("reuses the cached resume match result for identical JD and resume", async () => {
    mockAiJsonResponse({
      matchScore: 78,
      coreStrengths: ["有相关项目经验"],
      optimizationDirections: ["学历信息不完整"],
      specificSuggestions: ["补充项目量化结果"]
    });

    const jdText = "缓存测试岗位：需要产品分析和跨部门协作";
    const resumeText = "缓存测试简历：有相关项目经验";
    const firstResult = await analyzeResumeOptimization(jdText, resumeText);
    const secondResult = await analyzeResumeOptimization(jdText, resumeText);

    expect(secondResult).toEqual(firstResult);
    expect(chatCreateMock).toHaveBeenCalledTimes(1);
    expect(await db.analysisCache.count()).toBe(1);
  });

  it("normalizes interview suggestions into optimizedSuggestion", async () => {
    mockAiJsonResponse({
      intent: "考察复杂业务场景下的需求拆解能力。",
      suggestions: ["补充量化结果", "用 STAR 法则组织回答"]
    });

    const result = await analyzeInterviewReview(
      "SaaS product with data analysis",
      "How do you improve a conversion funnel?",
      "I would inspect the data and discuss with the team."
    );

    expect(result.intent).toContain("需求拆解");
    expect(result.suggestions).toEqual(["补充量化结果", "用 STAR 法则组织回答"]);
    expect(result.optimizedSuggestion).toBe("补充量化结果；用 STAR 法则组织回答");
  });

  it("returns preparation strategy items generated from JD, resume and keywords", async () => {
    mockAiJsonResponse({
      prepList: [
        {
          knowledgePoint: "SaaS 计费模式",
          category: "business",
          question: "你如何理解 SaaS 订阅计费对产品设计的影响？",
          guidance: "从用户价值、商业闭环、收入模型三个角度回答。"
        }
      ]
    });

    const result = await generatePreparationStrategyStrict(
      {
        basicInfo: {
          jobTitle: "B 端产品经理",
          company: "测试科技",
          department: null,
          location: null,
          employmentType: null
        },
        mustHave: {
          education: "本科及以上",
          experience: "3年以上",
          requiredSkills: ["SQL"],
          requiredCerts: [],
          language: null
        },
        niceToHave: {
          preferredSkills: ["SaaS"],
          preferredExperience: ["B 端业务经验"],
          preferredCerts: []
        },
        keywords: [{ word: "SaaS", weight: 3 }],
        riskPoints: [{ label: "行业背景要求", description: "", severity: "medium" }],
        profile: "适合具备 B 端 SaaS 产品经验，并能使用 SQL 做数据分析的产品经理。"
      },
      {
        matchScore: 86,
        coreStrengths: ["具备 B 端 SaaS 产品经验"],
        optimizationDirections: ["商业化项目指标不够明确"],
        specificSuggestions: ["补充转化率提升等量化结果"]
      }
    );

    expect(result).toEqual([
      {
        category: "business",
        knowledgePoint: "SaaS 计费模式",
        question: "你如何理解 SaaS 订阅计费对产品设计的影响？",
        guidance: "从用户价值、商业闭环、收入模型三个角度回答。"
      }
    ]);
    expect(chatCreateMock.mock.calls[0][0].messages[1].content).toContain("B 端产品经理");
    expect(chatCreateMock.mock.calls[0][0].messages[1].content).toContain("具备 B 端 SaaS 产品经验");
  });
  it("generates a targeted question for a manually added preparation item", async () => {
    mockAiJsonResponse({
      question: "请结合你在需求分析与方案设计中的一次实际经历，说明你如何把业务需求拆解成可落地的产品方案？",
      guidance: "回答时先讲需求背景，再讲拆解过程、方案权衡和最终结果。"
    });

    const result = await generatePreparationQuestion(
      "需求分析与方案设计",
      "skill",
      {
        basicInfo: {
          jobTitle: "产品经理",
          company: "测试科技",
          department: null,
          location: null,
          employmentType: null
        },
        mustHave: {
          education: "本科及以上",
          experience: "3年以上",
          requiredSkills: ["需求分析", "方案设计"],
          requiredCerts: [],
          language: null
        },
        niceToHave: {
          preferredSkills: [],
          preferredExperience: [],
          preferredCerts: []
        },
        keywords: [{ word: "需求分析", weight: 3 }],
        riskPoints: [],
        profile: "适合能够把业务需求拆成方案并推动落地的产品经理。"
      },
      {
        matchScore: 82,
        coreStrengths: ["具备需求分析经验"],
        optimizationDirections: ["方案落地细节需要补充"],
        specificSuggestions: ["补充一个完整的需求到方案案例"]
      }
    );

    expect(result.question).toContain("需求分析与方案设计");
    expect(result.guidance).toContain("回答时先讲需求背景");
    expect(chatCreateMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to local preparation items when AI returns invalid JSON", async () => {
    chatCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "sorry, I cannot comply with json"
          }
        }
      ]
    });

    const result = await generatePreparationStrategyStrict(
      {
        basicInfo: {
          jobTitle: "产品经理",
          company: "测试科技",
          department: null,
          location: null,
          employmentType: null
        },
        mustHave: {
          education: "本科及以上",
          experience: "3年以上",
          requiredSkills: ["需求分析", "方案设计"],
          requiredCerts: [],
          language: null
        },
        niceToHave: {
          preferredSkills: ["SQL"],
          preferredExperience: ["B 端经验"],
          preferredCerts: []
        },
        keywords: [{ word: "需求分析", weight: 3 }],
        riskPoints: [{ label: "岗位边界", description: "", severity: "medium" }],
        profile: "适合能够把业务需求拆成方案并推动落地的产品经理。"
      },
      {
        matchScore: 82,
        coreStrengths: ["具备需求分析经验"],
        optimizationDirections: ["方案落地细节需要补充"],
        specificSuggestions: ["补充一个完整的需求到方案案例"]
      }
    );

    expect(result).toHaveLength(15);
    expect(result.filter((item) => item.category === "business")).toHaveLength(5);
    expect(result.filter((item) => item.category === "skill")).toHaveLength(5);
    expect(result.filter((item) => item.category === "project")).toHaveLength(5);
    expect(result[0].question.length).toBeGreaterThan(0);
  });
});
