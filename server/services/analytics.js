// 画词AI - 数据采集与分析服务
// PM + 运营视角：全局指标 + 用户级别分析

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl');
const DAILY_FILE = path.join(DATA_DIR, 'daily_stats.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ==================== 用户档案 ====================

function loadUsers() {
  try { return fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) : {}; }
  catch { return {}; }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function updateUserProfile(event) {
  const users = loadUsers();
  const uid = event.sessionId || event.ipHash || 'unknown';
  const today = event.date;

  if (!users[uid]) {
    users[uid] = {
      uid,
      firstSeen: today,
      lastSeen: today,
      // 访问
      totalVisits: 0,
      totalGenerations: 0,
      successGenerations: 0,
      failedGenerations: 0,
      // 使用特征
      languages: {},       // { en: count, es: count }
      styles: {},          // { manga: count, illustration: count, children: count }
      totalTextChars: 0,
      totalCost: 0,
      totalDuration: 0,
      activeDays: new Set(),
      hourlyPattern: new Array(24).fill(0),
      // 访问记录（用于留存计算）
      visitDates: [],
    };
  }

  const u = users[uid];
  u.lastSeen = today;

  if (event.type === 'pageview') {
    u.totalVisits++;
  }

  if (event.type === 'generation') {
    u.totalGenerations++;
    if (event.success) u.successGenerations++;
    else u.failedGenerations++;

    u.totalTextChars += event.textLength || 0;
    u.totalCost += event.estimatedCost || 0;
    u.totalDuration += event.duration || 0;

    // 语言偏好
    const lang = event.lang || 'en';
    u.languages[lang] = (u.languages[lang] || 0) + 1;

    // 风格偏好
    const style = event.style || 'manga';
    u.styles[style] = (u.styles[style] || 0) + 1;

    // 活跃天数
    if (typeof u.activeDays === 'object' && u.activeDays.add) {
      u.activeDays.add(today);
    } else {
      const arr = Array.isArray(u.activeDays) ? u.activeDays : [];
      if (!arr.includes(today)) arr.push(today);
      u.activeDays = new Set(arr);
    }

    // 小时分布
    if (event.hour >= 0 && event.hour < 24) {
      u.hourlyPattern[event.hour]++;
    }
  }

  // 记录访问日期
  if (!u.visitDates.includes(today)) {
    u.visitDates.push(today);
  }

  users[uid] = u;
  saveUsers(users);
  return u;
}

// ==================== 事件采集 ====================

function logGeneration(data) {
  const event = {
    type: 'generation',
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
    hour: new Date().getHours(),
    lang: data.lang || 'en',
    style: data.style || 'manga',
    textLength: data.textLength || 0,
    sceneCount: data.sceneCount || 0,
    duration: data.duration || 0,
    success: data.success !== false,
    error: data.error || null,
    estimatedCost: estimateCost(data),
    sessionId: data.sessionId || 'unknown',
    ipHash: data.ipHash || 'unknown',
  };

  appendEvent(event);
  updateDailyStats(event);
  updateUserProfile(event);
}

function logPageview(data) {
  const event = {
    type: 'pageview',
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
    hour: new Date().getHours(),
    path: data.path || '/',
    sessionId: data.sessionId || 'unknown',
    ipHash: data.ipHash || 'unknown',
  };

  appendEvent(event);
  updateUserProfile(event);
}

function estimateCost(data) {
  return 0.002 + (data.sceneCount || 0) * 0.12;
}

function appendEvent(event) {
  try {
    fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n', 'utf8');
  } catch (e) { /* ignore */ }
}

// ==================== 日报表 ====================

function updateDailyStats(event) { /* 保持不变 - 略 */ }

// ==================== 用户分析查询 ====================

// 获取用户列表（分页 + 排序）
function getUserList(options = {}) {
  const { sortBy = 'totalGenerations', order = 'desc', limit = 50, offset = 0 } = options;
  const users = loadUsers();

  let list = Object.values(users).map(u => flattenUser(u));

  // 排序
  list.sort((a, b) => {
    const val = order === 'desc' ? (b[sortBy] || 0) - (a[sortBy] || 0) : (a[sortBy] || 0) - (b[sortBy] || 0);
    return val;
  });

  const total = list.length;
  list = list.slice(offset, offset + limit);

  return { total, list };
}

function flattenUser(u) {
  const activeDays = u.activeDays instanceof Set ? u.activeDays.size : (Array.isArray(u.activeDays) ? u.activeDays.length : 0);

  // 主力语言/风格
  const topLang = Object.entries(u.languages || {}).sort((a, b) => b[1] - a[1])[0];
  const topStyle = Object.entries(u.styles || {}).sort((a, b) => b[1] - a[1])[0];

  // 平均指标
  const avgTextLen = u.totalGenerations > 0 ? Math.round(u.totalTextChars / u.totalGenerations) : 0;
  const avgDuration = u.totalGenerations > 0 ? Math.round(u.totalDuration / u.totalGenerations / 1000) : 0;
  const successRate = u.totalGenerations > 0 ? ((u.successGenerations / u.totalGenerations) * 100).toFixed(1) : '0';

  // 用户分层
  let tier = 'new';         // 1-2次
  if (u.totalGenerations >= 20) tier = 'power';
  else if (u.totalGenerations >= 5) tier = 'active';
  else if (u.totalGenerations >= 3) tier = 'regular';

  // 活跃度（生成频率 = 总生成 / 活跃天数）
  const frequency = activeDays > 0 ? (u.totalGenerations / activeDays).toFixed(1) : '0';

  return {
    uid: u.uid,
    firstSeen: u.firstSeen,
    lastSeen: u.lastSeen,
    totalVisits: u.totalVisits || 0,
    totalGenerations: u.totalGenerations || 0,
    successGenerations: u.successGenerations || 0,
    failedGenerations: u.failedGenerations || 0,
    successRate: successRate + '%',
    topLang: topLang ? topLang[0] : 'en',
    topStyle: topStyle ? topStyle[0] : 'manga',
    avgTextLen,
    avgDuration: avgDuration + 's',
    totalCost: +(u.totalCost || 0).toFixed(2),
    activeDays,
    frequency: parseFloat(frequency),
    tier,
    languages: u.languages || {},
    styles: u.styles || {},
  };
}

// 用户分层汇总
function getUserSegmentation() {
  const users = loadUsers();
  const list = Object.values(users).map(u => flattenUser(u));
  const total = list.length || 1;

  const power = list.filter(u => u.tier === 'power');
  const active = list.filter(u => u.tier === 'active');
  const regular = list.filter(u => u.tier === 'regular');
  const newcomers = list.filter(u => u.tier === 'new');

  // 语言偏好统计
  let enUsers = 0, esUsers = 0;
  list.forEach(u => { if (u.topLang === 'es') esUsers++; else enUsers++; });

  // 风格偏好统计
  let mangaUsers = 0, illusUsers = 0, childUsers = 0;
  list.forEach(u => {
    if (u.topStyle === 'illustration') illusUsers++;
    else if (u.topStyle === 'children') childUsers++;
    else mangaUsers++;
  });

  return {
    totalUsers: total,
    segments: {
      power: { count: power.length, pct: ((power.length / total) * 100).toFixed(1) + '%', avgGen: power.length > 0 ? Math.round(power.reduce((s, u) => s + u.totalGenerations, 0) / power.length) : 0 },
      active: { count: active.length, pct: ((active.length / total) * 100).toFixed(1) + '%', avgGen: active.length > 0 ? Math.round(active.reduce((s, u) => s + u.totalGenerations, 0) / active.length) : 0 },
      regular: { count: regular.length, pct: ((regular.length / total) * 100).toFixed(1) + '%', avgGen: regular.length > 0 ? Math.round(regular.reduce((s, u) => s + u.totalGenerations, 0) / regular.length) : 0 },
      new: { count: newcomers.length, pct: ((newcomers.length / total) * 100).toFixed(1) + '%', avgGen: newcomers.length > 0 ? Math.round(newcomers.reduce((s, u) => s + u.totalGenerations, 0) / newcomers.length) : 0 },
    },
    preferences: {
      language: { en: enUsers, es: esUsers },
      style: { manga: mangaUsers, illustration: illusUsers, children: childUsers },
    },
    // 指标分布
    distribution: {
      avgGenPerUser: (list.reduce((s, u) => s + u.totalGenerations, 0) / total).toFixed(1),
      avgCostPerUser: (list.reduce((s, u) => s + u.totalCost, 0) / total).toFixed(2),
      avgActiveDays: (list.reduce((s, u) => s + u.activeDays, 0) / total).toFixed(1),
    },
  };
}

// 留存分析（简单版：今天有行为的用户中，有多少是昨天也来的）
function getRetention() {
  const users = loadUsers();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const todayUsers = new Set();
  const yesterdayUsers = new Set();
  const weekAgoUsers = new Set();

  Object.values(users).forEach(u => {
    const dates = u.visitDates || [];
    if (dates.includes(today)) todayUsers.add(u.uid);
    if (dates.includes(yesterday)) yesterdayUsers.add(u.uid);
    if (dates.includes(weekAgo)) weekAgoUsers.add(u.uid);
  });

  // Day-1 留存：今天回来的用户中，昨天也来的比例
  let d1Retention = 0;
  if (yesterdayUsers.size > 0) {
    let count = 0;
    yesterdayUsers.forEach(uid => { if (todayUsers.has(uid)) count++; });
    d1Retention = ((count / yesterdayUsers.size) * 100).toFixed(1);
  }

  // Day-7 留存
  let d7Retention = 0;
  if (weekAgoUsers.size > 0) {
    let count = 0;
    weekAgoUsers.forEach(uid => { if (todayUsers.has(uid)) count++; });
    d7Retention = ((count / weekAgoUsers.size) * 100).toFixed(1);
  }

  return {
    today: { active: todayUsers.size },
    yesterday: { active: yesterdayUsers.size },
    weekAgo: { active: weekAgoUsers.size },
    retention: {
      day1: d1Retention + '%',
      day7: d7Retention + '%',
    },
  };
}

// ==================== 原 KPI 查询（保持兼容） ====================

function getKPISummary() {
  const daily = readDailyStats();
  const dates = Object.keys(daily).sort();
  if (dates.length === 0) return getEmptySummary();

  const today = dates[dates.length - 1];
  const todayData = daily[today];

  let totalGen = 0, totalSuccess = 0, totalFail = 0, totalCost = 0, totalChars = 0, totalScenes = 0;
  let totalEn = 0, totalEs = 0;
  let totalManga = 0, totalIllus = 0, totalChild = 0;

  dates.forEach(d => {
    const s = daily[d];
    totalGen += s.totalGenerations || 0;
    totalSuccess += s.successGenerations || 0;
    totalFail += s.failedGenerations || 0;
    totalCost += s.totalCost || 0;
    totalChars += s.totalTextChars || 0;
    totalScenes += s.totalScenes || 0;
    totalEn += s.enCount || 0;
    totalEs += s.esCount || 0;
    totalManga += s.mangaCount || 0;
    totalIllus += s.illustrationCount || 0;
    totalChild += s.childrenCount || 0;
  });

  const last7 = dates.slice(-7);
  const last7Gen = last7.reduce((sum, d) => sum + (daily[d]?.totalGenerations || 0), 0);
  const last7Success = last7.reduce((sum, d) => sum + (daily[d]?.successGenerations || 0), 0);

  // 用户数据
  const users = loadUsers();
  const todayUsers = Object.values(users).filter(u => u.visitDates?.includes(today)).length;

  return {
    today: {
      generations: todayData.totalGenerations || 0,
      success: todayData.successGenerations || 0,
      fail: todayData.failedGenerations || 0,
      successRate: todayData.totalGenerations > 0 ? ((todayData.successGenerations / todayData.totalGenerations) * 100).toFixed(1) + '%' : '0%',
      avgTextLength: todayData.totalGenerations > 0 ? Math.round(todayData.totalTextChars / todayData.totalGenerations) : 0,
      avgDuration: todayData.totalGenerations > 0 ? Math.round(todayData.totalDuration / todayData.totalGenerations / 1000) + 's' : '0s',
      estimatedCost: todayData.totalCost.toFixed(2),
      activeUsers: todayUsers,
    },
    total: {
      generations: totalGen, success: totalSuccess, fail: totalFail,
      successRate: totalGen > 0 ? ((totalSuccess / totalGen) * 100).toFixed(1) + '%' : '0%',
      totalCost: totalCost.toFixed(2), totalScenes,
      avgCharsPerGen: totalGen > 0 ? Math.round(totalChars / totalGen) : 0,
      totalUsers: Object.keys(users).length,
    },
    last7Days: { total: last7Gen, success: last7Success, rate: last7Gen > 0 ? ((last7Success / last7Gen) * 100).toFixed(1) + '%' : '0%' },
    distribution: { language: { en: totalEn, es: totalEs }, style: { manga: totalManga, illustration: totalIllus, children: totalChild } },
    activeDays: dates.length,
  };
}

function getDailyTrend(days = 30) {
  const daily = readDailyStats();
  const dates = Object.keys(daily).sort().slice(-days);
  return dates.map(d => ({
    date: d, generations: daily[d].totalGenerations || 0, success: daily[d].successGenerations || 0,
    fail: daily[d].failedGenerations || 0, cost: +(daily[d].totalCost || 0).toFixed(2),
    avgDuration: daily[d].totalGenerations > 0 ? Math.round(daily[d].totalDuration / daily[d].totalGenerations / 1000) : 0,
    enCount: daily[d].enCount || 0, esCount: daily[d].esCount || 0,
    mangaCount: daily[d].mangaCount || 0, illustrationCount: daily[d].illustrationCount || 0, childrenCount: daily[d].childrenCount || 0,
  }));
}

function getHourlyDistribution() {
  const daily = readDailyStats();
  const dates = Object.keys(daily).sort().slice(-30);
  const hourly = new Array(24).fill(0);
  dates.forEach(d => {
    const dist = daily[d].hourlyDistribution;
    if (Array.isArray(dist)) for (let i = 0; i < 24; i++) hourly[i] += dist[i] || 0;
  });
  return hourly.map((count, hour) => ({ hour: `${hour}:00`, count }));
}

function readDailyStats() {
  try { if (fs.existsSync(DAILY_FILE)) return JSON.parse(fs.readFileSync(DAILY_FILE, 'utf8')); }
  catch { /* ignore */ }
  return {};
}

function getEmptySummary() {
  return {
    today: { generations: 0, success: 0, fail: 0, successRate: '0%', avgTextLength: 0, avgDuration: '0s', estimatedCost: '0.00', activeUsers: 0 },
    total: { generations: 0, success: 0, fail: 0, successRate: '0%', totalCost: '0.00', totalScenes: 0, avgCharsPerGen: 0, totalUsers: 0 },
    last7Days: { total: 0, success: 0, rate: '0%' },
    distribution: { language: { en: 0, es: 0 }, style: { manga: 0, illustration: 0, children: 0 } },
    activeDays: 0,
  };
}

module.exports = {
  logGeneration, logPageview,
  getKPISummary, getDailyTrend, getHourlyDistribution,
  getUserList, getUserSegmentation, getRetention,
};
