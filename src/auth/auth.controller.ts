import { Controller, Get, Post, Put, Body, HttpCode, HttpStatus, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import * as express from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login com email e senha' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas de login. Tente novamente em alguns minutos.' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Iniciar login com Google' })
  @ApiResponse({ status: 302, description: 'Redireciona para Google' })
  googleLogin() {
    // Passport redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback do login com Google' })
  @ApiResponse({ status: 302, description: 'Redireciona para o frontend com token' })
  googleCallback(@Req() req: express.Request, @Res() res: express.Response) {
    const auth = (req as express.Request & { user?: AuthResponseDto }).user;
    if (!auth?.token) {
      const frontendUrl = this.configService.get<string>('frontendUrl', 'http://localhost:3000');
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
    const frontendUrl = this.configService.get<string>('frontendUrl', 'http://localhost:3000');
    return res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(auth.token)}`);
  }

  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Iniciar login com GitHub' })
  @ApiResponse({ status: 302, description: 'Redireciona para GitHub' })
  githubLogin() {
    // Passport redirects to GitHub
  }

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Callback do login com GitHub' })
  @ApiResponse({ status: 302, description: 'Redireciona para o frontend com token' })
  githubCallback(@Req() req: express.Request, @Res() res: express.Response) {
    const auth = (req as express.Request & { user?: AuthResponseDto }).user;
    if (!auth?.token) {
      const frontendUrl = this.configService.get<string>('frontendUrl', 'http://localhost:3000');
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
    const frontendUrl = this.configService.get<string>('frontendUrl', 'http://localhost:3000');
    return res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(auth.token)}`);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Email já em uso' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Refresh token (valida Bearer e retorna user + token)' })
  @ApiResponse({ status: 200, description: 'Token válido' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
  async refresh(@CurrentUser() payload: JwtPayload): Promise<AuthResponseDto> {
    return this.authService.refresh(payload);
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Obter dados do usuário logado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário (sem senha)' })
  async getProfile(@CurrentUser() payload: JwtPayload) {
    return this.authService.getProfile(payload);
  }

  @Put('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Atualizar dados do usuário (nome, email e/ou senha)' })
  @ApiResponse({ status: 200, description: 'Dados atualizados' })
  @ApiResponse({ status: 400, description: 'Senhas não coincidem ou confirmação ausente' })
  @ApiResponse({ status: 409, description: 'Email já em uso' })
  async updateProfile(
    @CurrentUser() payload: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(payload, dto);
  }
}
