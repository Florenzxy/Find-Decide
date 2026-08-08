import { expect, test, type Page } from "@playwright/test";

async function createApplication(page: Page) {
  await page.goto("/applications");
  await page.getByRole("button", { name: "新建投递" }).click();
  await page.getByLabel(/公司名/).fill("测试公司");
  await page.getByLabel(/岗位名/).fill("前端工程师");
  await page.getByLabel(/投递链接/).fill("https://example.com/job");
  await page.getByLabel(/工作地点/).fill("上海");
  await page.getByLabel(/备注/).fill("阶段 3 测试记录");
  await page.getByRole("button", { name: "创建投递" }).click();
  await expect(page.getByRole("link", { name: "测试公司" })).toBeVisible();
}

test("application form shows an error for invalid urls", async ({ page }) => {
  await page.goto("/applications");
  await page.getByRole("button", { name: "新建投递" }).click();
  await page.getByLabel(/公司名/).fill("错误链接公司");
  await page.getByLabel(/岗位名/).fill("产品经理");
  await page.getByLabel(/投递链接/).fill("not-a-url");
  await page.getByRole("button", { name: "创建投递" }).click();
  await expect(page.getByText("请输入正确的网址")).toBeVisible();
  await expect(page.getByRole("link", { name: "错误链接公司" })).toHaveCount(0);
});

test("application detail tabs persist jd, structured preparation items and interview reviews", async ({ page }) => {
  await createApplication(page);
  await page.getByRole("link", { name: "测试公司" }).click();
  await expect(page.getByText("测试公司 / 前端工程师")).toBeVisible();

  await page.getByLabel("JD 原文").fill("负责 React 前端开发，要求熟悉 Hooks 和性能优化。");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("JD 已保存")).toBeVisible();

  await page.getByRole("button", { name: "知识准备" }).click();
  await page.getByPlaceholder("手动补充一个备战知识点").fill("复习 React Hooks");
  await page.getByRole("button", { name: "手动添加" }).click();
  await expect(page.getByText("复习 React Hooks")).toBeVisible();
  await page.getByLabel("标记 复习 React Hooks 为已掌握").click();
  await expect(page.getByLabel("标记 复习 React Hooks 为待复习")).toBeVisible();

  await page.getByRole("button", { name: "面试复盘" }).click();
  await page.getByLabel("面试官").fill("技术负责人");
  await page.getByLabel("面试问题").fill("如何优化 React 渲染？");
  await page.getByLabel("我的回答").fill("我会使用 memo、useMemo，并通过拆分组件减少不必要渲染。");
  await page.getByRole("button", { name: /AI 深度解析/ }).click();
  await expect(page.getByText("AI 分析报告")).toBeVisible({ timeout: 5000 });
  await page.getByLabel("4 星").click();
  await page.getByRole("button", { name: "添加复盘" }).click();
  await expect(page.getByText("技术负责人")).toBeVisible();

  await page.reload();
  await expect(page.getByText("测试公司 / 前端工程师")).toBeVisible();
  await expect(page.getByLabel("JD 原文")).toHaveValue("负责 React 前端开发，要求熟悉 Hooks 和性能优化。");

  await page.getByRole("button", { name: "知识准备" }).click();
  await expect(page.getByText("复习 React Hooks")).toBeVisible();
  await expect(page.getByLabel("标记 复习 React Hooks 为待复习")).toBeVisible();

  await page.getByRole("button", { name: "面试复盘" }).click();
  await expect(page.getByText("如何优化 React 渲染？")).toBeVisible();
  await expect(page.getByText("✨ 已优化")).toBeVisible();
  await page.getByText("如何优化 React 渲染？").click();
  await expect(page.getByText("AI 教练点评")).toBeVisible();
  await expect(page.getByText("提问意图")).toBeVisible();
});

test("interview review cards can be deleted", async ({ page }) => {
  await createApplication(page);
  await page.getByRole("link", { name: "测试公司" }).click();
  await page.getByLabel("JD 原文").fill("负责 React 产品需求分析与跨部门协作。");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("button", { name: "面试复盘" }).click();
  await page.getByLabel("面试问题").fill("如何做需求拆解？");
  await page.getByLabel("我的回答").fill("先确认目标，再拆分场景与优先级。");
  await page.getByRole("button", { name: /AI 深度解析/ }).click();
  await expect(page.getByText("AI 分析报告")).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "添加复盘" }).click();

  await expect(page.getByRole("button", { name: /如何做需求拆解？/ })).toBeVisible();
  await page.getByRole("button", { name: /删除 一面/ }).click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByRole("button", { name: /如何做需求拆解？/ })).toHaveCount(0);
});

test("interview reviews can be saved without AI analysis", async ({ page }) => {
  await createApplication(page);
  await page.getByRole("link", { name: "测试公司" }).click();
  await page.getByRole("button", { name: "面试复盘" }).click();
  await page.getByLabel("面试问题").fill("请介绍一个你解决过的难题。");
  await page.getByLabel("我的回答").fill("我先定位问题，再和团队一起验证解决方案。");
  await page.getByRole("button", { name: "添加复盘" }).click();

  await expect(page.getByRole("button", { name: /请介绍一个你解决过的难题/ })).toBeVisible();
  await expect(page.getByText("✨ 已优化")).toHaveCount(0);
});

test("mock ai analysis can run and save insights", async ({ page }) => {
  await createApplication(page);
  await page.getByRole("link", { name: "测试公司" }).click();

  await page.getByRole("button", { name: /AI 智能分析/ }).click();
  await expect(page.getByText("请先粘贴职位描述哦")).toBeVisible();

  await page.getByLabel("JD 原文").fill("负责 React 前端开发，关注 SaaS 产品能力和跨部门协作。");
  await page.getByRole("button", { name: /AI 智能分析/ }).click();
  await expect(page.getByRole("button", { name: "正在分析中..." })).toBeVisible();
  await expect(page.getByText("岗位摘要")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("B端")).toBeVisible();

  await page.getByRole("button", { name: "保存 AI 洞察" }).click();
  await expect(page.getByText("AI 洞察已保存")).toBeVisible();

  await page.reload();
  await expect(page.getByText("B端").first()).toBeVisible();
});

test("ai skills can flow into knowledge prep and list insights refresh", async ({ page }) => {
  await createApplication(page);
  await page.getByRole("link", { name: "测试公司" }).click();

  await page.getByLabel("JD 原文").fill("负责 React 前端开发，关注 SaaS 产品能力和跨部门协作。");
  await page.getByRole("button", { name: /AI 智能分析/ }).click();
  await expect(page.getByText("岗位摘要")).toBeVisible({ timeout: 5000 });

  await page.getByRole("button", { name: /SQL/ }).click();
  await expect(page.getByRole("button", { name: /SQL/ })).toBeDisabled();

  await page.getByRole("button", { name: "知识准备" }).click();
  await expect(page.getByRole("button", { name: "删除 SQL" })).toBeVisible();

  await page.getByRole("button", { name: "JD 分析" }).click();
  await page.getByRole("button", { name: "保存 AI 洞察" }).click();

  await page.goto("/applications");
  const previewLocator =
    test.info().project.name === "mobile"
      ? page.getByRole("article").getByText("可能需要频繁出差")
      : page.getByRole("row", { name: /测试公司/ }).getByText("可能需要频繁出差");
  const keywordLocator =
    test.info().project.name === "mobile"
      ? page.getByRole("article").getByText("B端")
      : page.getByRole("row", { name: /测试公司/ }).getByText("B端");

  await expect(previewLocator).toBeVisible();
  await expect(keywordLocator).toBeVisible();
});

test("offer decision matrix calculates and persists a recommendation", async ({ page }) => {
  await page.goto("/offers");
  await expect(page.getByRole("heading", { name: "Offer 决策助手" })).toBeVisible();

  await page.getByLabel("公司 A 名称").fill("公司甲");
  await page.getByLabel("公司 B 名称").fill("公司乙");
  await page.getByLabel("因素名称 薪资福利").fill("薪资");
  await page.getByLabel("公司甲 在 薪资 的得分").fill("10");
  await page.getByLabel("公司乙 在 薪资 的得分").fill("1");
  await page.getByRole("button", { name: "添加选项" }).click();
  await expect(page.getByLabel("公司 C 名称")).toHaveValue("公司 C");
  await page.getByRole("button", { name: "删除选项 公司 C" }).click({ force: true });
  await expect(page.getByLabel("公司 C 名称")).toHaveCount(0);
  await page.getByRole("button", { name: "添加选项" }).click();

  await page.getByRole("button", { name: "查看结果" }).click();
  await expect(page.getByText("推荐选择")).toBeVisible();
  await page.getByRole("button", { name: "保存决策" }).click();
  await expect(page.getByText("决策已保存到本地")).toBeVisible();
  await expect(page.getByText("历史决策报告")).toBeVisible();
  await page.getByRole("button", { name: /我的 Offer 对比/ }).click({ force: true });
  await expect(page.getByText("保存时间")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "影响因素 / 权重" }).last()).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click({ force: true });

  await page.reload();
  await expect(page.getByLabel("公司甲 名称")).toHaveValue("公司甲");
  await expect(page.getByLabel("公司乙 名称")).toHaveValue("公司乙");
  await expect(page.getByLabel("公司 C 名称")).toHaveValue("公司 C");
});
