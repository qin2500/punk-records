import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { syncChannels } from './sync';
import { handleMessageCreate } from './events/messageCreate';
import { handleChannelCreate } from './events/channelCreate';
import { handleChannelDelete } from './events/channelDelete';
import { handleChannelUpdate } from './events/channelUpdate';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Bot ready: ${c.user.tag}`);
  await syncChannels(client);
});

client.on(Events.MessageCreate, handleMessageCreate);
client.on(Events.ChannelCreate, handleChannelCreate);
client.on(Events.ChannelDelete, handleChannelDelete);
client.on(Events.ChannelUpdate, handleChannelUpdate);

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) throw new Error('DISCORD_BOT_TOKEN is not set');
client.login(token);
