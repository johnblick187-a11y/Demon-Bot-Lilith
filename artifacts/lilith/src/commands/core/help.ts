import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Full command list");

const COMMAND_LIST = `
**👑 Owner Only**
\`/diagnostics\` \`/override\` \`/unblacklist\` \`/memory\` \`/dm\`
\`/stealemoji\` \`/stealsticker\` \`/stealsound\`
\`/serverbackup\` \`/personality\`

**⚙️ Core**
\`/status\` \`/help\` \`/mood\` \`/annoyance\` \`/affinity\`
\`/enemy\` \`/prefix\` \`/create command\`

**🧠 AI**
\`/ask\` \`/task\` \`/tldr\` \`/google\`
\`/nsfwtoggle\` \`/chattoggle\`

**💀 Interaction**
\`/punch\` \`/slap\` \`/bite\` \`/headbutt\` \`/stab\` \`/shoot\`
\`/roast\` \`/pickup\` \`/ship\` \`/smash\` \`/blow\`

**🚨 Moderation**
\`/ban\` \`/unban\` \`/kick\` \`/warn\` \`/timeout\` \`/purge\`
\`/rename\` \`/makerole\` \`/editrole\` \`/deleterole\` \`/giverole\` \`/removerole\`
\`/channel\` \`/setlogchannel\`
\`/automod\` \`/autoreact\` \`/autoreply\` \`/userreact\` \`/userreply\`
\`/reactionrole\` \`/webhook\` \`/invites\`
\`/avatar\` \`/banner\` \`/info\`

**📈 Leveling**
\`/rank\` \`/leaderboard\` \`/levelconfig\`

**🌿 Fun**
\`/hitsmeth\` \`/hitsweed\` \`/chugsdrink\` \`/popspill\`

**🎨 Generation**
\`/create image\` \`/generate\` \`/tts\`

**🎧 Voice & Music**
\`/join\` \`/leave\`
\`/play\` \`/pause\` \`/resume\` \`/skip\` \`/stop\` \`/queue\`
\`/vcmove\` \`/vcmute\` \`/vcunmute\` \`/vcdeafen\` \`/vcundeafen\`
`;

export async function execute(interaction: CommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle("😈 Lilith — Commands")
    .setColor(0x8b0000)
    .setDescription(COMMAND_LIST)
    .setFooter({ text: "Don't test me." });

  await interaction.reply({ embeds: [embed], flags: 64 });
}
