import {
  Guild,
  ChannelType,
  OverwriteType,
  PermissionsBitField,
  CategoryChannel,
  TextChannel,
  VoiceChannel,
  StageChannel,
  ForumChannel,
  NewsChannel,
  GuildPremiumTier,
} from "discord.js";

export interface BackupRole {
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  permissions: string;
  position: number;
}

export interface BackupOverwrite {
  type: "role" | "member";
  name: string;
  id: string;
  allow: string;
  deny: string;
}

export interface BackupChannel {
  type: number;
  name: string;
  position: number;
  topic?: string;
  nsfw?: boolean;
  rateLimitPerUser?: number;
  bitrate?: number;
  userLimit?: number;
  overwrites: BackupOverwrite[];
  categoryName?: string;
}

export interface BackupCategory {
  name: string;
  position: number;
  overwrites: BackupOverwrite[];
}

export interface BackupEmoji {
  name: string;
  url: string;
  animated: boolean;
}

export interface BackupSticker {
  name: string;
  description: string;
  url: string;
}

export interface ServerBackupData {
  name: string;
  description: string | null;
  verificationLevel: number;
  explicitContentFilter: number;
  defaultMessageNotifications: number;
  afkTimeout: number;
  systemChannelFlags: number;
  roles: BackupRole[];
  categories: BackupCategory[];
  channels: BackupChannel[];
  emojis: BackupEmoji[];
  stickers: BackupSticker[];
  backedUpAt: string;
}

function serializeOverwrites(channel: any): BackupOverwrite[] {
  const overwrites: BackupOverwrite[] = [];
  if (!channel.permissionOverwrites) return overwrites;
  for (const overwrite of channel.permissionOverwrites.cache.values()) {
    const target = overwrite.type === OverwriteType.Role
      ? channel.guild.roles.cache.get(overwrite.id)
      : channel.guild.members.cache.get(overwrite.id);
    overwrites.push({
      type: overwrite.type === OverwriteType.Role ? "role" : "member",
      id: overwrite.id,
      name: target?.name ?? target?.user?.username ?? overwrite.id,
      allow: overwrite.allow.bitfield.toString(),
      deny: overwrite.deny.bitfield.toString(),
    });
  }
  return overwrites;
}

export async function createBackup(guild: Guild): Promise<ServerBackupData> {
  // Fetch full guild data
  const fullGuild = await guild.fetch();
  await guild.channels.fetch();
  await guild.roles.fetch();
  await guild.emojis.fetch();
  await guild.stickers.fetch();

  // Roles (exclude @everyone, sort by position)
  const roles: BackupRole[] = guild.roles.cache
    .filter((r) => r.name !== "@everyone" && !r.managed)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      permissions: r.permissions.bitfield.toString(),
      position: r.position,
    }));

  // Categories
  const categories: BackupCategory[] = guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => (a as CategoryChannel).position - (b as CategoryChannel).position)
    .map((c) => {
      const cat = c as CategoryChannel;
      return {
        name: cat.name,
        position: cat.position,
        overwrites: serializeOverwrites(cat),
      };
    });

  // Channels
  const channels: BackupChannel[] = guild.channels.cache
    .filter((c) => c.type !== ChannelType.GuildCategory)
    .sort((a, b) => {
      const pa = (a as any).position ?? 0;
      const pb = (b as any).position ?? 0;
      return pa - pb;
    })
    .map((c) => {
      const base: BackupChannel = {
        type: c.type,
        name: c.name,
        position: (c as any).position ?? 0,
        overwrites: serializeOverwrites(c),
        categoryName: (c as any).parent?.name ?? undefined,
      };
      if (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) {
        const tc = c as TextChannel | NewsChannel;
        base.topic = tc.topic ?? undefined;
        base.nsfw = tc.nsfw;
        base.rateLimitPerUser = tc.rateLimitPerUser;
      }
      if (c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice) {
        const vc = c as VoiceChannel | StageChannel;
        base.bitrate = (vc as VoiceChannel).bitrate;
        base.userLimit = (vc as VoiceChannel).userLimit;
      }
      return base;
    });

  // Emojis
  const emojis: BackupEmoji[] = guild.emojis.cache.map((e) => ({
    name: e.name ?? "emoji",
    url: e.imageURL(),
    animated: e.animated ?? false,
  }));

  // Stickers
  const stickers: BackupSticker[] = guild.stickers.cache.map((s) => ({
    name: s.name,
    description: s.description ?? "",
    url: s.url,
  }));

  return {
    name: fullGuild.name,
    description: fullGuild.description,
    verificationLevel: fullGuild.verificationLevel,
    explicitContentFilter: fullGuild.explicitContentFilter,
    defaultMessageNotifications: fullGuild.defaultMessageNotifications,
    afkTimeout: fullGuild.afkTimeout,
    systemChannelFlags: Number(fullGuild.systemChannelFlags.bitfield),
    roles,
    categories,
    channels,
    emojis,
    stickers,
    backedUpAt: new Date().toISOString(),
  };
}

export async function applyBackup(guild: Guild, data: ServerBackupData) {
  const log: string[] = [];

  // 1. Server settings
  try {
    await guild.setName(data.name);
    if (data.description !== null) await guild.setDescription(data.description);
    await guild.setVerificationLevel(data.verificationLevel as any);
    await guild.setExplicitContentFilter(data.explicitContentFilter as any);
    await guild.setDefaultMessageNotifications(data.defaultMessageNotifications as any);
    await guild.setAFKTimeout(data.afkTimeout);
    log.push("✅ Server settings restored");
  } catch (e: any) {
    log.push(`⚠️ Server settings: ${e?.message}`);
  }

  // 2. Roles
  const existingRoles = guild.roles.cache;
  for (const r of data.roles) {
    const existing = existingRoles.find((er) => er.name === r.name && !er.managed);
    try {
      if (existing) {
        await existing.edit({
          color: r.color,
          hoist: r.hoist,
          mentionable: r.mentionable,
          permissions: BigInt(r.permissions),
        });
        log.push(`✅ Role updated: ${r.name}`);
      } else {
        await guild.roles.create({
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          mentionable: r.mentionable,
          permissions: BigInt(r.permissions),
        });
        log.push(`✅ Role created: ${r.name}`);
      }
    } catch (e: any) {
      log.push(`⚠️ Role "${r.name}": ${e?.message}`);
    }
  }

  // 3. Categories
  const createdCategories = new Map<string, string>(); // name → id
  for (const cat of data.categories) {
    const existing = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name === cat.name
    ) as CategoryChannel | undefined;
    try {
      if (existing) {
        createdCategories.set(cat.name, existing.id);
        log.push(`✅ Category exists: ${cat.name}`);
      } else {
        const created = await guild.channels.create({
          name: cat.name,
          type: ChannelType.GuildCategory,
        });
        createdCategories.set(cat.name, created.id);
        log.push(`✅ Category created: ${cat.name}`);
      }
    } catch (e: any) {
      log.push(`⚠️ Category "${cat.name}": ${e?.message}`);
    }
  }

  // 4. Channels
  for (const ch of data.channels) {
    const existing = guild.channels.cache.find(
      (c) => c.name === ch.name && c.type === ch.type
    );
    const parentId = ch.categoryName ? createdCategories.get(ch.categoryName) : undefined;
    try {
      if (!existing) {
        const opts: any = {
          name: ch.name,
          type: ch.type,
          ...(parentId ? { parent: parentId } : {}),
        };
        if (ch.topic) opts.topic = ch.topic;
        if (ch.nsfw !== undefined) opts.nsfw = ch.nsfw;
        if (ch.rateLimitPerUser) opts.rateLimitPerUser = ch.rateLimitPerUser;
        if (ch.bitrate) opts.bitrate = ch.bitrate;
        if (ch.userLimit) opts.userLimit = ch.userLimit;
        await guild.channels.create(opts);
        log.push(`✅ Channel created: #${ch.name}`);
      } else {
        log.push(`✅ Channel exists: #${ch.name}`);
      }
    } catch (e: any) {
      log.push(`⚠️ Channel "${ch.name}": ${e?.message}`);
    }
  }

  return log;
}
