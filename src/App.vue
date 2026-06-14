<template>
  <t-layout class="app-shell">
    <t-header class="app-header">
      <section class="header-title">
        <t-typography-title :level="2">求职鹅｜学生求职成长陪伴智能体</t-typography-title>
        <t-typography-text>上传经历、对话倾诉，AI 自动沉淀求职档案并陪你走向鹅厂 Offer</t-typography-text>
      </section>
      <t-space break-line>
        <t-tag theme="primary" variant="light">AI 陪伴</t-tag>
        <t-tag theme="success" variant="light">经历资产化</t-tag>
        <t-tag theme="warning" variant="light">鹅厂建议</t-tag>
      </t-space>
    </t-header>

    <t-content class="app-content">
      <t-row :gutter="[24, 24]">
        <t-col :xs="12" :xl="7">
          <t-card title="求职鹅对话" bordered>
            <template #actions>
              <t-button theme="default" variant="text" @click="loadSample">一键填入示例</t-button>
            </template>

            <t-space direction="vertical" size="large" class="full-width">
              <t-card title="对话上下文" bordered>
                <t-space direction="vertical" class="full-width">
                  <t-space align="center" break-line>
                    <t-tag theme="primary" variant="light">当前阶段</t-tag>
                    <t-radio-group v-model="profile.stage" variant="default-filled" @change="refreshAll">
                      <t-radio-button value="大一">大一</t-radio-button>
                      <t-radio-button value="大二">大二</t-radio-button>
                      <t-radio-button value="大三">大三</t-radio-button>
                      <t-radio-button value="大四/研">大四/研</t-radio-button>
                    </t-radio-group>
                    <t-tag theme="success" variant="light">目标方向</t-tag>
                    <t-select v-model="profile.target" :options="targetOptions" @change="refreshAll" />
                  </t-space>
                  <t-upload
                    v-model="files"
                    theme="file"
                    :auto-upload="false"
                    :multiple="true"
                    :max="4"
                    :allow-upload-duplicate-file="true"
                    placeholder="上传简历/项目文档/PDF/Word/txt/md，求职鹅会解析并写入长期经历档案"
                    @select-change="handleSelectChange"
                  />
                </t-space>
              </t-card>

              <t-chat-list :data="chatList" :clear-history="chatList.length > 1" @clear="clearChat">
                <template #content="{ item }">
                  <template v-for="(content, index) in item.content" :key="index">
                    <t-chat-content :content="content.data" :role="item.role" />
                  </template>
                </template>
                <template #footer>
                  <t-chat-sender
                    v-model="chatInput"
                    :textarea-props="{ placeholder: '直接和求职鹅说：我做过什么、上传材料里有什么、我哪里焦虑、我想投什么方向……' }"
                    @send="sendMessage"
                  >
                    <template #suffix="{ renderPresets }">
                      <component :is="renderPresets([])" />
                    </template>
                  </t-chat-sender>
                </template>
              </t-chat-list>
            </t-space>
          </t-card>
        </t-col>

        <t-col :xs="12" :xl="5">
          <t-space direction="vertical" size="large" class="full-width">
            <t-card title="求职资产仪表盘" bordered>
              <t-row :gutter="[16, 16]">
                <t-col :span="4">
                  <t-statistic title="经历成熟度" :value="assetScore" suffix="%" />
                </t-col>
                <t-col :span="4">
                  <t-statistic title="岗位匹配" :value="matchScore" suffix="%" />
                </t-col>
                <t-col :span="4">
                  <t-statistic title="行动清晰度" :value="actionScore" suffix="%" />
                </t-col>
              </t-row>
            </t-card>

            <t-button theme="primary" variant="outline" block @click="exportDocument">导出求职文档 Markdown</t-button>

            <t-tabs v-model="assetTab">
              <t-tab-panel value="document" label="经历文档">
                <t-card title="AI 自动整理文档" bordered>
                  <t-descriptions bordered :column="1" :data="documentDescriptions" />
                  <t-divider />
                  <t-space direction="vertical">
                    <t-typography-title :level="5">STAR 经历稿</t-typography-title>
                    <t-typography-paragraph>{{ starStory }}</t-typography-paragraph>
                    <t-typography-title :level="5">简历 Bullet</t-typography-title>
                    <t-list :split="true">
                      <t-list-item v-for="item in resumeBullets" :key="item">{{ item }}</t-list-item>
                    </t-list>
                  </t-space>
                </t-card>
              </t-tab-panel>

              <t-tab-panel value="advice" label="发展建议">
                <t-card title="鹅厂方向建议" bordered>
                  <template #actions>
                    <t-button theme="primary" variant="text" :loading="isAnalyzing" @click="regenerateAdvice">重新生成发展建议</t-button>
                  </template>
                  <t-space direction="vertical" size="large" class="full-width">
                    <t-alert theme="success" :message="targetAdvice" />
                    <t-table row-key="name" :data="displayRoleMatches" :columns="roleColumns" :pagination="null" bordered>
                      <template #score="{ row }">
                        <t-progress :percentage="row.score" theme="line" />
                      </template>
                    </t-table>
                    <t-timeline>
                      <t-timeline-item v-for="item in displayGrowthPlan" :key="item.title" :label="item.label">
                        {{ item.title }}：{{ item.content }}
                      </t-timeline-item>
                    </t-timeline>
                  </t-space>
                </t-card>
              </t-tab-panel>

              <t-tab-panel value="care" label="情绪陪伴">
                <t-card title="求职鹅的陪伴反馈" bordered>
                  <template #actions>
                    <t-button theme="primary" variant="text" :loading="isAnalyzing" @click="regenerateCare">重新生成情绪陪伴</t-button>
                  </template>
                  <t-space direction="vertical" size="large">
                    <t-alert theme="warning" :message="careMessage" />
                    <t-collapse :default-value="['1']">
                      <t-collapse-panel value="1" header="焦虑急救 15 分钟">
                        {{ rescuePlan }}
                      </t-collapse-panel>
                      <t-collapse-panel value="2" header="下一步只做一件事">
                        {{ nextOneThing }}
                      </t-collapse-panel>
                    </t-collapse>
                  </t-space>
                </t-card>
              </t-tab-panel>
            </t-tabs>
          </t-space>
        </t-col>
      </t-row>
    </t-content>
  </t-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import gooseOne from './assets/goose-1.png';
import gooseTwo from './assets/goose-2.png';
import gooseThree from './assets/goose-3.png';
import { chatWithLlm, streamWithLlm } from './services/llm';

type ChatRole = 'user' | 'assistant';

interface ChatContent {
  type: 'text' | 'markdown';
  data: string;
}

interface ChatMessage {
  avatar: string;
  name: string;
  datetime: string;
  role: ChatRole;
  content: ChatContent[];
}

interface Profile {
  stage: string;
  target: string;
}

interface RoleMatch {
  name: string;
  score: number;
  reason: string;
}

interface GrowthPlanItem {
  label: string;
  title: string;
  content: string;
}

interface UploadLikeFile {
  name?: string;
  size?: number;
  raw?: File;
  originFile?: File;
}

interface AssetMemory {
  title?: string;
  summary?: string;
  scores?: {
    asset?: number;
    match?: number;
    action?: number;
  };
  abilityTags?: string[];
  starStory?: string;
  resumeBullets?: string[];
  missingInfo?: string[];
  roleMatches?: RoleMatch[];
  careMessage?: string;
  growthPlan?: GrowthPlanItem[];
  nextAction?: string;
}

const profile = reactive<Profile>({
  stage: '大三',
  target: '产品策划',
});

const targetOptions = [
  { label: '技术研发', value: '技术研发' },
  { label: '产品策划', value: '产品策划' },
  { label: '数据分析', value: '数据分析' },
  { label: '游戏策划', value: '游戏策划' },
  { label: '内容/市场运营', value: '内容/市场运营' },
  { label: '用户体验设计', value: '用户体验设计' },
];

const gooseAvatars = [gooseOne, gooseTwo, gooseThree];
const gooseAvatar = gooseAvatars[Math.floor(Math.random() * gooseAvatars.length)];

const files = ref<UploadLikeFile[]>([]);
const chatInput = ref('');
const assetTab = ref('document');
const isStreaming = ref(false);
const isAnalyzing = ref(false);
const assetMemory = ref<AssetMemory>({});
const collectedExperience = ref('我在大二下做过一个校园二手交易小程序，负责需求调研、原型设计和部分前端页面。项目最后有 200 多名同学试用，但我不知道这算不算有价值的经历，也担心自己比不过有大厂实习的同学。');

const now = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

const chatList = ref<ChatMessage[]>([
  {
    avatar: gooseAvatar,
    name: '求职鹅',
    datetime: now(),
    role: 'assistant',
    content: [
      {
        type: 'markdown',
        data: '嘎嘎，我是你的 **求职鹅**。你不用一上来就会写简历，先把做过的事讲给我听：课程项目、社团活动、比赛、实习，甚至失败和焦虑都可以。我会帮你整理成求职文档、简历表达、面试故事和下一步行动。',
      },
    ],
  },
]);

const normalizedText = computed(() => collectedExperience.value.trim() || '暂未输入经历。');
const hasAnxiety = computed(() => /焦虑|担心|迷茫|不会|比不过|普通|失败|害怕|不知道/.test(normalizedText.value));
const hasData = computed(() => /\d|一百|两百|百|千|万|%|用户|试用|增长|完成|上线|获奖/.test(normalizedText.value));
const hasTeam = computed(() => /团队|小组|协作|负责|沟通|社团|组织|推进/.test(normalizedText.value));
const hasProduct = computed(() => /需求|用户|调研|原型|产品|体验|流程|功能/.test(normalizedText.value));
const hasTech = computed(() => /代码|前端|后端|算法|模型|数据|系统|小程序|开发|接口/.test(normalizedText.value));
const hasOperation = computed(() => /活动|运营|内容|传播|社群|增长|转化|公众号/.test(normalizedText.value));

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const assetScore = computed(() => clampScore(assetMemory.value.scores?.asset ?? (42 + (hasData.value ? 18 : 0) + (hasTeam.value ? 14 : 0) + (hasProduct.value || hasTech.value ? 14 : 0) + Math.min(18, normalizedText.value.length / 35))));
const matchScore = computed(() => clampScore(assetMemory.value.scores?.match ?? displayRoleMatches.value[0]?.score ?? 60));
const actionScore = computed(() => clampScore(assetMemory.value.scores?.action ?? (48 + (profile.stage === '大一' ? 8 : 0) + (profile.stage === '大二' ? 16 : 0) + (profile.stage === '大三' ? 24 : 0) + (profile.stage === '大四/研' ? 30 : 0) + (hasData.value ? 12 : 0))));

const abilityTags = computed(() => {
  const tags = [];
  if (hasProduct.value) tags.push('用户洞察', '需求分析');
  if (hasTech.value) tags.push('技术理解', '项目交付');
  if (hasOperation.value) tags.push('活动运营', '增长意识');
  if (hasTeam.value) tags.push('协作推进');
  if (hasData.value) tags.push('结果量化');
  if (!tags.length) tags.push('经历挖掘', '自我表达');
  return Array.from(new Set(tags));
});

const displayAbilityTags = computed(() => assetMemory.value.abilityTags?.length ? assetMemory.value.abilityTags : abilityTags.value);
const displayMissingInfo = computed(() => assetMemory.value.missingInfo?.length ? assetMemory.value.missingInfo.join('、') : missingInfo.value);
const displayGrowthPlan = computed(() => assetMemory.value.growthPlan?.length ? assetMemory.value.growthPlan : growthPlan.value);
const displayRoleMatches = computed(() => assetMemory.value.roleMatches?.length ? assetMemory.value.roleMatches : rankedRoles.value);

const documentDescriptions = computed(() => [
  { label: '经历标题', content: documentTitle.value },
  { label: '适配方向', content: profile.target },
  { label: '能力标签', content: displayAbilityTags.value.join(' / ') },
  { label: '待补充信息', content: displayMissingInfo.value },
]);

const documentTitle = computed(() => {
  if (assetMemory.value.title) return assetMemory.value.title;
  if (hasProduct.value && hasTech.value) return '校园产品从 0 到 1 项目经历';
  if (hasOperation.value) return '校园用户运营与活动增长经历';
  if (hasTech.value) return '课程/竞赛技术项目经历';
  return '可迁移能力型校园经历';
});

const missingInfo = computed(() => {
  const items = [];
  if (!hasData.value) items.push('补充结果数据');
  if (!/困难|挑战|问题|冲突|卡点/.test(normalizedText.value)) items.push('补充遇到的困难');
  if (!/我|负责|主导|完成|设计|开发|推进/.test(normalizedText.value)) items.push('补充个人贡献');
  return items.length ? items.join('、') : '信息比较完整，可继续打磨表达';
});

const starStory = computed(() => {
  if (assetMemory.value.starStory) return assetMemory.value.starStory;
  return `S/T：在${profile.stage}阶段，你参与了「${documentTitle.value}」，目标是解决真实用户/团队中的具体问题。A：你承担了${displayAbilityTags.value.slice(0, 3).join('、')}相关工作，并推动方案落地。R：当前经历已经具备求职价值，建议继续补充可量化结果、关键困难和复盘反思，让它更适合投递${profile.target}方向。`;
});

const resumeBullets = computed(() => assetMemory.value.resumeBullets?.length ? assetMemory.value.resumeBullets : [
  `围绕${documentTitle.value}，完成需求拆解、方案推进与结果复盘，沉淀${displayAbilityTags.value.join('、')}等能力。`,
  hasData.value ? '在项目中形成可量化结果，可进一步提炼用户规模、效率提升、转化变化或满意度反馈。' : '建议补充项目数据，例如用户数、效率提升、活动参与人数或作品访问量。',
  `面向${profile.target}岗位，可将该经历包装为“发现问题—设计方案—协作落地—复盘优化”的面试故事。`,
]);

const roleSeed = computed<Record<string, number>>(() => ({
  技术研发: 48 + (hasTech.value ? 28 : 0) + (hasData.value ? 8 : 0),
  产品策划: 48 + (hasProduct.value ? 28 : 0) + (hasTeam.value ? 8 : 0),
  数据分析: 44 + (hasData.value ? 22 : 0) + (hasTech.value ? 10 : 0),
  游戏策划: 42 + (/游戏|玩法|关卡|数值/.test(normalizedText.value) ? 30 : 0) + (hasProduct.value ? 8 : 0),
  '内容/市场运营': 44 + (hasOperation.value ? 28 : 0) + (hasTeam.value ? 8 : 0),
  用户体验设计: 42 + (/设计|原型|体验|视觉|交互/.test(normalizedText.value) ? 30 : 0) + (hasProduct.value ? 8 : 0),
}));

const rankedRoles = computed<RoleMatch[]>(() => Object.entries(roleSeed.value)
  .map(([name, score]) => ({
    name,
    score: Math.min(96, Math.max(45, Math.round(score + (name === profile.target ? 8 : 0)))),
    reason: buildRoleReason(name),
  }))
  .sort((left, right) => right.score - left.score));

const roleColumns = [
  { colKey: 'name', title: '方向', width: 130 },
  { colKey: 'score', title: '匹配度', width: 160 },
  { colKey: 'reason', title: '依据' },
];

const targetAdvice = computed(() => {
  const top = displayRoleMatches.value[0];
  return `当前最建议优先验证「${top.name}」，因为你的经历里已经出现了${displayAbilityTags.value.slice(0, 3).join('、')}信号。`;
});

const growthPlan = computed<GrowthPlanItem[]>(() => [
  { label: '今天', title: '补全经历', content: missingInfo.value === '信息比较完整，可继续打磨表达' ? '把这段经历改写成 150 字面试故事。' : missingInfo.value },
  { label: '本周', title: '产出资产', content: `完成 1 版${profile.target}方向简历 bullet，并找同学模拟追问 20 分钟。` },
  { label: '两周', title: '岗位验证', content: `拆解 3 个腾讯${profile.target}岗位 JD，标出高频能力词，反向补齐作品或项目证据。` },
  { label: '一月', title: '投递准备', content: '形成“简历 + 作品/项目说明 + 3 个面试故事 + 投递节奏表”。' },
]);

const careMessage = computed(() => {
  if (assetMemory.value.careMessage) return assetMemory.value.careMessage;
  if (hasAnxiety.value) return '你现在的焦虑不是能力差，而是经历还没有被翻译成招聘语言。我们先把它整理清楚，你会更有掌控感。';
  return '这段经历已经有价值。下一步不是重做一段更厉害的经历，而是把你的角色、动作和结果讲清楚。';
});

const rescuePlan = computed(() => '先暂停横向比较。用 5 分钟写下你做过的具体动作，5 分钟补一个数字结果，5 分钟把它改成一条简历 bullet。只完成这 15 分钟就算赢。');
const nextOneThing = computed(() => `只做一件事：${assetMemory.value.nextAction || displayGrowthPlan.value[0].content}`);

const buildRoleReason = (name: string) => {
  if (name === '产品策划') return hasProduct.value ? '出现需求、用户、原型或体验信号' : '可通过经历复盘验证产品意识';
  if (name === '技术研发') return hasTech.value ? '出现开发、系统或技术项目线索' : '需要补充技术作品证明';
  if (name === '数据分析') return hasData.value ? '已有量化意识，可继续补 SQL/指标' : '需要补充数据结果和分析过程';
  if (name === '内容/市场运营') return hasOperation.value ? '出现活动、内容或增长经验' : '可从校园活动中提炼运营能力';
  if (name === '用户体验设计') return /设计|原型|体验|视觉|交互/.test(normalizedText.value) ? '已有体验表达和设计线索' : '需要作品集或体验分析补证据';
  return '可通过玩法拆解和项目原型进一步验证';
};

const saveState = async () => {
  await fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile: { ...profile },
      collectedExperience: collectedExperience.value,
      chatList: chatList.value,
      assetMemory: assetMemory.value,
    }),
  });
};

const loadState = async () => {
  const response = await fetch('/api/state');
  if (!response.ok) return;
  const state = await response.json();
  if (!state) return;
  if (state.profile) Object.assign(profile, state.profile);
  if (state.collectedExperience) collectedExperience.value = state.collectedExperience;
  if (Array.isArray(state.chatList) && state.chatList.length) {
    chatList.value = state.chatList.map((item: ChatMessage) => (item.role === 'assistant' ? { ...item, avatar: gooseAvatar } : item));
  }
  if (state.assetMemory) assetMemory.value = state.assetMemory;
};

const analyzeExperience = async (focus: 'all' | 'advice' | 'care' = 'all') => {
  isAnalyzing.value = true;
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experience: collectedExperience.value,
        target: profile.target,
        stage: profile.stage,
        focus,
      }),
    });
    if (!response.ok) return;
    assetMemory.value = await response.json();
  } finally {
    isAnalyzing.value = false;
  }
};

const regenerateAdvice = async () => {
  await analyzeExperience('advice');
  await saveState();
  MessagePlugin.success('已重新生成发展建议');
};

const regenerateCare = async () => {
  await analyzeExperience('care');
  await saveState();
  MessagePlugin.success('已重新生成情绪陪伴');
};

const refreshAll = async () => {
  await analyzeExperience();
  await saveState();
};

const pushMessage = (role: ChatRole, content: string) => {
  chatList.value.push({
    avatar: role === 'assistant' ? gooseAvatar : '我',
    name: role === 'assistant' ? '求职鹅' : '我',
    datetime: now(),
    role,
    content: [{ type: 'markdown', data: content }],
  });
};

const buildExperienceReply = () => {
  return `嘎嘎，我先帮你接住这段经历。\n\n**我看到的价值**：这不是“普通经历”，它至少能证明 ${abilityTags.value.join('、')}。\n\n**可以写进文档的标题**：${documentTitle.value}。\n\n**建议你补充**：${missingInfo.value}。\n\n**下一步**：${nextOneThing.value}`;
};

const buildChatReply = (message: string) => {
  collectedExperience.value = `${collectedExperience.value}\n${message}`.trim();
  if (/焦虑|担心|迷茫|不会|比不过|害怕/.test(message)) {
    return `先抱抱你。你现在不是“没有价值”，而是还没把经历翻译成招聘能看懂的语言。\n\n${careMessage.value}\n\n我们先不做宏大规划，只做一个 15 分钟动作：${rescuePlan.value}`;
  }
  if (/简历|bullet|怎么写|表达/.test(message)) {
    return `我建议这段经历先这样写：\n\n- ${resumeBullets.value[0]}\n- ${resumeBullets.value[1]}\n\n还可以继续补：${missingInfo.value}。`;
  }
  if (/岗位|方向|鹅厂|腾讯|适合/.test(message)) {
    const top = rankedRoles.value[0];
    return `从当前经历看，优先验证 **${top.name}（匹配度 ${top.score}%）**。\n\n原因：${top.reason}。\n\n两周内建议拆解 3 个腾讯${top.name}岗位 JD，并把高频能力词映射到你的经历证据。`;
  }
  if (/计划|行动|怎么准备|下一步/.test(message)) {
    return `给你一个不焦虑版本的行动计划：\n\n1. 今天：${growthPlan.value[0].content}\n2. 本周：${growthPlan.value[1].content}\n3. 两周：${growthPlan.value[2].content}\n\n先完成第一步，求职鹅再陪你改下一版。`;
  }
  return buildExperienceReply();
};

const buildLlmPrompt = (message: string) => `你是“求职鹅”，一个面向在校大学生的腾讯/鹅厂求职成长陪伴智能体。请用温暖、具体、可执行的中文回复学生。

【长期个人经历档案｜由后端持久化维护】
学生阶段：${profile.stage}
目标方向：${profile.target}
完整经历原文：${normalizedText.value}
结构化求职资产：${JSON.stringify(assetMemory.value)}

【你的任务】
1. 把学生新输入合并理解为长期个人经历档案的一部分，不要只看当前句子；
2. 如果学生上传/补充了经历，要指出这段经历能证明什么能力，以及还缺什么证据；
3. 如果学生焦虑，先情感陪伴，再把焦虑拆成可执行动作；
4. 给出适合鹅厂方向的发展建议，但不要编造真实招聘名额或内部信息；
5. 最后只给 1-3 个下一步行动。

学生刚刚说：${message}`;

const sendMessage = async (value?: string) => {
  const message = (value || chatInput.value).trim();
  if (!message || isStreaming.value) return;
  pushMessage('user', message);
  chatInput.value = '';
  isStreaming.value = true;

  chatList.value.push({
    avatar: gooseAvatar,
    name: '求职鹅',
    datetime: now(),
    role: 'assistant',
    content: [{ type: 'markdown', data: '' }],
  });
  const assistantIndex = chatList.value.length - 1;
  const updateAssistantMessage = (content: string) => {
    chatList.value[assistantIndex] = {
      ...chatList.value[assistantIndex],
      content: [{ type: 'markdown', data: content }],
    };
  };
  const appendAssistantDelta = (delta: string) => {
    updateAssistantMessage(`${chatList.value[assistantIndex].content[0].data}${delta}`);
  };

  try {
    const messages = [
      { role: 'system' as const, content: '你是求职鹅，一个温暖、务实、擅长维护学生长期经历档案并整理成求职资产的 AI 求职成长陪伴智能体。' },
      { role: 'user' as const, content: buildLlmPrompt(message) },
    ];
    const streamedText = await streamWithLlm(messages, appendAssistantDelta);
    if (!streamedText.trim()) {
      updateAssistantMessage(await chatWithLlm(messages));
    }
    collectedExperience.value = `${collectedExperience.value}\n${message}`.trim();
    await analyzeExperience();
  } catch (error) {
    console.error(error);
    MessagePlugin.warning('大模型流式请求失败，已使用本地 Demo 规则回复');
    updateAssistantMessage(buildChatReply(message));
  } finally {
    isStreaming.value = false;
    await saveState();
  }
};

const clearChat = () => {
  chatList.value = chatList.value.slice(0, 1);
};

const loadSample = () => {
  chatInput.value = '我和 4 个同学做了一个校园二手交易小程序，我主要负责问卷调研、用户访谈、原型设计和首页前端。上线后有 230 名同学试用，收集到 42 条反馈。我很担心这只是课程作业，不知道能不能投腾讯产品策划。';
  MessagePlugin.info('已填入示例经历，直接发送给求职鹅即可');
};

const exportDocument = () => {
  const markdown = `# 求职鹅成长档案\n\n## 基本信息\n\n- 当前阶段：${profile.stage}\n- 目标方向：${profile.target}\n- 推荐方向：${displayRoleMatches.value[0]?.name}\n- 经历成熟度：${Math.round(assetScore.value)}%\n\n## 经历标题\n\n${documentTitle.value}\n\n## 能力标签\n\n${displayAbilityTags.value.map((tag) => `- ${tag}`).join('\n')}\n\n## STAR 经历稿\n\n${starStory.value}\n\n## 简历 Bullet\n\n${resumeBullets.value.map((item) => `- ${item}`).join('\n')}\n\n## 待补充信息\n\n${displayMissingInfo.value}\n\n## 发展建议\n\n${targetAdvice.value}\n\n${displayGrowthPlan.value.map((item) => `- ${item.label}｜${item.title}：${item.content}`).join('\n')}\n\n## 情绪陪伴\n\n${careMessage.value}\n\n${rescuePlan.value}\n`;
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '求职鹅成长档案.md';
  link.click();
  URL.revokeObjectURL(url);
  MessagePlugin.success('已导出求职文档');
};

const handleSelectChange = async (selectedFiles: UploadLikeFile[]) => {
  const formData = new FormData();
  selectedFiles.forEach((item) => {
    const rawFile = item.raw || item.originFile;
    if (rawFile) formData.append('files', rawFile);
  });

  if (!formData.has('files')) return;

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error(`Upload parse failed: ${response.status}`);
    const result = await response.json();
    const parsedText = String(result.text || '').trim();
    if (parsedText) {
      collectedExperience.value = `${collectedExperience.value}\n\n【上传解析经历】\n${parsedText}`.trim();
      await analyzeExperience();
      await saveState();
      pushMessage('assistant', `我已经把上传文件解析并写入你的长期个人经历档案。\n\n这份档案之后会持续作为大模型提示词的一部分，用来维护你的简历素材、面试故事和发展建议。`);
      MessagePlugin.success('上传内容已解析并持久化为个人经历');
    }
  } catch (error) {
    console.error(error);
    MessagePlugin.error('文件解析失败，请改为粘贴文本经历');
  }
};

onMounted(async () => {
  await loadState();
  if (!assetMemory.value.title) await analyzeExperience();
  await saveState();
});
</script>

<style>
body {
  margin: 0;
  color: var(--td-text-color-primary);
  background: var(--td-bg-color-page);
}

.app-shell {
  min-height: 100vh;
  background: var(--td-bg-color-page);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--td-comp-margin-l);
  padding: var(--td-comp-paddingTB-l) var(--td-comp-paddingLR-xxl);
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: var(--td-comp-margin-xs);
}

.app-content {
  padding: var(--td-comp-paddingTB-xxl) var(--td-comp-paddingLR-xxl);
}

.app-header {
  background: var(--td-bg-color-container);
  border-bottom: 1px solid var(--td-component-border);
}

.full-width {
  width: 100%;
}
</style>
