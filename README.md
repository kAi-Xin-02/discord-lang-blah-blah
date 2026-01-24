# 🤖 Discord Language Filter Bot

A Discord moderation bot that automatically detects and removes Hindi (Devanagari script) messages from your server.

## ✨ Features

- 🚫 **Auto-delete** Hindi/Devanagari text messages
- ⚠️ **Warning system** with customizable limits
- ⏰ **Auto-timeout** for repeat offenders
- 🛡️ **Bypass roles** for moderators
- 📝 **Excluded channels** for language-specific chats
- 📊 **Beautiful embeds** for warnings

## 🚀 Setup Instructions

### Step 1: Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** → Give it a name → **Create**
3. Go to **"Bot"** section → Click **"Add Bot"**
4. Under **"Privileged Gateway Intents"**, enable:
   - ✅ **PRESENCE INTENT**
   - ✅ **SERVER MEMBERS INTENT**  
   - ✅ **MESSAGE CONTENT INTENT** ← **IMPORTANT!**
5. Click **"Reset Token"** → Copy the token

### Step 2: Install Dependencies

```bash
cd e:\discord-language-bot
npm install
```

### Step 3: Configure the Bot

1. Create a `.env` file (copy from `.env.example`):
```bash
copy .env.example .env
```

2. Open `.env` and paste your bot token:
```
DISCORD_TOKEN=your_actual_token_here
```

### Step 4: Invite Bot to Your Server

1. Go to **OAuth2** → **URL Generator**
2. Select scopes: `bot`, `applications.commands`
3. Select permissions:
   - Manage Messages
   - Send Messages
   - Embed Links
   - Read Message History
   - Moderate Members
4. Copy the URL and open it to invite the bot

### Step 5: Run the Bot

```bash
npm start
```

Or for development (auto-restart on changes):
```bash
npm run dev
```

## ⚙️ Configuration

Edit `config.js` to customize:

```javascript
// Channels where Hindi IS allowed
excludedChannels: [
  '123456789012345678', // #hindi-chat
],

// Roles that can bypass the filter
bypassRoles: [
  '123456789012345678', // @Moderator
],

// Warnings before timeout
warningsBeforeTimeout: 3,

// Timeout duration (seconds)
timeoutDuration: 60,
```

## 📝 Adding More Languages

Edit `config.js` and uncomment/add regex patterns:

```javascript
// Arabic
arabicRegex: /[\u0600-\u06FF]/,

// Chinese
chineseRegex: /[\u4E00-\u9FFF]/,

// Cyrillic (Russian, etc.)
cyrillicRegex: /[\u0400-\u04FF]/,
```

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot not detecting messages | Enable **MESSAGE CONTENT INTENT** in Developer Portal |
| Bot can't delete messages | Check bot has **Manage Messages** permission |
| Bot can't timeout users | Check bot role is **higher** than target users |

## 📄 License

MIT - Feel free to modify and use!
