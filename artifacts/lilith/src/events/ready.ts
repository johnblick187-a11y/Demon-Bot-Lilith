import { Client, ActivityType } from "discord.js";

const STATUSES = [
  { name: "over the damned", type: ActivityType.Watching },
  { name: "with your fate", type: ActivityType.Playing },
  { name: "the screaming void", type: ActivityType.Listening },
  { name: "your soul depreciate", type: ActivityType.Watching },
  { name: "symphonies of suffering", type: ActivityType.Listening },
];

export function handleReady(client: Client) {
  console.log(`✨ Lilith is online as ${client.user?.tag}`);

  let i = 0;
  const rotate = () => {
    const status = STATUSES[i % STATUSES.length];
    client.user?.setPresence({
      activities: [{ name: status.name, type: status.type }],
      status: "dnd",
    });
    i++;
  };

  rotate();
  setInterval(rotate, 5 * 60 * 1000);
}
