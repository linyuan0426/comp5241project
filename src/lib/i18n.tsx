import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Languages } from "lucide-react";

export type Locale = "en" | "zh";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const storageKey = "pathwise-language:v1";
const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  setLocale: () => undefined,
});

const translations: Record<string, string> = {
  "AI Learning Lab": "AI 学习实验室",
  "Learning Studio": "学习工作室",
  "Learning studio": "学习工作室",
  "Learning workflow": "学习流程",
  Upload: "上传课件",
  "Learning plan": "学习计划",
  "Knowledge Quest": "知识闯关",
  Quiz: "测验",
  Progress: "学习进度",
  Explore: "探索",
  "Fun Practice": "趣味练习",
  "Teach, rescue, explain": "教学、救场、解释",
  "Mock Interview": "模拟面试",
  "Practice with AI": "与 AI 练习",
  "Virtual Workspace": "虚拟工作台",
  "Guided coding lab": "引导式编码实验",
  Practice: "练习",
  Language: "语言",
  English: "英文",
  "中文": "中文",
  Account: "账户",
  "Sign in": "登录",
  "Sign out": "退出登录",
  "Saving…": "正在保存…",
  "Sync needs attention": "同步需要处理",
  "Loading practice…": "正在载入练习…",
  "Loading your account…": "正在载入账户…",
  "Turn static course notes into an active learning loop.":
    "把静态课件变成主动学习闭环。",
  "Document-driven learning": "课件驱动学习",
  "Turn course notes into": "把课程笔记变成",
  "active knowledge.": "主动掌握的知识。",
  "Upload a PDF or PPTX to build a study plan and turn your course material into a puzzle quest with feedback grounded in the original text.":
    "上传 PDF 或 PPTX，生成学习计划，并把课件变成有原文依据的闯关练习。",
  "When you generate a study kit, your original file is saved privately to your account.":
    "生成学习包时，原始文件会私密保存到你的账户。",
  "Sign in before uploading to generate study kits and save your progress.":
    "请先登录，再上传课件以生成学习包并保存进度。",
  "AI summary": "AI 摘要",
  "Guided plan": "引导式计划",
  "Drop your course file here": "把课程文件拖到这里",
  "PDF or PPTX, up to 10 MB and 50 pages or slides":
    "PDF 或 PPTX，最大 10 MB、50 页或幻灯片",
  "Choose PDF or PPTX": "选择 PDF 或 PPTX",
  or: "或者",
  "Load sample": "载入示例",
  "Reading your document...": "正在读取课件...",
  "We couldn't prepare this document": "无法准备这份课件",
  "Return to saved pack": "返回已保存的学习包",
  "Review extracted content": "检查提取内容",
  "Check the text by page and make any corrections before generating your study kit.":
    "按页检查文字，并在生成学习包前修正内容。",
  "Review page": "检查页面",
  "No selectable text on this page.": "此页面没有可选择的文字。",
  "View page images": "查看页面图片",
  "Recognize images again": "重新识别图片",
  "Recognize images on this page": "识别本页图片",
  "Recognition sends these images and an excerpt of the page text to the AI service.":
    "识别会把图片和部分页面文字发送到 AI 服务。",
  "Recognize the images or enter their text here.": "识别图片，或在这里输入图片文字。",
  "Ready to generate": "可以生成",
  "Review required": "需要检查",
  "Generate study kit": "生成学习包",
  "Building your plan...": "正在构建学习计划...",
  "Building your study kit": "正在构建学习包",
  "Building your plan, quiz and document-based game.":
    "正在生成学习计划、测验和课件闯关。",
  "Understand faster": "更快理解",
  "Get the key ideas without rereading every page.": "抓住重点，无需反复通读每一页。",
  "Practice with purpose": "有目的地练习",
  "Follow a plan built from your own material.": "按照由自己的课件生成的学习计划练习。",
  "Close knowledge gaps": "补齐知识缺口",
  "Use instant explanations to learn from mistakes.":
    "通过即时解释从错误中学习。",
  "Use instant explanations to close gaps before your final progress review.":
    "利用即时解释补齐缺口，再进行最终复盘。",
  "Your study map": "你的学习地图",
  "AI generated": "AI 生成",
  "Three focused stages": "三个专注阶段",
  "Build understanding step by step": "逐步建立理解",
  complete: "完成",
  "Practice this concept": "练习这个概念",
  "Play Knowledge Quest": "开始知识闯关",
  "Continue to quiz": "继续测验",
  "Quiz complete": "测验完成",
  "Try scenario challenge": "试试情景挑战",
  "Review questions": "复习题目",
  "View progress": "查看进度",
  "Knowledge check": "知识检查",
  "Five questions. Instant feedback.": "五道题，即时反馈。",
  "Use the explanations to close gaps before your final progress review.":
    "利用解析补齐缺口，再进行最终进度复盘。",
  "Quiz progress": "测验进度",
  "Current score": "当前得分",
  "Answer locked": "答案已锁定",
  "Choose one answer": "选择一个答案",
  Correct: "正确",
  "Not quite": "还差一点",
  "See results": "查看结果",
  "Next question": "下一题",
  "Download original course file": "下载原始课件",
  "Downloading…": "正在下载…",
  "Learning snapshot": "学习概览",
  "Keep the momentum going.": "继续保持学习势头。",
  "Your progress combines completed study tasks and rooms solved in Knowledge Quest.":
    "学习进度综合了已完成的任务和知识闯关房间。",
  "Your progress combines completed study tasks and quiz participation.":
    "学习进度综合了已完成的任务和测验参与情况。",
  overall: "总体",
  "Learning statistics": "学习统计",
  "Plan tasks": "计划任务",
  "Quiz score": "测验得分",
  "Quest rooms": "闯关房间",
  "Review quest": "复习闯关",
  "Knowledge checks": "知识检查",
  "Questions answered": "已答题数",
  "Plan completion": "计划完成度",
  "Stage by stage": "分阶段查看",
  "Concept review": "概念复习",
  "Topics to revisit": "需要复习的主题",
  "Quiz insights": "测验洞察",
  "No missed concepts yet": "目前没有遗漏概念",
  "Finish the quiz or review all answers to see personalized insights.":
    "完成测验或复习全部答案后，即可查看针对性的学习洞察。",
  "Start a fresh demo": "重新开始演示",
  "This clears the current document, plan, quiz answers, and progress.":
    "这会清除当前课件、计划、测验答案和学习进度。",
  "Reset demo": "重置演示",
  "Your account": "你的账户",
  "Create your Pathwise account": "创建 Pathwise 账户",
  "Sign in to Pathwise": "登录 Pathwise",
  Email: "邮箱",
  Password: "密码",
  "Create an account": "创建账户",
  "Back to sign in": "返回登录",
  "Create account": "创建账户",
  "Creating account…": "正在创建账户…",
  "Signing in…": "正在登录…",
  "Sign in with your email and password.": "使用邮箱和密码登录。",
  "Use an email address you can access and a password with at least 8 characters.":
    "请使用可访问的邮箱，并设置至少 8 位密码。",
  "Use cloud version": "使用云端版本",
  "Keep this device’s changes": "保留此设备的修改",
  "Sync progress": "同步进度",
  "Copy guest progress": "复制访客进度",
  "Close account": "关闭账户",
  "Saving progress…": "正在保存进度…",
  "Progress synced": "进度已同步",
  "Cloud sync unavailable. Changes are kept on this device.":
    "云端同步暂不可用，修改会保留在此设备。",
  "Progress changed on another device. Choose which version to keep.":
    "另一台设备修改了进度，请选择要保留的版本。",
  "Confirm your email before signing in.": "登录前请先确认邮箱。",
  "Choose a stronger password and try again.": "请设置更强的密码后重试。",
  "Too many attempts. Wait a moment and try again.": "尝试次数过多，请稍后再试。",
  "Guest progress copied to this account.": "访客进度已复制到此账户。",
  "There is no new guest progress to copy.": "没有新的访客进度可复制。",
  "Guest progress could not be read on this device.": "无法读取此设备上的访客进度。",
  "Could not sign out. Please try again.": "退出登录失败，请重试。",
  "Teach the AI intern": "带教 AI 实习生",
  "Spot a confidently wrong explanation and help this intern recover.":
    "找出一个自信但错误的解释，帮助实习生纠正。",
  "Recommended demo": "推荐演示",
  "DEMO · 2–3 MINUTES": "演示 · 2–3 分钟",
  "Teach the AI intern cases": "带教 AI 实习生案例",
  "Rescue the team cases": "拯救团队案例",
  "Help your roommate cases": "救救室友案例",
  "Decision lab": "决策实验室",
  "Rescue the team": "拯救团队",
  "A teammate has a very optimistic idea. Choose what happens next.":
    "队友提出了一个过于乐观的方案，你来决定接下来怎么做。",
  "2 short cases": "两个短案例",
  "Explain it simply": "简单解释",
  "Help your roommate": "救救室友",
  "They know every word separately. Make the concept click before tomorrow.":
    "室友每个字都认识，但连不起来。请在明天之前讲明白。",
  "Quick explanation": "快速解释",
  "Learning by correcting, deciding, explaining": "在纠正、决策和解释中学习",
  "Make the AI": "让 AI",
  "think harder.": "好好想想。",
  "Three short role reversals turn passive review into a conversation with consequences. Every demo works offline.":
    "三个短小的角色反转，把被动复习变成会改变后续对话的练习。所有演示均可离线体验。",
  "AI INTERN STATUS": "AI 实习生状态",
  "100% confident": "100% 自信",
  "knowledge level under review": "知识水平正在接受审查",
  "VERY CONFIDENT": "非常自信",
  "very confident": "非常自信",
  "· very confident": "· 非常自信",
  "Practice mode": "练习模式",
  "Keep the jokes": "保留幽默",
  On: "开",
  Off: "关",
  "Practice your current study pack": "练习当前学习包",
  "Generate a live task": "生成实时练习",
  "Sign in for a live task": "登录后生成实时练习",
  "Building practice...": "正在生成练习...",
  "Leave practice": "离开练习",
  "Attempt": "尝试",
  "Your first correction": "你的第一次纠正",
  "Explain what is wrong and why it matters.": "说明哪里错了，以及为什么重要。",
  "They still need one detail": "还缺一个关键说明",
  "Your explanation": "你的解释",
  "I put everything in the cache and never update it.":
    "我把所有数据都放进缓存，永远不更新。",
  "Correct the claim, then make the reason concrete...":
    "纠正这句话，再给出具体理由...",
  "No credit for saying “AI is dumb.”": "只说“AI 真笨”不算解释。",
  "Send to AI": "发送给 AI",
  "Checking...": "正在检查...",
  "One more round": "再来一轮",
  "Concept repaired": "概念已纠正",
  "The student has surpassed the teacher.": "学生已经超过老师。",
  "The conclusion is only half the job. Connect it to the behavior.":
    "只下结论还不够，还要把结论和系统行为联系起来。",
  "The intern can now explain the idea from the evidence.":
    "现在实习生能用证据解释这个概念了。",
  "Explain that cached copies can become stale when the source changes.":
    "说明源数据变化后，缓存副本可能变旧。",
  "Explain that the cache needs an update, expiry, or invalidation strategy.":
    "说明缓存需要更新、过期或失效策略。",
  "Explain that related writes must succeed or fail as one atomic operation.":
    "说明相关写入必须作为一次原子操作，一起成功或一起失败。",
  "Explain how a transaction rollback or equivalent recovery protects consistency.":
    "说明事务回滚或等效恢复机制如何保护一致性。",
  "Explain that applications should not store recoverable plaintext passwords.":
    "说明应用不应存储可恢复的明文密码。",
  "Explain salted one-way hashing and verification without recovering the original password.":
    "说明加盐单向哈希如何在不需要恢复原密码的情况下完成验证。",
  "Explain why related changes must commit together.":
    "说明相关修改为什么必须一起提交。",
  "Explain that rollback or compensation removes the incomplete result.":
    "说明回滚或补偿如何移除未完成的结果。",
  "Explain that passwords should not be recoverable by support.":
    "说明客服也不应能够恢复原始密码。",
  "Explain secure reset and hash verification.":
    "说明安全重置和哈希验证。",
  "The checkout team treats three related writes as three independent successes. Explain why that leaves a dangerous partial state.":
    "结账团队把三个相关写入当成三次独立成功。请解释为什么这会留下危险的半完成状态。",
  "The support team can read every learner's password. Explain why faster tickets are not worth keeping that access.":
    "客服团队可以读取每位学生的密码。请解释为什么工单处理更快不值得保留这种权限。",
  "Teaching complete": "教学完成",
  "Keep this explanation": "收藏这段解释",
  "Evidence card": "证据卡",
  "Transfer check": "迁移检查",
  "Applied in a new situation": "已在新情境中应用",
  "Same idea, different disguise": "同一个道理，换了个场景",
  "The AI response could not be completed.": "AI 响应未完成。",
  "The practice request could not be completed.": "练习请求未完成。",
  "Team incident": "团队事故",
  "Decision": "决策",
  "Next decision": "下一项决策",
  "Explain the trade-off": "解释取舍",
  "Your teammate needs the reasoning": "队友需要一个理由",
  "Explain the failure and the trade-off in your own words...":
    "用自己的话解释故障和取舍...",
  "Explain your team decision": "解释你的团队决策",
  "Submit explanation": "提交解释",
  "Checking your reasoning...": "正在检查你的推理...",
  "Useful move": "这一步有帮助",
  "The bug survived": "Bug 毫发无伤",
  "Try another choice": "换一个选择",
  "One final explanation": "最后解释一次",
  "Keep this concept on your list": "把这个概念留在复习清单",
  "You found the topic. Now sharpen the reasoning.":
    "你找到了主题，现在把推理说清楚。",
  "Demo feedback": "演示反馈",
  "AI response": "AI 回应",
  "Learn by showing your reasoning.": "展示推理，真正学会。",
  "Cache freshness": "缓存新鲜度",
  "Async response ordering": "异步响应顺序",
  "Atomic transactions": "事务原子性",
  "Credential storage": "凭据存储",
  "Role reversal": "角色反转",
  "Group Chat": "学习群聊",
  Rescue: "救场",
  "3 study groups need you": "3 个学习群等你救场",
  "Can you save the conversation before someone ships it?":
    "你能在他们把错误方案交付之前救下这场对话吗？",
  Chats: "群聊",
  "3 unread groups": "3 个群有新消息",
  "COMP5241 Team 3": "COMP5241 第三组",
  "Room 508 Survival Chat": "508 宿舍求生群",
  "Intern P: I have optimized everything.": "实习生 P：我已经优化了一切。",
  "Teammate: The last response must be newest.":
    "队友：最后到达的响应一定最新。",
  "Roommate R: The exam is tomorrow.": "室友 R：明天就考试了。",
  "New replies can change your feedback path.":
    "不同回复会把你带到不同的反馈路径。",
  "Today 20:14": "今天 20:14",
  "You were mentioned. Someone needs a reality check.":
    "你被 @ 了。有人急需现实检验。",
  "Pinned challenge": "置顶挑战",
  "More incidents": "更多事故",
  "More chats": "更多群聊",
  "Take the challenge": "加入挑战",
  "Enter the incident": "进入事故",
  now: "刚刚",
  Me: "我",
  "Generate a group from your study pack": "从当前学习包生成一个群聊",
  "Generate a live chat": "生成实时群聊",
  "Sign in for a live chat": "登录后生成实时群聊",
  "AI Intern On Call": "AI 实习生值班室",
  Jokes: "幽默",
  "Close chat": "关闭群聊",
  "Team Lead, Teammates, You": "组长、队友和你",
  "Today · incident channel": "今天 · 事故频道",
  "Team Lead": "组长",
  "group admin": "群管理员",
  "The group agrees with you": "群友认可了你的判断",
  "The bug has joined the group": "Bug 已经混进群了",
  "Type your reply to the group…": "在群里回复…",
  "Study Buddy": "学习搭子",
  "group assistant": "群助手",
  "Nudge AI": "拍一拍 AI",
  "Draft reply": "起草回复",
  Quote: "引用",
  "Quote this message": "引用这条消息",
  "Cancel reply": "取消引用回复",
  "Replying to": "回复",
  "Delivered to the study group": "已发送到学习群",
  "AI reply": "AI 回复",
  "typing… checked": "正在输入… 检查完毕",
  "is typing": "正在输入",
  "Very confident": "非常自信",
  "@you": "@你",
  Today: "今天",
  attempt: "第",
  "Ctrl+Enter sends the reply": "Ctrl+Enter 发送回复",
  "Intern P's caching breakthrough": "实习生 P 的缓存大突破",
  "Intern P": "实习生 P",
  "Take the challenge: Intern P's caching breakthrough":
    "开始挑战：实习生 P 的缓存大突破",
  "Take the challenge: Intern P discovers a race condition":
    "开始挑战：实习生 P 发现了竞态条件",
  "Take the challenge: Intern P ships half a transaction":
    "开始挑战：实习生 P 交付了半个事务",
  "Take the challenge: Intern P's password support plan":
    "开始挑战：实习生 P 的密码客服方案",
  "Enter the incident: Forever Fresh Pricing": "进入事故：永远新鲜的报价",
  "Enter the incident: Latest Arrival Wins": "进入事故：最后到达者胜",
  "Enter the incident: The Three-Step Checkout Disaster":
    "进入事故：三步结账事故",
  "Enter the incident: The Support Inbox Password":
    "进入事故：客服收件箱里的密码",
  "Intern P discovers a race condition": "实习生 P 发现了竞态条件",
  "Forever Fresh Pricing": "永远新鲜的报价",
  "Latest Arrival Wins": "最后到达者胜",
  "My roommate meets the cache": "室友遇见缓存",
  "Roommate R asks one last question": "室友 R 的最后一个问题",
  "Intern P ships half a transaction": "实习生 P 交付了半个事务",
  "I saved the order, charged the card, and then updated inventory. The last step failed, but two out of three is still a passing grade, right?":
    "我先保存订单、再扣款，最后更新库存。第三步失败了，但三步过两步应该也算及格吧？",
  "Two out of three is still a passing grade, right?":
    "三步过两步应该也算及格吧？",
  "Intern P's password support plan": "实习生 P 的密码客服方案",
  "I store passwords in plain text so support can read them back. Debugging has never been easier!":
    "我把密码明文存起来，这样客服就能念给用户听。排查问题从未如此简单！",
  "I store passwords in plain text so support can read them back.":
    "我把密码明文存起来，这样客服就能念给用户听。",
  "Roommate R splits the exam answer": "室友 R 把答案拆成了两半",
  "If step one succeeds and step two fails, why can't we just keep the successful half? Half an answer is still an answer.":
    "如果第一步成功、第二步失败，为什么不能保留成功的那一半？半个答案也是答案啊。",
  "Roommate R checks the password": "室友 R 想查自己的密码",
  "Why can't support just look up my password and tell me? It is my account, so it should be my password to read.":
    "为什么客服不能直接查出我的密码告诉我？这是我的账户，我应该有权阅读。",
  "I optimized the whole product. I put everything in the cache and never update it. Fast, stable, and permanently yesterday.":
    "我优化了整个产品！所有数据都放进缓存，永远不更新。又快又稳定，永久停留在昨天。",
  "I show whichever search response arrives last. It arrived last, so it must know the latest query. That is just science.":
    "哪个搜索响应最后到达，我就显示哪个。它来得最晚，当然最懂最新查询。这是科学。",
  "Your teammate committed a cache that never refreshes. The demo is fast. Customers are seeing last month's sale price.":
    "队友提交了一个永不刷新的缓存。演示速度很快，顾客却还在看上个月的促销价。",
  "Your teammate renders whichever search response arrives last. The search input says 'catalog'. The results say 'cats'.":
    "队友选择显示最后到达的搜索响应。输入框写着“catalog”，结果却全是“cats”。",
  "The Three-Step Checkout Disaster": "三步结账事故",
  "Checkout writes an order, a payment, and an inventory reservation. The last write failed, but the first two are still in the database.":
    "结账流程会写入订单、付款和库存预留。最后一步失败了，但前两项仍然留在数据库里。",
  "The Support Inbox Password": "客服收件箱里的密码",
  "The backend team added a support endpoint that returns plaintext passwords. They say it saves five minutes per ticket.":
    "后端团队新增了一个能返回明文密码的客服接口，说这样每张工单能省五分钟。",
  "The database has the correct price, but the product page keeps showing the old one.":
    "数据库里已经是正确价格，但商品页仍在显示旧价格。",
  "What would you check first?": "你会先检查什么？",
  "Which fix respects the requirement?": "哪个修复符合需求？",
  "What evidence would expose the bug?": "什么证据能让 Bug 现形？",
  "How should the UI handle responses?": "界面应该怎样处理响应？",
  "What evidence would you inspect first?": "你会先检查什么证据？",
  "The learner sees a payment error, but the payment service accepted the charge.":
    "学生看到支付报错，但支付服务其实已经扣款。",
  "Compare all three records after the failure to find the partial commit":
    "失败后同时检查三条记录，找出部分提交",
  "The payment exists, the order exists, and inventory was never reserved. You found an inconsistent committed state.":
    "付款和订单已经写入，库存却没有预留。你找到了已提交但不一致的状态。",
  "Change the checkout button from blue to green":
    "把结账按钮从蓝色改成绿色",
  "The new color looks optimistic. The database still contains a charge without a seat.":
    "新颜色看起来很积极，但数据库里依然有扣款却没有座位。",
  "Make the error message say “probably fine”":
    "把错误提示改成“应该没事”",
  "The message is friendlier, but the learner has still been charged.":
    "提示更友好了，但学生依然已经被扣款。",
  "Which repair makes the checkout consistent?": "哪种修复能让结账状态保持一致？",
  "The requirement is that either the payment and seat both commit, or neither is saved.":
    "需求是付款和座位必须一起提交，或者两者都不保存。",
  "Run the required writes in one transaction and roll back on failure":
    "把相关写入放进同一个事务，失败时回滚",
  "Related writes now commit together or fail together, so no charge survives without a seat.":
    "相关写入现在会一起成功或一起失败，因此不会出现只扣款却没有座位的情况。",
  "Automatically retry the last step without checking earlier writes":
    "不检查前面的写入，直接自动重试最后一步",
  "Retrying may duplicate data while leaving the initial partial state unresolved.":
    "重试可能制造重复数据，同时最初的不完整状态仍然存在。",
  "Hide failed records from the admin page": "在管理后台隐藏失败记录",
  "The partial state still exists and can corrupt payments and inventory.":
    "不完整状态仍然存在，并可能进一步破坏付款和库存。",
  "Why is an automatic retry unsafe without first defining the transaction boundary?":
    "为什么在没有定义事务边界之前，自动重试并不安全？",
  "What is the first risk to verify?": "首先要核验哪项风险？",
  "The reset flow already works, but support occasionally reads passwords from the database.":
    "密码重置流程已经可用，但客服偶尔仍会直接从数据库读取密码。",
  "Audit storage, logs, and support access for plaintext credentials":
    "检查密码存储、日志和客服访问中是否存在明文凭据",
  "Plaintext passwords are present in the database and one debug log. You identified the exposure path.":
    "数据库中以及一份调试日志里都有明文密码。你找到了暴露路径。",
  "Rename the support button to “Secure Lookup”":
    "把客服按钮改名为“安全查询”",
  "The label changed. The system still exposes the original password.":
    "按钮名称变了，但系统仍然暴露原始密码。",
  "Add a loading spinner to make the lookup feel safer":
    "给查询加一个加载动画，让它看起来更安全",
  "A spinner does not protect a credential that can be read directly.":
    "加载动画无法保护一个能被直接读取的凭据。",
  "Which change should the team ship?": "团队应该发布哪种修改？",
  "Support still needs to help locked-out learners.":
    "客服仍需要帮助无法登录的学生。",
  "Store salted one-way hashes and use a secure reset flow":
    "存储加盐的单向哈希，并使用安全的重置流程",
  "Support can help without recovering or seeing the original password.":
    "客服无需恢复或查看原始密码，也能帮助学生。",
  "Keep reversible encryption and give every support agent the key":
    "保留可逆加密，并把密钥发给每位客服",
  "Reversible storage still creates a path to recover passwords and multiplies the access risk.":
    "可逆存储仍会留下恢复密码的路径，还扩大了访问风险。",
  "Encrypt passwords only in the browser with a public algorithm":
    "只在浏览器里用公开算法加密密码",
  "The server still needs a safe verifier, and improvised client storage does not solve credential exposure.":
    "服务器仍然需要安全验证器，临时的客户端加密并不能解决凭据暴露。",
  "Why does a secure reset flow beat letting support recover the original password?":
    "为什么安全重置流程优于让客服恢复原始密码？",
  "A payment succeeds but updating the seat reservation fails. What should happen to the payment?":
    "付款成功但座位预留更新失败。这笔付款应该怎么处理？",
  "Keep the payment and label the missing seat a rounding error":
    "保留付款，并把缺失的座位称为舍入误差",
  "Roll back or compensate so the learner is not charged for no seat":
    "回滚或补偿，确保学生没有座位时不会被扣款",
  "Show a success page and let support discover the gap later":
    "显示成功页面，让客服以后自己发现问题",
  "Support needs to help a learner who forgot a password. What should the product do?":
    "客服需要帮助一名忘记密码的学生。产品应该怎么做？",
  "Email the old password from the database": "从数据库把旧密码发到邮箱",
  "Ask support to read the password aloud": "让客服把密码念出来",
  "Offer a secure reset flow and never recover the original password":
    "提供安全重置流程，永远不恢复原始密码",
  "Compare the source price with the cached copy and its timestamp":
    "比较源价格、缓存副本及其时间戳",
  "Check whether the old price uses a deprecated font": "检查旧价格是否用了废弃字体",
  "Ask the browser to draw a newer favicon": "让浏览器画一个更新的网站图标",
  "Use a one-minute expiry or targeted invalidation":
    "使用一分钟过期时间或定向失效",
  "Keep the copy forever and call it historical accuracy":
    "永远保留缓存，并称之为历史准确性",
  "Remove caching and query the database for every request":
    "移除缓存，每次请求都查询数据库",
  "Delay the first response so it arrives after the second":
    "让第一个响应延迟到第二个之后到达",
  "Zoom the page to 110 percent": "把页面放大到 110%",
  "Reload until the right result appears": "一直刷新直到正确结果出现",
  "Apply a response only if its request is still the latest query":
    "仅当响应仍属于最新查询时才显示",
  "Apply responses in arrival order": "按响应到达顺序显示",
  "Show whichever result list is longest": "显示最长的那组结果",
  of: "共",
  "Why is refreshing every request not the only correct answer here?":
    "为什么每次请求都刷新并不是这里唯一正确的答案？",
  "Why does debouncing improve the situation but not prove every stale response is safe?":
    "为什么防抖能改善问题，却不能证明每个旧响应都安全？",
  "The source changes while the cached copy stays old. A one-minute expiry keeps data fresh enough without refreshing every request.":
    "源数据已经变化，缓存副本却还是旧的。一分钟过期能让数据足够新鲜，同时不必每次请求都刷新。",
  "Correct the misleading claim, then explain the mechanism and the user impact.":
    "纠正误导性的说法，然后解释机制和对用户的影响。",
  "Explain it in your own words": "用自己的话解释",
  "Submit": "提交",
  "Demo mode": "演示模式",
  "Live AI": "实时 AI",
  "No hire/no-hire decision": "不做出录用或不录用决定",
  "AI mock interview": "AI 模拟面试",
  "SESSION PROGRESS": "会话进度",
  "Session progress": "会话进度",
  "Entry-level SWE": "入门软件工程师",
  "Answer naturally. One follow-up will explore a missing detail before the next topic.":
    "自然作答。每道题会追问一个遗漏细节，再进入下一主题。",
  "Up next": "下一项",
  QUESTION: "题目",
  Question: "题目",
  INTERVIEWER: "面试官",
  Interviewer: "面试官",
  YOU: "你",
  "FOLLOW-UP": "追问",
  "Follow-up": "追问",
  Restart: "重新开始",
  Continue: "继续",
  "Pathwise Interviewer": "Pathwise 面试官",
  "Local simulated interviewer": "本地模拟面试官",
  "Demo mode. Follow-ups and scores are simulated locally, not generated by a live model.":
    "演示模式。追问和评分由本地模拟，不是实时模型生成。",
  "Demo mode.": "演示模式。",
  "Follow-ups and scores are simulated locally, not generated by a live model.":
    "追问和评分由本地模拟，不是实时模型生成。",
  "Enter to send · Shift+Enter for a new line":
    "Enter 发送 · Shift+Enter 换行",
  "Coding reasoning": "编码推理",
  "Debugging and testing": "调试与测试",
  "System design": "系统设计",
  Collaboration: "团队协作",
  "Design a function that returns the third most frequent word in a list of article titles. Walk me through your data structures, complexity, and how you would handle empty input or ties.":
    "设计一个函数，返回一篇文章标题列表中频率第三高的词。请说明数据结构、复杂度，以及如何处理空输入和并列情况。",
  "What would change if the title collection were too large to fit comfortably in memory?":
    "如果标题集合大到无法舒适地放入内存，方案会怎么变化？",
  "A login endpoint intermittently returns HTTP 500 only when the email contains mixed-case letters. Describe how you would isolate the cause and what tests you would add.":
    "登录接口只在邮箱包含大小写混合字母时间歇返回 HTTP 500。你会如何隔离原因，并补充哪些测试？",
  "Which hypothesis would you test first, and what observation would confirm it?":
    "你会先验证哪个假设？什么观察结果能够支持这个假设？",
  "Design how learner progress for document plans and quizzes should flow from the browser to storage and back. Cover API shape, persistence, synchronization, and failure handling.":
    "请设计课件计划与测验的学习进度如何从浏览器流向存储再返回，并说明 API、持久化、同步和故障处理。",
  "What happens if the same learner edits progress from two tabs at almost the same time?":
    "如果同一个学习者几乎同时在两个标签页中修改进度，会发生什么？",
  "Your teammate's API change breaks the frontend shortly before a demo. Explain how you would communicate the issue, prioritize the response, and contain the risk.":
    "演示前不久，队友的 API 修改导致前端崩溃。你会如何沟通问题、确定处理优先级并控制风险？",
  "What would you say if the product owner asks the team to hide the problem until after the demo?":
    "如果产品负责人要求团队在演示后再公开问题，你会怎么回应？",
  "Practice the thinking,": "练习思考过程，",
  "not just the answer.": "而不只是答案。",
  "Choose your session": "选择练习方式",
  "How would you like to practice?": "你想怎么练习？",
  "Real-time": "实时",
  "Live AI interview": "实时 AI 面试",
  "Try the complete flow": "体验完整流程",
  "Start live interview": "开始实时面试",
  "Sign in to start": "登录后开始",
  "Start demo interview": "开始演示面试",
  "No API calls are made. Results are for interface demonstration and reflection.":
    "不会调用 API，结果用于界面演示和反思。",
  "Task interview": "任务面试",
  "Task Interview": "任务面试",
  "Explain your": "解释你的",
  "practice decisions.": "练习决策。",
  "Interviewer is thinking...": "面试官正在思考...",
  "Send answer": "发送答案",
  "Sending...": "正在发送...",
  "Answer the follow-up": "回答追问",
  "Review transcript": "复习对话记录",
  "Your answer": "你的答案",
  "Hide transcript": "隐藏对话记录",
  "Workflow progress": "流程进度",
  "GUIDED SIMULATION": "引导式模拟",
  "Update a campus event page and take the change from import to push.":
    "修改校园活动页面，并完成从导入到推送的整个流程。",
  "Restart lab": "重新开始实验",
  "Go to Source Control": "前往源代码管理",
  "SIMULATED TERMINAL": "模拟终端",
  Clean: "工作区干净",
  "Save and pass the simulated check to stage the file.":
    "保存文件并通过模拟检查后，即可暂存。",
  "Stage changes": "暂存修改",
  "Guided demo · preset responses": "引导式演示 · 预设回复",
  "The workshop’s signup button still shows a placeholder. Update it so students know they can register.":
    "工作坊的报名按钮仍显示占位文字。请更新它，让学生知道可以报名。",
  "Open signup.js. It sets the text on the workshop’s registration button.":
    "打开 signup.js，它会设置工作坊报名按钮的文字。",
  "main Simulated workspace JavaScript": "main 模拟工作台 JavaScript",
  "Restart this workspace and clear its practice history?":
    "重新开始工作台并清除练习记录？",
  "Explorer": "资源管理器",
  "Source Control": "源代码管理",
  "AI assistant": "AI 助手",
  "Toggle Explorer": "显示或隐藏资源管理器",
  "Toggle AI assistant": "显示或隐藏 AI 助手",
  "Hide AI assistant": "隐藏 AI 助手",
  "Project files": "项目文件",
  "Workspace panels": "工作台面板",
  "Code editor": "代码编辑器",
  "Read only": "只读",
  Unsaved: "未保存",
  Saved: "已保存",
  Modified: "已修改",
  "Save file": "保存文件",
  "Check change": "检查修改",
  "Save your edit before checking or staging it.": "检查或暂存前请先保存修改。",
  "Change only the button label, then save and check again.":
    "只修改按钮文字，然后保存并重新检查。",
  "Simulated preview": "模拟预览",
  Original: "原始",
  Changed: "修改后",
  "Commit message": "提交信息",
  "Commit message is required.": "必须填写提交信息。",
  "Stage change": "暂存修改",
  "Commit change": "提交修改",
  "Push change": "推送修改",
  "Open registration": "开放报名",
  "Coming soon": "即将开放",
  Import: "导入",
  "Edit & save": "编辑并保存",
  Check: "检查",
  Stage: "暂存",
  Commit: "提交",
  Push: "推送",
  "Scenario Challenge": "情景挑战",
  "Choose a scenario": "选择情景",
  "Choose your action": "选择行动",
  "Check solution": "检查答案",
  "Unlock next room": "解锁下一房间",
  "Match concepts": "概念配对",
  "Restore the sequence": "恢复顺序",
  "Investigate the AI draft": "审查 AI 草稿",
  "Apply the lesson": "应用知识",
  "Quest map": "闯关地图",
  "Complete the mission": "完成任务",
  "Find the rules": "找出规则",
  "Choose the excerpt that proves the claim is wrong": "选择能证明该说法错误的原文",
  "Choose a correction supported by the excerpt": "选择有原文支持的修正",
  "Describe which claims the evidence supports and what you would check next.":
    "说明证据支持哪些说法，以及下一步要检查什么。",
  "See quest results": "查看闯关结果",
  "Not started": "尚未开始",
  "In progress": "进行中",
  Complete: "已完成",
  "Challenge complete": "挑战完成",
  "Replay challenge": "重新挑战",
  "Finish challenge": "完成挑战",
  "Decision history": "决策记录",
  "Back to learning": "返回学习",
  "Back to practice": "返回练习",
  "Practice task interview": "练习任务面试",
  "Check a new claim": "检查新说法",
  "Verify an AI claim": "核验 AI 说法",
  "Meeting notes": "会议记录",
  "Review saved changes": "复习已保存的修改",
  "Questions to revisit": "待复习问题",
  "Show hint": "显示提示",
  "Hide hint": "隐藏提示",
  "Ask for a hint": "请求提示",
  "Ask for next hint": "请求下一个提示",
  "Send": "发送",
  "Close": "关闭",
};

function translatePattern(source: string): string | null {
  let match = source.match(/^Question (\d+) of (\d+)$/);
  if (match) return `第 ${match[1]} 题，共 ${match[2]} 题`;

  match = source.match(/^([\d,]+) of ([\d,]+) tasks complete$/);
  if (match) return `已完成 ${match[1]}/${match[2]} 项任务`;

  match = source.match(/^([\d,]+) out of ([\d,]+) correct$/);
  if (match) return `答对 ${match[1]}/${match[2]} 题`;

  match = source.match(/^([\d,]+) of ([\d,]+) answered$/);
  if (match) return `已答 ${match[1]}/${match[2]} 题`;

  match = source.match(/^Page (\d+) of (\d+)$/);
  if (match) return `第 ${match[1]} 页，共 ${match[2]} 页`;

  match = source.match(/^Page (\d+)$/);
  if (match) return `第 ${match[1]} 页`;

  match = source.match(/^(\d+) pages? have images awaiting recognition or manual transcription\.$/);
  if (match) return `${match[1]} 页有图片等待识别或手动转写。`;

  match = source.match(/^(\d+) images? (?:is|are) too large or in an unsupported format\.$/);
  if (match) return `${match[1]} 张图片过大或格式不受支持。`;

  match = source.match(/^([\d,]+)% (?:complete|completed)$/);
  if (match) return `完成 ${match[1]}%`;

  match = source.match(/^(\d+) pages? · ([\d,]+) characters$/);
  if (match) return `${match[1]} 页 · ${match[2]} 个字符`;

  match = source.match(/^([\d,]+) ?\/2000/);
  if (match) return `${match[1]}/2000 · 只说“AI 真笨”不算解释。`;

  match = source.match(/^of (\d+)$/);
  if (match) return `共 ${match[1]}`;

  match = source.match(/^Attempt (\d+) \/ (\d+)$/);
  if (match) return `尝试 ${match[1]}/${match[2]}`;

  match = source.match(/^attempt (\d+)$/);
  if (match) return `第 ${match[1]} 次`;

  match = source.match(/^(\d+) of (\d+)$/);
  if (match) return `第 ${match[1]} 项，共 ${match[2]} 项`;

  match = source.match(/^(\d+) members$/);
  if (match) return `${match[1]} 人`;

  match = source.match(/^(\d+) votes$/);
  if (match) return `${match[1]} 票`;

  match = source.match(/^(\d+) online$/);
  if (match) return `${match[1]} 人在线`;

  match = source.match(/^(\d+)m$/);
  if (match) return `${match[1]} 分钟前`;

  match = source.match(/^Today (\d+:\d+)$/);
  if (match) return `今天 ${match[1]}`;

  match = source.match(/^Today (\d+:\d+) · attempt (\d+) of 3$/);
  if (match) return `今天 ${match[1]} · 第 ${match[2]} 次尝试`;

  match = source.match(/^GROUP POLL · (\d+)\/(\d+)$/);
  if (match) return `群投票 · ${match[1]}/${match[2]}`;

  match = source.match(/^Pinned incident: (.+)$/);
  if (match) {
    const translated = translateKnownText(match[1]);
    return `群公告：${translated ?? match[1]}`;
  }

  match = source.match(/^You nudged (.+)'s keyboard\. It is reconsidering its life choices\.$/);
  if (match) return `你拍了拍 ${match[1]} 的键盘。它正在重新思考人生。`;

  match = source.match(/^React with (.+)$/);
  if (match) return `添加回应 ${match[1]}`;

  match = source.match(/^Remove reaction (.+)$/);
  if (match) return `取消回应 ${match[1]}`;

  match = source.match(/^Decision (\d+) of (\d+)$/);
  if (match) return `第 ${match[1]} 项决策，共 ${match[2]} 项`;

  match = source.match(/^Question (\d+): (pending|correct|incorrect)$/);
  if (match) {
    const state = match[2] === "correct" ? "正确" : match[2] === "incorrect" ? "错误" : "待答";
    return `第 ${match[1]} 题：${state}`;
  }

  match = source.match(/^Discussion of (\d+) questions completed\.$/);
  if (match) return `已完成 ${match[1]} 道题的讨论。`;

  match = source.match(/^\(\d+\) (.*)$/);
  if (match) {
    const translated = translateKnownText(match[1]);
    return translated ? `（${source.slice(1, source.indexOf(")") + 1)} ${translated}` : null;
  }

  return null;
}

function translateKnownText(source: string): string | null {
  const normalized = source.replace(/\s+/g, " ").trim();
  return translations[normalized] ?? translatePattern(normalized);
}

type OriginalValue = {
  source: string;
  translated: string;
};

const textOriginals = new WeakMap<Text, OriginalValue>();
const childTextOriginals = new WeakMap<Node, Map<number, OriginalValue>>();
const attributeOriginals = new WeakMap<Element, Map<string, OriginalValue>>();
const translatedAttributes = ["placeholder", "aria-label", "title", "alt"] as const;
const skippedElements = "SCRIPT, STYLE, PRE, CODE, TEXTAREA";
const reverseTranslations = new Map(
  Object.entries(translations).map(([english, chinese]) => [chinese, english]),
);

function restoreTranslatedAttribute(source: string) {
  return reverseTranslations.get(source.trim()) ?? source;
}

function translateTextNode(node: Text, locale: Locale) {
  if (node.parentElement?.closest(skippedElements)) return;
  const current = node.data;
  const parent = node.parentNode;
  const childIndex = parent ? Array.from(parent.childNodes).indexOf(node) : -1;
  const slot = parent && childIndex >= 0
    ? childTextOriginals.get(parent) ?? new Map<number, OriginalValue>()
    : null;
  if (parent && childIndex >= 0 && slot && !childTextOriginals.has(parent)) {
    childTextOriginals.set(parent, slot);
  }
  const previous = textOriginals.get(node) ?? slot?.get(childIndex);

  if (current === previous?.translated) {
    const source = previous.source;
    const translated = locale === "zh" ? translateKnownText(source) : null;
    const next = locale === "zh" && translated ? translated : source;
    slot?.set(childIndex, { source, translated: next });
    textOriginals.set(node, { source, translated: next });
    if (next !== current) node.data = next;
    return;
  }

  const trimmed = current.trim();
  if (!trimmed) return;
  const translated = locale === "zh" ? translateKnownText(trimmed) : null;
  const leading = current.match(/^\s*/)?.[0] ?? "";
  const trailing = current.match(/\s*$/)?.[0] ?? "";
  const next = translated ? `${leading}${translated}${trailing}` : current;
  const original = { source: current, translated: next };
  textOriginals.set(node, original);
  slot?.set(childIndex, original);
  if (next !== current) node.data = next;
}

function translateElementAttributes(element: Element, locale: Locale) {
  for (const name of translatedAttributes) {
    const value = element.getAttribute(name);
    if (!value) continue;
    let values = attributeOriginals.get(element);
    if (!values) {
      values = new Map();
      attributeOriginals.set(element, values);
    }
    const previous = values.get(name);
    if (value === previous?.translated) {
      const translated = locale === "zh" ? translateKnownText(previous.source) : null;
      const next = locale === "zh" && translated
        ? translated
        : restoreTranslatedAttribute(previous.source);
      if (next !== value) element.setAttribute(name, next);
      continue;
    }
    const translated = locale === "zh"
      ? translateKnownText(value)
      : restoreTranslatedAttribute(value);
    const next = translated ?? value;
    values.set(name, {
      source: locale === "en" ? next : value,
      translated: next,
    });
    if (next !== value) element.setAttribute(name, next);
  }
}

function translateTree(node: Node, locale: Locale) {
  if (node.nodeType === Node.TEXT_NODE) {
    translateTextNode(node as Text, locale);
    return;
  }
  if (!(node instanceof Element)) return;
  translateElementAttributes(node, locale);
  if (node.matches(skippedElements)) return;
  for (const child of node.childNodes) translateTree(child, locale);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      return localStorage.getItem(storageKey) === "zh" ? "zh" : "en";
    } catch {
      return "en";
    }
  });
  const localeRef = useRef(locale);
  localeRef.current = locale;

  function setLocale(next: Locale) {
    setLocaleState(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // The current page still switches if storage is unavailable.
    }
  }

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = locale === "zh" ? "Pathwise AI 学习" : "Pathwise AI Learning";
    translateTree(document.body, locale);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          translateElementAttributes(mutation.target, localeRef.current);
        } else if (mutation.type === "characterData" && mutation.target instanceof Text) {
          translateTextNode(mutation.target, localeRef.current);
        } else {
          for (const node of mutation.addedNodes) translateTree(node, localeRef.current);
        }
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [...translatedAttributes],
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSwitch() {
  const { locale, setLocale } = useLanguage();
  return (
    <div className="language-switch" role="group" aria-label="Language">
      <Languages size={15} aria-hidden="true" />
      <button
        aria-pressed={locale === "en"}
        className={locale === "en" ? "active" : ""}
        onClick={() => setLocale("en")}
        type="button"
      >
        EN
      </button>
      <button
        aria-pressed={locale === "zh"}
        className={locale === "zh" ? "active" : ""}
        onClick={() => setLocale("zh")}
        type="button"
      >
        中文
      </button>
    </div>
  );
}
