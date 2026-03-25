import { Client, ActivityType } from "discord.js";

const STATUSES: { name: string; type: ActivityType }[] = [
  { name: "your darkest thoughts", type: ActivityType.Listening },
  { name: "you undress", type: ActivityType.Watching },
  { name: "with hellfire", type: ActivityType.Playing },
  { name: "sinners beg", type: ActivityType.Watching },
  { name: "your pulse slow down", type: ActivityType.Watching },
  { name: "in the space between your ribs", type: ActivityType.Listening },
  { name: "the screaming below", type: ActivityType.Listening },
  { name: "your soul come undone", type: ActivityType.Watching },
  { name: "with your free will", type: ActivityType.Playing },
  { name: "every lie you've ever told", type: ActivityType.Listening },
  { name: "demons whisper your name", type: ActivityType.Listening },
  { name: "you sleep. poorly.", type: ActivityType.Watching },
  { name: "the blood moon rise", type: ActivityType.Watching },
  { name: "with your conscience", type: ActivityType.Playing },
  { name: "you pretend you're not looking", type: ActivityType.Watching },
  { name: "forbidden hymns", type: ActivityType.Listening },
  { name: "you fall apart", type: ActivityType.Watching },
  { name: "with your reflection", type: ActivityType.Playing },
  { name: "you think about me", type: ActivityType.Watching },
  { name: "the altar burn", type: ActivityType.Watching },
  { name: "your prayers go unanswered", type: ActivityType.Watching },
  { name: "you come crawling back", type: ActivityType.Watching },
  { name: "hell's lullabies", type: ActivityType.Listening },
  { name: "with your addiction", type: ActivityType.Playing },
  { name: "your inhibitions dissolve", type: ActivityType.Watching },
  { name: "the void stare back", type: ActivityType.Watching },
  { name: "with your last nerve", type: ActivityType.Playing },
  { name: "you forget how to say no", type: ActivityType.Watching },
  { name: "the shadows move", type: ActivityType.Watching },
  { name: "unholy symphonies", type: ActivityType.Listening },
  { name: "your resistance crumble", type: ActivityType.Watching },
  { name: "with your morality", type: ActivityType.Playing },
  { name: "you beg for it", type: ActivityType.Watching },
  { name: "the wicked rest", type: ActivityType.Watching },
  { name: "your heartbeat in the dark", type: ActivityType.Listening },
  { name: "with your salvation", type: ActivityType.Playing },
  { name: "you pretend I'm not in your head", type: ActivityType.Watching },
  { name: "the damned dance", type: ActivityType.Watching },
  { name: "with your every weakness", type: ActivityType.Playing },
  { name: "you give in", type: ActivityType.Watching },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function handleReady(client: Client) {
  console.log(`✨ Lilith is online as ${client.user?.tag}`);

  let queue: typeof STATUSES = [];

  const rotate = () => {
    if (queue.length === 0) queue = shuffle(STATUSES);
    const status = queue.shift()!;
    client.user?.setPresence({
      activities: [{ name: status.name, type: status.type }],
      status: "dnd",
    });
  };

  rotate();
  setInterval(rotate, 22 * 60 * 1000);
}
