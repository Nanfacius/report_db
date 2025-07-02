const db = require('../config/db');
const { OpenAI } = require('openai');
require('dotenv').config(); // 确保加载环境变量

const openai = new OpenAI({
  baseURL: process.env.OPENAI_URL, // 替换为你的兼容API地址
  apiKey: process.env.OPENAI_API_KEY, // 如果你的服务需要apiKey，否则可以留空或随意填写
});

async function chat(content) {
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: content }],
    model: 'deepseek-chat', // 或者你使用的模型名称
  });
  return chatCompletion.choices[0].message.content;
}

module.exports = {
  chat,
};