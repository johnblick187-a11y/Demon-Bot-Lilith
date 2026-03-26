import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("massnick")
  .setDescription("Change or reset everyone's nickname at once")
  .addSubcommand((s) =>
    s.setName("set")
      .setDescription("Set the same nickname for every member")
      .addStringOption((o) =>
        o.setName("nickname").setDescription("Nickname to apply (max 32 chars)").setRequired(true).setMaxLength(32)
      )
  )
  .addSubcommand((s) =>
    s.setName("reset")
      .setDescription("Clear all custom nicknames — everyone reverts to their username")
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;
  await interaction.deferReply();

  const sub = (interaction.options as any).getSubcommand();
  const nickname: string | null = sub === "set"
    ? (interaction.options as any).getString("nickname", true)
    : null;

  const members = await interaction.guild.members.fetch();
  const me = interaction.guild.members.me;
  const botHighest = me?.roles.highest.position ?? 0;

  // Filter to members we can actually rename:
  // skip bots, skip owner, skip members whose top role is >= bot's top role
  const targets = members.filter((m) =>
    !m.user.bot &&
    m.id !== interaction.guild!.ownerId &&
    m.roles.highest.position < botHighest
  );

  await interaction.editReply(
    `⏳ ${sub === "set" ? `Setting nickname to **${nickname}**` : "Resetting nicknames"} for **${targets.size}** members — this takes a moment due to Discord rate limits.`
  );

  let done = 0;
  let failed = 0;

  for (const [, member] of targets) {
    try {
      await member.setNickname(nickname);
      done++;
    } catch {
      failed++;
    }
    // Respect Discord rate limits — 1 request per 100ms
    await new Promise((r) => setTimeout(r, 100));
  }

  await interaction.editReply(
    sub === "set"
      ? `✅ Set nickname to **${nickname}** for ${done} member(s).${failed > 0 ? ` ${failed} skipped (higher role or permissions).` : ""}`
      : `✅ Reset nicknames for ${done} member(s).${failed > 0 ? ` ${failed} skipped (higher role or permissions).` : ""}`
  );
}
