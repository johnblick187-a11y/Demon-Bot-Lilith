import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
} from "discord.js";

interface SoundboardSound {
  sound_id: string;
  name: string;
  volume: number;
  emoji_id: string | null;
  emoji_name: string | null;
  guild_id?: string;
  available: boolean;
}

async function fetchSounds(client: any, guildId: string): Promise<SoundboardSound[]> {
  const res = await client.rest.get(`/guilds/${guildId}/soundboard-sounds`) as any;
  return (res?.items ?? res ?? []) as SoundboardSound[];
}

async function fetchSoundAsDataURI(soundId: string): Promise<string> {
  const url = `https://cdn.discordapp.com/soundboard-sounds/${soundId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch sound: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:audio/ogg;base64,${base64}`;
}

export const data = new SlashCommandBuilder()
  .setName("stealsound")
  .setDescription("Steal soundboard sounds from a server")
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("List soundboard sounds in a server")
      .addStringOption((opt) =>
        opt
          .setName("server")
          .setDescription("Server name or ID (defaults to this server)")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("steal")
      .setDescription("Steal all soundboard sounds from another server into this one")
      .addStringOption((opt) =>
        opt
          .setName("server")
          .setDescription("Server name or ID to steal from")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("name")
          .setDescription("Specific sound name to steal (omit to steal all)")
          .setRequired(false)
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions);

export async function execute(interaction: CommandInteraction) {
  const sub = (interaction.options as any).getSubcommand();

  if (sub === "list") {
    await interaction.deferReply({ flags: 64 });

    const serverQuery = (interaction.options as any).getString("server") as string | null;
    const targetGuild = serverQuery
      ? (interaction.client.guilds.cache.get(serverQuery) ??
          interaction.client.guilds.cache.find(
            (g) => g.name.toLowerCase() === serverQuery.toLowerCase()
          ))
      : interaction.guild;

    if (!targetGuild) {
      return interaction.editReply(`I'm not in a server matching \`${serverQuery}\`.`);
    }

    const sounds = await fetchSounds(interaction.client, targetGuild.id).catch(() => []);

    if (sounds.length === 0) {
      return interaction.editReply(`**${targetGuild.name}** has no custom soundboard sounds.`);
    }

    const lines = sounds.map((s) => {
      const emoji = s.emoji_name ? ` ${s.emoji_name}` : "";
      return `• \`${s.name}\`${emoji} — ID: \`${s.sound_id}\``;
    });

    const chunks: string[] = [];
    let current = `**Soundboard sounds in ${targetGuild.name}** (${sounds.length}):\n`;
    for (const line of lines) {
      if ((current + line + "\n").length > 1900) {
        chunks.push(current);
        current = "";
      }
      current += line + "\n";
    }
    if (current) chunks.push(current);

    await interaction.editReply(chunks[0]);
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i], flags: 64 });
    }
  }

  if (sub === "steal") {
    if (!interaction.guild) return;

    await interaction.deferReply({ flags: 64 });

    const serverQuery = (interaction.options as any).getString("server", true) as string;
    const nameFilter = ((interaction.options as any).getString("name") as string | null)?.toLowerCase();

    const sourceGuild =
      interaction.client.guilds.cache.get(serverQuery) ??
      interaction.client.guilds.cache.find(
        (g) => g.name.toLowerCase() === serverQuery.toLowerCase()
      );

    if (!sourceGuild) {
      return interaction.editReply(`I'm not in a server matching \`${serverQuery}\`.`);
    }

    if (sourceGuild.id === interaction.guild.id) {
      return interaction.editReply("That's this server. Pick a different one.");
    }

    let sounds = await fetchSounds(interaction.client, sourceGuild.id).catch(() => [] as SoundboardSound[]);

    if (nameFilter) {
      sounds = sounds.filter((s) => s.name.toLowerCase() === nameFilter);
    }

    if (sounds.length === 0) {
      return interaction.editReply(
        nameFilter
          ? `No sound named \`${nameFilter}\` found in **${sourceGuild.name}**.`
          : `**${sourceGuild.name}** has no custom soundboard sounds to steal.`
      );
    }

    await interaction.editReply(
      `🔊 Found ${sounds.length} sound(s) in **${sourceGuild.name}**. Stealing…`
    );

    const added: string[] = [];
    const failed: string[] = [];

    for (const sound of sounds) {
      try {
        const dataURI = await fetchSoundAsDataURI(sound.sound_id);
        await (interaction.client as any).rest.post(
          `/guilds/${interaction.guild.id}/soundboard-sounds`,
          {
            body: {
              name: sound.name,
              sound: dataURI,
              volume: sound.volume ?? 1,
              ...(sound.emoji_name ? { emoji_name: sound.emoji_name } : {}),
              ...(sound.emoji_id ? { emoji_id: sound.emoji_id } : {}),
            },
          }
        );
        added.push(`✅ \`${sound.name}\``);
      } catch (err: any) {
        failed.push(`❌ \`${sound.name}\` — ${err?.message ?? "unknown error"}`);
      }
    }

    const lines = [...added, ...failed];
    const summary = `**Soundboard theft results from ${sourceGuild.name}:**\n${lines.join("\n")}`;

    const chunks = summary.match(/.{1,1900}/gs) ?? [summary];
    await interaction.editReply(chunks[0]);
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i], flags: 64 });
    }
  }
}
