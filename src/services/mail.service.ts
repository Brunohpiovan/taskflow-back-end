import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';
    const port = parseInt(
      this.configService.get<string>('SMTP_PORT') ?? '587',
      10,
    );

    console.log(
      `[MailService] Configuring transport: Host=${this.configService.get('SMTP_HOST')} Port=${port} Secure=${secure}`,
    );

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: port,
      secure: secure,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: false,
      },
      // Force IPv4 to avoid ENETUNREACH in environments like Render
      family: 4,
    } as nodemailer.TransportOptions);
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: '"TaskFlow Support" <no-reply@taskflow.com>',
      to,
      subject: 'Recuperação de Senha - TaskFlow',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
            .header { text-align: center; margin-bottom: 32px; }
            .logo { font-size: 26px; font-weight: 800; color: #2256C3 !important; letter-spacing: -0.5px; }
            .content { margin-bottom: 32px; color: #475569; }
            .button { display: inline-block; background-color: #2256C3 !important; color: #ffffff !important; padding: 14px 32px; text-decoration: none !important; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
            .button:hover { background-color: #1e4b9e !important; }
            .footer { text-align: center; font-size: 13px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 24px; }
            h2 { color: #0f172a; font-size: 24px; margin-bottom: 16px; font-weight: 700; }
            p { margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo" style="color: #2256C3;">TaskFlow</div>
            </div>
            <div class="content">
              <h2>Redefinição de Senha</h2>
              <p>Olá,</p>
              <p>Recebemos uma solicitação para redefinir a senha da sua conta no TaskFlow. Se foi você, clique no botão abaixo para criar uma nova senha:</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" class="button" style="display: inline-block; background-color: #2256C3; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Redefinir minha senha</a>
              </div>
              <p style="font-size: 14px; color: #64748b;">Este link é válido por 1 hora.</p>
              <p>Se você não solicitou essa alteração, pode ignorar este email com segurança.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TaskFlow. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      console.log(`[MailService] Sending password reset email to: ${to}`);
      await this.transporter.sendMail(mailOptions);
      console.log(`[MailService] Password reset email sent successfully`);
    } catch (error) {
      console.error(`[MailService] Error sending password reset email:`, error);
      throw error;
    }
  }

  async sendInviteEmail(
    to: string,
    token: string,
    environmentName: string,
    inviterName: string,
  ) {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const joinLink = `${frontendUrl}/join?token=${token}`;

    const mailOptions = {
      from: '"TaskFlow Support" <no-reply@taskflow.com>',
      to,
      subject: `Convite para participar de "${environmentName}" no TaskFlow`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
            .header { text-align: center; margin-bottom: 32px; }
            .logo { font-size: 26px; font-weight: 800; color: #2256C3 !important; letter-spacing: -0.5px; }
            .content { margin-bottom: 32px; color: #475569; }
            .button { display: inline-block; background-color: #2256C3 !important; color: #ffffff !important; padding: 14px 32px; text-decoration: none !important; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
            .button:hover { background-color: #1e4b9e !important; }
            .footer { text-align: center; font-size: 13px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 24px; }
            h2 { color: #0f172a; font-size: 24px; margin-bottom: 16px; font-weight: 700; }
            p { margin-bottom: 16px; }
            .invite-card { background-color: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; text-align: center; }
            .env-name { font-weight: 700; font-size: 18px; color: #0f172a; display: block; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo" style="color: #2256C3;">TaskFlow</div>
            </div>
            <div class="content">
              <h2>Convite de Colaboração</h2>
              <p>Olá,</p>
              <p><strong>${inviterName}</strong> convidou você para colaborar no quadro:</p>
              
              <div class="invite-card">
                <span style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Ambiente</span>
                <span class="env-name">${environmentName}</span>
              </div>

              <p>Para aceitar o convite e começar a colaborar, clique no botão abaixo:</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${joinLink}" class="button" style="display: inline-block; background-color: #2256C3; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Aceitar Convite</a>
              </div>
              <p style="font-size: 14px; color: #64748b;">Se você não esperava por este convite, pode ignorar este email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TaskFlow. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      console.log(`[MailService] Sending invite email to: ${to}`);
      await this.transporter.sendMail(mailOptions);
      console.log(`[MailService] Invite email sent successfully`);
    } catch (error) {
      console.error(`[MailService] Error sending invite email:`, error);
      throw error;
    }
  }
}
