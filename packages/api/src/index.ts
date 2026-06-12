import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@punk-records/shared';
import collagesRouter from './routes/collages';
import { collageCardsRouter, cardRouter } from './routes/cards';
import internalRouter from './routes/internal';
import { setIo } from './socket/emitter';

const app = express();
const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

setIo(io);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/collages', collagesRouter);
app.use('/api/collages', collageCardsRouter);
app.use('/api/cards', cardRouter);
app.use('/internal', internalRouter);

io.on('connection', (socket) => {
  socket.on('join:collage', (collageId) => {
    socket.join(collageId);
  });
  socket.on('leave:collage', (collageId) => {
    socket.leave(collageId);
  });
});

const PORT = Number(process.env.PORT ?? 3001);
server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
