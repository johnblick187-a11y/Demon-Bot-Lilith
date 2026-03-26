import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
  VoiceChannel,
  CategoryChannel,
  NewsChannel,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("channel")
  .setDescription("Manage server channels")
  .addSubcommand((sub) =>
    sub
      .setName("create")
      .setDescription("Create a new channel")
      .addStringOption((opt) =>
        opt.setName("name").setDescription("Channel name").setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("type")
          .setDescription("Channel type")
          .setRequired(false)
          .addChoices(
            { name: "text (default)", value: "text" },
            { name: "voice", value: "voice" },
            { name: "category", value: "category" },
            { name: "announcement", value: "announcement" },
            { name: "stage", value: "stage" },
          )
      )
      .addChannelOption((opt) =>
        opt
          .setName("category")
          .setDescription("Category to put it in")
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("delete")
      .setDescription("Delete a channel")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Channel to delete (defaults to current)").setRequired(false)
      )
      .addStringOption((opt) =>
        opt.setName("reason").setDescription("Reason for deletion").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("lock")
      .setDescription("Prevent @everyone from sending messages")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Channel to lock (defaults to current)").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("unlock")
      .setDescription("Restore @everyone send permissions")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Channel to unlock (defaults to current)").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("rename")
      .setDescription("Rename a channel")
      .addStringOption((opt) =>
        opt.setName("name").setDescription("New name").setRequired(true)
      )
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Channel to rename (defaults to current)").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("topic")
      .setDescription("Set a text channel's topic")
      .addStringOption((opt) =>
        opt.setName("text").setDescription("New topic (leave blank to clear)").setRequired(false)
      )
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel to set topic on (defaults to current)")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("slowmode")
      .setDescription("Set slowmode on a channel")
      .addIntegerOption((opt) =>
        opt
          .setName("seconds")
          .setDescription("Seconds between messages (0 to disable)")
          .setMinValue(0)
          .setMaxValue(21600)
          .setRequired(true)
      )
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel to apply slowmode (defaults to current)")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("clone")
      .setDescription("Clone a channel")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Channel to clone (defaults to current)").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("nsfw")
      .setDescription("Toggle NSFW flag on a text channel")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel to toggle (defaults to current)")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("edit")
      .setDescription("Edit an existing channel's settings")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Channel to edit (defaults to current)").setRequired(false)
      )
      .addStringOption((opt) =>
        opt.setName("name").setDescription("New name").setRequired(false)
      )
      .addStringOption((opt) =>
        opt.setName("topic").setDescription("New topic (use 'none' to clear)").setRequired(false)
      )
      .addIntegerOption((opt) =>
        opt
          .setName("slowmode")
          .setDescription("Slowmode in seconds (0 to disable)")
          .setMinValue(0)
          .setMaxValue(21600)
          .setRequired(false)
      )
      .addChannelOption((opt) =>
        opt
          .setName("category")
          .setDescription("Move to this category (or out of one)")
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(false)
      )
      .addBooleanOption((opt) =>
        opt.setName("nsfw").setDescription("Set NSFW on or off").setRequired(false)
      )
      .addIntegerOption((opt) =>
        opt
          .setName("position")
          .setDescription("Channel position in the list (0 = top)")
          .setMinValue(0)
          .setRequired(false)
      )
  )
  .addSubcommandGroup((group) =>
    group
      .setName("category")
      .setDescription("Manage channel categories")
      .addSubcommand((sub) =>
        sub
          .setName("create")
          .setDescription("Create a new category")
          .addStringOption((opt) =>
            opt.setName("name").setDescription("Category name").setRequired(true)
          )
          .addIntegerOption((opt) =>
            opt
              .setName("position")
              .setDescription("Position in the list (0 = top)")
              .setMinValue(0)
              .setRequired(false)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("delete")
          .setDescription("Delete a category")
          .addChannelOption((opt) =>
            opt
              .setName("category")
              .setDescription("Category to delete")
              .addChannelTypes(ChannelType.GuildCategory)
              .setRequired(true)
          )
          .addBooleanOption((opt) =>
            opt
              .setName("delete-channels")
              .setDescription("Also delete all channels inside it (default: false — channels stay, just unparented)")
              .setRequired(false)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("rename")
          .setDescription("Rename a category")
          .addChannelOption((opt) =>
            opt
              .setName("category")
              .setDescription("Category to rename")
              .addChannelTypes(ChannelType.GuildCategory)
              .setRequired(true)
          )
          .addStringOption((opt) =>
            opt.setName("name").setDescription("New name").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("lock")
          .setDescription("Lock all text channels inside a category")
          .addChannelOption((opt) =>
            opt
              .setName("category")
              .setDescription("Category to lock")
              .addChannelTypes(ChannelType.GuildCategory)
              .setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("unlock")
          .setDescription("Unlock all text channels inside a category")
          .addChannelOption((opt) =>
            opt
              .setName("category")
              .setDescription("Category to unlock")
              .addChannelTypes(ChannelType.GuildCategory)
              .setRequired(true)
          )
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;
  const group = (interaction.options as any).getSubcommandGroup(false) as string | null;
  const sub   = (interaction.options as any).getSubcommand();

  // --- Category subcommand group ---
  if (group === "category") {
    if (sub === "create") {
      const name     = (interaction.options as any).getString("name", true) as string;
      const position = (interaction.options as any).getInteger("position") as number | null;
      const cat = await interaction.guild.channels.create({
        name,
        type: ChannelType.GuildCategory,
        ...(position !== null ? { position } : {}),
      });
      return interaction.reply(`✅ Created category **${cat.name}**.`);
    }

    if (sub === "delete") {
      const cat          = (interaction.options as any).getChannel("category", true) as CategoryChannel;
      const deleteInside = ((interaction.options as any).getBoolean("delete-channels") ?? false) as boolean;

      if (deleteInside) {
        const children = cat.children.cache;
        for (const [, ch] of children) {
          await ch.delete().catch(() => {});
        }
        await cat.delete();
        return interaction.reply(`🗑️ Deleted category **${cat.name}** and **${children.size}** channel(s) inside it.`);
      } else {
        for (const [, ch] of cat.children.cache) {
          await ch.setParent(null).catch(() => {});
        }
        await cat.delete();
        return interaction.reply(`🗑️ Deleted category **${cat.name}**. Channels inside were moved out.`);
      }
    }

    if (sub === "rename") {
      const cat     = (interaction.options as any).getChannel("category", true) as CategoryChannel;
      const newName = (interaction.options as any).getString("name", true) as string;
      const old     = cat.name;
      await cat.setName(newName);
      return interaction.reply(`✅ Renamed category **${old}** → **${newName}**.`);
    }

    if (sub === "lock") {
      const cat      = (interaction.options as any).getChannel("category", true) as CategoryChannel;
      const text     = cat.children.cache.filter((c) => c.type === ChannelType.GuildText);
      let count = 0;
      for (const [, ch] of text) {
        await (ch as TextChannel).permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }).catch(() => {});
        count++;
      }
      return interaction.reply(`🔒 Locked **${count}** text channel(s) in **${cat.name}**.`);
    }

    if (sub === "unlock") {
      const cat  = (interaction.options as any).getChannel("category", true) as CategoryChannel;
      const text = cat.children.cache.filter((c) => c.type === ChannelType.GuildText);
      let count = 0;
      for (const [, ch] of text) {
        await (ch as TextChannel).permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }).catch(() => {});
        count++;
      }
      return interaction.reply(`🔓 Unlocked **${count}** text channel(s) in **${cat.name}**.`);
    }

    return;
  }

  if (sub === "create") {
    const name     = (interaction.options as any).getString("name", true) as string;
    const typeStr  = ((interaction.options as any).getString("type") ?? "text") as string;
    const category = (interaction.options as any).getChannel("category") as CategoryChannel | null;

    const typeMap: Record<string, ChannelType> = {
      text:         ChannelType.GuildText,
      voice:        ChannelType.GuildVoice,
      category:     ChannelType.GuildCategory,
      announcement: ChannelType.GuildAnnouncement,
      stage:        ChannelType.GuildStageVoice,
    };

    const ch = await interaction.guild.channels.create({
      name,
      type: typeMap[typeStr] ?? ChannelType.GuildText,
      parent: category?.id ?? undefined,
    });

    await interaction.reply(`✅ Created **${typeStr}** channel <#${ch.id}>.`);
  }

  else if (sub === "delete") {
    const target = ((interaction.options as any).getChannel("channel") ?? interaction.channel) as any;
    const reason = (interaction.options as any).getString("reason") ?? "No reason given.";
    if (!target) return interaction.reply({ content: "No channel found.", flags: 64 });
    const name = target.name;
    try {
      await target.delete(reason);
      await interaction.reply(`🗑️ Deleted **#${name}**. Reason: *${reason}*`).catch(() => {});
    } catch {
      await interaction.reply({ content: "❌ Couldn't delete that channel. Check my permissions.", flags: 64 });
    }
  }

  else if (sub === "lock") {
    const target = ((interaction.options as any).getChannel("channel") ?? interaction.channel) as TextChannel;
    await target.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
    await interaction.reply(`🔒 <#${target.id}> locked. No one's talking in there.`);
  }

  else if (sub === "unlock") {
    const target = ((interaction.options as any).getChannel("channel") ?? interaction.channel) as TextChannel;
    await target.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
    await interaction.reply(`🔓 <#${target.id}> unlocked.`);
  }

  else if (sub === "rename") {
    const newName = (interaction.options as any).getString("name", true) as string;
    const target  = ((interaction.options as any).getChannel("channel") ?? interaction.channel) as any;
    if (!target) return interaction.reply({ content: "No channel found.", flags: 64 });
    const old = target.name;
    await target.setName(newName);
    await interaction.reply(`✅ Renamed **#${old}** → **#${newName}**.`);
  }

  else if (sub === "topic") {
    const text   = ((interaction.options as any).getString("text") ?? "") as string;
    const target = ((interaction.options as any).getChannel("channel") ?? interaction.channel) as TextChannel | NewsChannel;
    await target.setTopic(text || null);
    await interaction.reply(text ? `✅ Topic set on <#${target.id}>: *${text}*` : `✅ Topic cleared on <#${target.id}>.`);
  }

  else if (sub === "slowmode") {
    const secs   = (interaction.options as any).getInteger("seconds", true) as number;
    const target = ((interaction.options as any).getChannel("channel") ?? interaction.channel) as TextChannel;
    await target.setRateLimitPerUser(secs);
    await interaction.reply(
      secs === 0
        ? `✅ Slowmode disabled on <#${target.id}>.`
        : `✅ Slowmode set to **${secs}s** on <#${target.id}>.`
    );
  }

  else if (sub === "clone") {
    const target = ((interaction.options as any).getChannel("channel") ?? interaction.channel) as any;
    if (!target) return interaction.reply({ content: "No channel found.", flags: 64 });
    const cloned = await target.clone();
    await interaction.reply(`✅ Cloned <#${target.id}> → <#${cloned.id}>.`);
  }

  else if (sub === "nsfw") {
    const target = ((interaction.options as any).getChannel("channel") ?? interaction.channel) as TextChannel;
    const current = target.nsfw;
    await target.setNSFW(!current);
    await interaction.reply(`✅ <#${target.id}> NSFW is now **${!current ? "ON" : "OFF"}**.`);
  }

  else if (sub === "edit") {
    const target   = ((interaction.options as any).getChannel("channel") ?? interaction.channel) as any;
    if (!target) return interaction.reply({ content: "No channel found.", flags: 64 });

    const newName     = (interaction.options as any).getString("name") as string | null;
    const newTopic    = (interaction.options as any).getString("topic") as string | null;
    const newSlowmode = (interaction.options as any).getInteger("slowmode") as number | null;
    const newCategory = (interaction.options as any).getChannel("category") as CategoryChannel | null;
    const newNsfw     = (interaction.options as any).getBoolean("nsfw") as boolean | null;
    const newPosition = (interaction.options as any).getInteger("position") as number | null;

    const changes: string[] = [];

    try {
      if (newName !== null) {
        await target.setName(newName);
        changes.push(`**Name** → \`${newName}\``);
      }
      if (newTopic !== null && "setTopic" in target) {
        const topic = newTopic.toLowerCase() === "none" ? null : newTopic;
        await (target as TextChannel).setTopic(topic);
        changes.push(topic ? `**Topic** → *${topic}*` : "**Topic** cleared");
      }
      if (newSlowmode !== null && "setRateLimitPerUser" in target) {
        await (target as TextChannel).setRateLimitPerUser(newSlowmode);
        changes.push(newSlowmode === 0 ? "**Slowmode** disabled" : `**Slowmode** → ${newSlowmode}s`);
      }
      if (newCategory !== null) {
        await target.setParent(newCategory.id, { lockPermissions: false });
        changes.push(`**Category** → ${newCategory.name}`);
      }
      if (newNsfw !== null && "setNSFW" in target) {
        await (target as TextChannel).setNSFW(newNsfw);
        changes.push(`**NSFW** → ${newNsfw ? "ON" : "OFF"}`);
      }
      if (newPosition !== null) {
        await target.setPosition(newPosition);
        changes.push(`**Position** → ${newPosition}`);
      }

      if (changes.length === 0) {
        return interaction.reply({ content: "You didn't provide anything to change.", flags: 64 });
      }

      await interaction.reply(`✅ <#${target.id}> updated:\n${changes.join("\n")}`);
    } catch (err) {
      await interaction.reply({ content: `❌ Failed to edit channel: ${(err as any)?.message ?? "unknown error"}`, flags: 64 });
    }
  }
}
