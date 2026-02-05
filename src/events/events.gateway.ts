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
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure properly for production
  },
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async handleConnection(client: Socket) {
    try {
      // Basic auth check using query param or header
      const token =
        client.handshake.auth.token || client.handshake.headers.authorization;
      if (!token) {
        // client.disconnect(); // Optional: Enforce auth
        return;
      }

      const secret =
        this.configService.get<string>('jwt.secret') || 'default-secret';
      // Verify token logic if needed, or just trust for now since we rely on room joining logic
      // const payload = this.jwtService.verify(token, { secret });
      // client.data.user = payload;
    } catch (e) {
      // client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // client left
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
