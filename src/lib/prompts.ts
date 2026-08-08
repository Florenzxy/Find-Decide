import type { Application, InterviewRecord, JobDescription, ResumeProfile } from "../types";

export function buildJobAnalysisPrompt(application: Application, jd?: JobDescription) {
  return [
    `你是一位资深求职顾问，请分析这个岗位：${application.company} - ${application.role}`,
    "",
    "请输出：",
    "1. 岗位核心职责",
    "2. 硬性要求和隐性要求",
    "3. 候选人需要强调的项目经验",
    "4. 简历优化建议",
    "",
    "岗位 JD：",
    jd?.rawText || "尚未粘贴 JD"
  ].join("\n");
}

export function buildMatchPrompt(application: Application, jd?: JobDescription, resume?: ResumeProfile) {
  return [
    `请评估我和岗位的匹配度：${application.company} - ${application.role}`,
    "",
    "请给出 0-100 分匹配度，并分别列出优势、差距、简历优化建议和可直接使用的优化输出。",
    "",
    "岗位要求：",
    jd?.rawText || "尚未粘贴 JD",
    "",
    "我的简历素材：",
    [resume?.summary, resume?.projects, resume?.skills, resume?.achievements].filter(Boolean).join("\n\n") ||
      "尚未录入简历素材"
  ].join("\n");
}

export function buildInterviewPrompt(application: Application, record: InterviewRecord) {
  return [
    `请解析这道面试题：${application.company} - ${application.role}`,
    "",
    `题目：${record.question}`,
    `我的回答：${record.answer || "未填写"}`,
    "",
    "请输出：面试官考察点、优秀回答结构、我暴露的短板、下一次改进动作。"
  ].join("\n");
}
