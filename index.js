require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('./config');
const scheduler = require('./scheduler');
const os = require('os');

const startTime = Date.now();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const userWarnings = new Map();
const prefix = '!';

client.once('ready', () => {
  console.log('═══════════════════════════════════════════');
  console.log(`Bot online: ${client.user.tag}`);
  console.log(`Servers: ${client.guilds.cache.size}`);
  console.log('═══════════════════════════════════════════');
  client.user.setActivity('chat moderation', { type: 3 });

  setInterval(checkScheduledMessages, 10000);
  console.log('Scheduler started - checking every 10 seconds');
});

async function checkScheduledMessages() {
  let due = scheduler.getDueSchedules();

  for (let schedule of due) {
    try {
      let channel = await client.channels.fetch(schedule.channelId);
      if (channel) {
        let embed = new EmbedBuilder()
          .setColor(0x9B59B6)
          .setTitle('⏰ Scheduled Message')
          .setDescription(schedule.message)
          .addFields({ name: 'Scheduled by', value: `<@${schedule.userId}>`, inline: true })
          .setTimestamp();

        await channel.send({ content: schedule.ping ? `<@${schedule.userId}>` : undefined, embeds: [embed] });
      }
      scheduler.removeSchedule(schedule.id);
    } catch (err) {
      console.error('Schedule error:', err.message);
      scheduler.removeSchedule(schedule.id);
    }
  }
}

function isMod(member) {
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (config.modRoles.some(roleId => member.roles.cache.has(roleId))) return true;
  return false;
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  let embeds = {
    'help_showlist': new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('📝 !showlist Command')
      .setDescription('Displays all words currently in the blocked list.')
      .addFields(
        { name: 'Usage', value: '`!showlist` or `!list`' },
        { name: 'Permission', value: 'Everyone can use this' }
      ),
    'help_addword': new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('➕ !addword Command')
      .setDescription('Add new words to the blocked list.')
      .addFields(
        { name: 'Usage', value: '`!addword <word1> <word2> ...`' },
        { name: 'Permission', value: '🔒 Moderators only' }
      ),
    'help_removeword': new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('🗑️ !removeword Command')
      .setDescription('Remove words from the blocked list.')
      .addFields(
        { name: 'Usage', value: '`!removeword <word1> <word2> ...`' },
        { name: 'Permission', value: '🔒 Moderators only' }
      ),
    'help_schedule': new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle('⏰ !schedule Command')
      .setDescription('Schedule a message to be sent later.')
      .addFields(
        { name: 'Usage', value: '`!schedule <time> <message>`' },
        { name: 'Time formats', value: '`5m` `1h` `2h30m` `1d` `1w`' },
        { name: 'Examples', value: '```\n!schedule 2h reminder to check server\n!schedule 1d30m weekly meeting!\n```' }
      ),
    'help_how': new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('❓ How It Works')
      .setDescription('The bot detects Hinglish and removes it.')
      .addFields(
        { name: 'Detection', value: 'Messages with 3+ Hinglish words get deleted' },
        { name: 'Warnings', value: '3 warnings before timeout' }
      )
  };

  if (embeds[interaction.customId]) {
    await interaction.reply({ embeds: [embeds[interaction.customId]], ephemeral: true });
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  let content = message.content.toLowerCase();

  if (content.includes('mello')) {
    let embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle('✨ Did someone say... MELLO? ✨')
      .setDescription(`Ohh, are you talking about the god itself?\nLet me ping them for you~`)
      .setTimestamp();

    await message.channel.send({ content: `<@${config.melloUserId}>`, embeds: [embed] });
    return;
  }

  if (message.content.startsWith(prefix)) {
    let args = message.content.slice(prefix.length).trim().split(/\s+/);
    let command = args.shift().toLowerCase();

    if (command === 'schedule' || command === 'remind' || command === 'reminder') {
      if (args.length < 2) {
        await message.reply('Usage: `!schedule <time> <message>`\nExample: `!schedule 2h check the server`');
        return;
      }

      let timeStr = args[0];
      let delay = scheduler.parseTime(timeStr);

      if (delay < 10000) {
        await message.reply('❌ Minimum schedule time is 10 seconds.');
        return;
      }

      if (delay > 30 * 24 * 60 * 60 * 1000) {
        await message.reply('❌ Maximum schedule time is 30 days.');
        return;
      }

      let msgContent = args.slice(1).join(' ');
      let sendAt = Date.now() + delay;

      let id = scheduler.addSchedule({
        userId: message.author.id,
        channelId: message.channel.id,
        guildId: message.guild.id,
        message: msgContent,
        sendAt: sendAt,
        ping: true
      });

      let embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('⏰ Message Scheduled!')
        .addFields(
          { name: 'Message', value: msgContent.substring(0, 200) },
          { name: 'Sending in', value: scheduler.formatDuration(delay), inline: true },
          { name: 'At', value: scheduler.formatTime(sendAt), inline: true },
          { name: 'ID', value: `\`${id}\``, inline: true }
        )
        .setFooter({ text: 'Use !myreminders to see all your scheduled messages' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return;
    }

    if (command === 'myreminders' || command === 'scheduled' || command === 'mylist') {
      let schedules = scheduler.getSchedulesByUser(message.author.id);

      if (schedules.length === 0) {
        await message.reply('You have no scheduled messages.');
        return;
      }

      let embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('📋 Your Scheduled Messages')
        .setDescription(`You have **${schedules.length}** scheduled message(s)`)
        .setTimestamp();

      for (let i = 0; i < Math.min(schedules.length, 10); i++) {
        let s = schedules[i];
        let timeLeft = s.sendAt - Date.now();
        embed.addFields({
          name: `${i + 1}. ${s.message.substring(0, 30)}...`,
          value: `ID: \`${s.id}\` | In: ${scheduler.formatDuration(timeLeft)}`,
          inline: false
        });
      }

      if (schedules.length > 10) {
        embed.setFooter({ text: `Showing 10 of ${schedules.length}` });
      }

      await message.reply({ embeds: [embed] });
      return;
    }

    if (command === 'cancel' || command === 'cancelreminder') {
      if (args.length === 0) {
        await message.reply('Usage: `!cancel <id>`\nUse `!myreminders` to see your IDs.');
        return;
      }

      let id = args[0];
      let schedules = scheduler.getSchedulesByUser(message.author.id);
      let schedule = schedules.find(s => s.id === id);

      if (!schedule) {
        await message.reply('❌ Schedule not found or you don\'t own it.');
        return;
      }

      scheduler.removeSchedule(id);
      await message.reply(`✅ Cancelled scheduled message: \`${id}\``);
      return;
    }

    if (command === 'showlist' || command === 'list') {
      let words = config.getWordList();
      let chunks = [];
      let currentChunk = '';

      for (let word of words) {
        if (currentChunk.length + word.length + 2 > 1000) {
          chunks.push(currentChunk);
          currentChunk = word;
        } else {
          currentChunk += (currentChunk ? ', ' : '') + word;
        }
      }
      if (currentChunk) chunks.push(currentChunk);

      let embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('📝 Blocked Words List')
        .setDescription(`Total words: **${words.length}**`)
        .setTimestamp();

      for (let i = 0; i < Math.min(chunks.length, 5); i++) {
        embed.addFields({ name: `Part ${i + 1}`, value: '`' + chunks[i] + '`' });
      }

      await message.reply({ embeds: [embed] });
      return;
    }

    if (command === 'addword' || command === 'addwords') {
      if (!isMod(message.member)) {
        await message.reply('❌ You need mod permissions.');
        return;
      }

      if (args.length === 0) {
        await message.reply('Usage: `!addword <word1> <word2> ...`');
        return;
      }

      let added = [];
      let exists = [];

      for (let word of args) {
        if (config.addWord(word)) added.push(word);
        else exists.push(word);
      }

      let embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Words Updated')
        .setTimestamp();

      if (added.length > 0) embed.addFields({ name: 'Added', value: added.join(', ') });
      if (exists.length > 0) embed.addFields({ name: 'Already Exists', value: exists.join(', ') });

      await message.reply({ embeds: [embed] });
      return;
    }

    if (command === 'removeword' || command === 'deleteword' || command === 'editwords') {
      if (!isMod(message.member)) {
        await message.reply('❌ You need mod permissions.');
        return;
      }

      if (args.length === 0) {
        await message.reply('Usage: `!removeword <word1> <word2> ...`');
        return;
      }

      let removed = [];
      let notfound = [];

      for (let word of args) {
        if (config.removeWord(word)) removed.push(word);
        else notfound.push(word);
      }

      let embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('🗑️ Words Removed')
        .setTimestamp();

      if (removed.length > 0) embed.addFields({ name: 'Removed', value: removed.join(', ') });
      if (notfound.length > 0) embed.addFields({ name: 'Not Found', value: notfound.join(', ') });

      await message.reply({ embeds: [embed] });
      return;
    }

    if (command === 'help' || command === 'commands') {
      let row1 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('help_showlist')
            .setLabel('📝 Show List')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('help_addword')
            .setLabel('➕ Add Word')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('help_removeword')
            .setLabel('🗑️ Remove Word')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('help_schedule')
            .setLabel('⏰ Schedule')
            .setStyle(ButtonStyle.Secondary)
        );

      let embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('🤖 Language Filter Bot')
        .setDescription('Click buttons below to learn about each command!')
        .addFields(
          { name: '!showlist', value: 'View blocked words', inline: true },
          { name: '!addword', value: 'Add words (mod)', inline: true },
          { name: '!removeword', value: 'Remove words (mod)', inline: true },
          { name: '!schedule', value: 'Schedule a message', inline: true },
          { name: '!myreminders', value: 'View your schedules', inline: true },
          { name: '!cancel', value: 'Cancel a schedule', inline: true }
        )
        .setFooter({ text: 'Click a button for details' })
        .setTimestamp();

      await message.reply({ embeds: [embed], components: [row1] });
      return;
    }

    if (command === 'health' || command === 'status' || command === 'stats' || command === 'ping') {
      let uptime = Date.now() - startTime;
      let days = Math.floor(uptime / (24 * 60 * 60 * 1000));
      let hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      let minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));
      let seconds = Math.floor((uptime % (60 * 1000)) / 1000);

      let memUsed = process.memoryUsage();
      let heapUsedMB = (memUsed.heapUsed / 1024 / 1024).toFixed(2);
      let heapTotalMB = (memUsed.heapTotal / 1024 / 1024).toFixed(2);
      let rssMB = (memUsed.rss / 1024 / 1024).toFixed(2);

      let cpuUsage = os.loadavg();
      let totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      let freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
      let usedMem = (totalMem - freeMem).toFixed(2);

      let latency = client.ws.ping;
      let latencyStatus = latency < 100 ? '🟢' : latency < 200 ? '🟡' : '🔴';

      let statusEmoji = '🟢';
      if (latency > 200 || heapUsedMB > 400) statusEmoji = '🟡';
      if (latency > 500 || heapUsedMB > 800) statusEmoji = '🔴';

      let embed = new EmbedBuilder()
        .setColor(latency < 100 ? 0x00FF00 : latency < 200 ? 0xFFFF00 : 0xFF0000)
        .setTitle(`${statusEmoji} Bot Health Status`)
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
          { name: '⏱️ Uptime', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
          { name: `${latencyStatus} API Latency`, value: `${latency}ms`, inline: true },
          { name: '📡 WebSocket', value: client.ws.status === 0 ? '🟢 Connected' : '🔴 Disconnected', inline: true },
          { name: '💾 Bot Memory', value: `${heapUsedMB}MB / ${heapTotalMB}MB`, inline: true },
          { name: '📊 RSS Memory', value: `${rssMB}MB`, inline: true },
          { name: '🖥️ System RAM', value: `${usedMem}GB / ${totalMem}GB`, inline: true },
          { name: '⚙️ CPU Load', value: `${cpuUsage[0].toFixed(2)} (1m avg)`, inline: true },
          { name: '🌐 Servers', value: `${client.guilds.cache.size}`, inline: true },
          { name: '👥 Users', value: `${client.users.cache.size}`, inline: true },
          { name: '📝 Blocked Words', value: `${config.getWordList().length}`, inline: true },
          { name: '⏰ Scheduled', value: `${scheduler.loadSchedules().length}`, inline: true },
          { name: '🖥️ Platform', value: `${os.platform()} ${os.arch()}`, inline: true }
        )
        .setFooter({ text: `Node.js ${process.version} | Discord.js v14` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return;
    }
  }

  if (config.excludedChannels.includes(message.channel.id)) return;

  let hasBypass = message.member?.roles.cache.some(role => config.bypassRoles.includes(role.id));
  if (hasBypass) return;

  let detection = config.detectHinglish(message.content);

  if (detection.isHinglish) {
    try {
      await message.delete();

      let userId = message.author.id;
      let warnings = (userWarnings.get(userId) || 0) + 1;
      userWarnings.set(userId, warnings);

      let embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('Message Removed')
        .setDescription(config.warningMessage)
        .addFields(
          { name: 'User', value: `<@${userId}>`, inline: true },
          { name: 'Warnings', value: `${warnings}/${config.warningsBeforeTimeout}`, inline: true },
          { name: 'Detected', value: detection.matchedWords.slice(0, 5).join(', '), inline: true }
        )
        .setTimestamp();

      let sent = await message.channel.send({ embeds: [embed] });
      setTimeout(() => sent.delete().catch(() => { }), 8000);

      if (warnings >= config.warningsBeforeTimeout && config.timeoutDuration > 0) {
        if (message.member.moderatable) {
          await message.member.timeout(config.timeoutDuration * 1000, 'Language policy violation');
          userWarnings.set(userId, 0);

          let timeoutEmbed = new EmbedBuilder()
            .setColor(config.colors.deleted)
            .setTitle('User Timed Out')
            .setDescription(`<@${userId}> has been muted for ${config.timeoutDuration}s`)
            .setTimestamp();

          message.channel.send({ embeds: [timeoutEmbed] });
        }
      }

      console.log(`[BLOCKED] ${message.author.tag} | Words: ${detection.matchedWords.join(', ')}`);

    } catch (err) {
      console.error('Error:', err.message);
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('Login failed:', err.message);
  process.exit(1);
});
