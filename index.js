const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const dotenv = require('dotenv');
const Fuse = require('fuse.js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPPORT_GROUP_LINK = process.env.SUPPORT_GROUP_LINK || "https://t.me/+pT5CQm1MGag1OWM1";

// বট ইনিশিয়ালাইজ করুন
const bot = new Telegraf(BOT_TOKEN);

// Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Webhook endpoint
app.post(`/webhook/${BOT_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Telegram Support Bot is running!');
});

// ========== সলিউশন ডাটাবেস ==========
const solutionsDB = [
  {
    category: 'login',
    keywords: ['login', 'signin', 'password', 'forgot', 'can\'t login', 'access', 'log in'],
    solution: `🔐 *Login Issue Solution*\n\n` +
      `1. Check your internet connection\n` +
      `2. Clear browser cache and cookies\n` +
      `3. Reset your password using 'Forgot Password' option\n` +
      `4. Use latest version of Telegram\n\n` +
      `Still having issues? Contact support group.`
  },
  {
    category: 'payment',
    keywords: ['payment', 'pay', 'money', 'transaction', 'failed', 'refund', 'bkash', 'nagad', 'card'],
    solution: `💰 *Payment Issue Solution*\n\n` +
      `1. Check your balance before transaction\n` +
      `2. Verify payment method details\n` +
      `3. Wait 10-15 minutes for transaction confirmation\n` +
      `4. Contact your bank/payment provider\n\n` +
      `For refund issues, please contact support group.`
  },
  {
    category: 'technical',
    keywords: ['technical', 'error', 'bug', 'crash', 'slow', 'problem', 'issue', 'not working', 'glitch'],
    solution: `⚙️ *Technical Issue Solution*\n\n` +
      `1. Restart the application\n` +
      `2. Clear app cache and data\n` +
      `3. Update to latest version\n` +
      `4. Restart your device\n` +
      `5. Reinstall the application\n\n` +
      `If problem persists, contact support group.`
  }
];

// Fuse.js configuration
const fuseOptions = {
  includeScore: true,
  threshold: 0.4,
  keys: ['keywords']
};

const fuse = new Fuse(solutionsDB, fuseOptions);

function findSolution(message) {
  const results = fuse.search(message.toLowerCase());
  if (results.length > 0 && results[0].score < 0.4) {
    return results[0].item.solution;
  }
  return null;
}

// ========== বট কমান্ড হ্যান্ডলার ==========

// /start command
bot.start((ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📝 Report Problem', 'report')],
    [Markup.button.callback('❓ Common Issues', 'common')],
    [Markup.button.url('👥 Support Group', SUPPORT_GROUP_LINK)]
  ]);
  
  ctx.reply(
    `👋 Welcome ${ctx.from.first_name}!\n\n` +
    `I'm your support assistant. How can I help you?`,
    keyboard
  );
});

// /support command
bot.command('support', (ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔐 Login Issues', 'solution_login')],
    [Markup.button.callback('💰 Payment Issues', 'solution_payment')],
    [Markup.button.callback('⚙️ Technical Issues', 'solution_technical')],
    [Markup.button.callback('📝 Describe Problem', 'report')],
    [Markup.button.url('👥 Support Group', SUPPORT_GROUP_LINK)]
  ]);
  
  ctx.reply('🆘 *Support Menu*\n\nPlease select your issue type:', {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

// Button handlers
bot.action(/solution_(.+)/, (ctx) => {
  const category = ctx.match[1];
  const solutionMap = {
    'login': solutionsDB[0].solution,
    'payment': solutionsDB[1].solution,
    'technical': solutionsDB[2].solution
  };
  
  const solution = solutionMap[category] || 'Solution not found.';
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url('👥 Join Support Group', SUPPORT_GROUP_LINK)],
    [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
  ]);
  
  ctx.editMessageText(solution, {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

bot.action('report', (ctx) => {
  ctx.reply(
    '📝 *Please describe your problem in detail*\n\n' +
    'Include:\n' +
    '• What happened?\n' +
    '• When did it happen?\n' +
    '• Any error messages?\n\n' +
    'I will try to find a solution for you.'
  );
});

bot.action('common', (ctx) => {
  let commonIssues = '*Common Issues:*\n\n';
  solutionsDB.forEach(item => {
    commonIssues += `• ${item.category}: ${item.keywords.slice(0, 3).join(', ')}...\n`;
  });
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
  ]);
  
  ctx.editMessageText(commonIssues, {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

bot.action('back_to_menu', (ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📝 Report Problem', 'report')],
    [Markup.button.callback('❓ Common Issues', 'common')],
    [Markup.button.url('👥 Support Group', SUPPORT_GROUP_LINK)]
  ]);
  
  ctx.editMessageText('🆘 *Support Menu*\n\nHow can I help you?', {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

// Text message handler
bot.on('text', async (ctx) => {
  const message = ctx.message.text;
  
  // Skip commands
  if (message.startsWith('/')) return;
  
  // Find solution
  const solution = findSolution(message);
  
  if (solution) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Helpful', 'helpful')],
      [Markup.button.callback('❌ Not Helpful', 'not_helpful')]
    ]);
    
    await ctx.reply(solution, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  } else {
    // No solution found - redirect to group
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('👥 Join Support Group', SUPPORT_GROUP_LINK)]
    ]);
    
    await ctx.reply(
      `🤔 I couldn't find an automatic solution.\n\n` +
      `Please join our support group for help:\n${SUPPORT_GROUP_LINK}`,
      keyboard
    );
  }
});

bot.action('helpful', (ctx) => {
  ctx.editMessageText('🙏 Thanks for your feedback! Use /support if you need more help.');
});

bot.action('not_helpful', (ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url('👥 Join Support Group', SUPPORT_GROUP_LINK)]
  ]);
  
  ctx.editMessageText(
    '😔 Sorry it wasn\'t helpful. Please join our support group:',
    keyboard
  );
});

// ========== Webhook setup ==========
bot.telegram.setWebhook(`https://${process.env.RENDER_EXTERNAL_URL}/webhook/${BOT_TOKEN}`);

// ========== Start server ==========
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🤖 Bot webhook: https://${process.env.RENDER_EXTERNAL_URL}/webhook/${BOT_TOKEN}`);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
