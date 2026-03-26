import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Command list");

const COMMAND_LIST = `
**👑 Owner Only**
\`/diagnostics\` \`/unblacklist\` \`/override\`

**⚙️ Core**
\`/status\` \`/help\` \`/mood\` \`/annoyance\` \`/affinity\` \`/enemy\` \`/changeprefix\`

**🧠 AI**
\`/ask\` \`/task\` \`/tldr\` \`/google\` \`/nsfwtoggle\` \`/chattoggle\`

**😈 Interaction**
\`/punch\` \`/slap\` \`/bite\` \`/headbutt\` \`/stab\` \`/shoot\` \`/roast\` \`/pickup\` \`/ship\` \`/smash\` \`/blow\`

**🚨 Moderation**
\`/ban\` \`/unban\` \`/kick\` \`/warn\` \`/timeout\` \`/purge\` \`/dm\`
\`/channel\` \`/rename\` \`/makerole\` \`/editrole\` \`/deleterole\`
\`/autoreact\` \`/autoreply\` \`/setlogchannel\`
\`/stealemoji\` \`/stealsticker\` \`/avatar\` \`/banner\` \`/info\`

**🌿 Fun**
\`/hitsmeth\` \`/hitsweed\` \`/chugsdrink\` \`/popspill\`

**🎨 Generation**
\`/create\` \`/generate\` \`/tts\`

**🎧 Voice & Music**
\`/join\` \`/leave\` \`/play\` \`/pause\` \`/resume\` \`/skip\` \`/stop\` \`/queue\`
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
