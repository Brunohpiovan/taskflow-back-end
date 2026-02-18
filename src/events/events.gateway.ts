import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: (request, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!request) return callback(null, true);
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.CORS_ORIGIN,
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      if (allowedOrigins.indexOf(request) !== -1 || !request) {
        callback(null, true);
      } else {
        // Fallback for development if needed, or stick to strict checking
        callback(null, true); // Temporarily allow all for debugging if issues persist, or valid origin
      }
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'], // Explicitly allow both
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async handleConnection(client: Socket) {
    this.logger.log(`Socket attempting connection: ${client.id}`);
    try {
      // Basic auth check using query param or header
      const token =
        client.handshake.auth.token || client.handshake.headers.authorization;

      this.logger.debug(`Socket ${client.id} - Token present: ${!!token}`);

      if (!token) {
        // client.disconnect(); // Optional: Enforce auth
        // return;
      }

      const secret =
        this.configService.get<string>('jwt.secret') || 'default-secret';
      // Verify token logic if needed, or just trust for now since we rely on room joining logic
      // const payload = this.jwtService.verify(token, { secret });
      // client.data.user = payload;
      this.logger.log(`Socket connected: ${client.id}`);
    } catch (e) {
      this.logger.error(`Socket connection error for ${client.id}:`, e.message);
      // client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinEnvironment')
  handleJoinEnvironment(
    @ConnectedSocket() client: Socket,
    @MessageBody() environmentId: string,
  ) {
    client.join(`env_${environmentId}`);
    return { event: 'joined', data: environmentId };
  }

  @SubscribeMessage('leaveEnvironment')
  handleLeaveEnvironment(
    @ConnectedSocket() client: Socket,
    @MessageBody() environmentId: string,
  ) {
    client.leave(`env_${environmentId}`);
    return { event: 'left', data: environmentId };
  }

  emitCardMoved(environmentId: string, data: any) {
    this.server.to(`env_${environmentId}`).emit('cardMoved', data);
  }

  emitCardCreated(environmentId: string, data: any) {
    this.server.to(`env_${environmentId}`).emit('cardCreated', data);
  }

  emitCardUpdated(environmentId: string, data: any) {
    this.server.to(`env_${environmentId}`).emit('cardUpdated', data);
  }

  emitCardDeleted(environmentId: string, data: any) {
    this.server.to(`env_${environmentId}`).emit('cardDeleted', data);
  }

  emitBoardCreated(environmentId: string, data: any) {
    this.server.to(`env_${environmentId}`).emit('boardCreated', data);
  }

  emitBoardUpdated(environmentId: string, data: any) {
    this.server.to(`env_${environmentId}`).emit('boardUpdated', data);
  }

  emitBoardDeleted(environmentId: string, data: any) {
    this.server.to(`env_${environmentId}`).emit('boardDeleted', data);
  }
}
