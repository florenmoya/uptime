import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
config({path:'.env',quiet:true});

export function settings() {
  return {
    databaseUrl:process.env.DATABASE_URL ?? 'postgresql://postgres@localhost:5432/uptime',
    appUrl:process.env.APP_URL ?? 'http://127.0.0.1:3100',
    probeLabel:process.env.PROBE_LABEL ?? 'Local computer',
    discordWebhook:process.env.DISCORD_WEBHOOK_URL ?? '',
    smtpHost:process.env.SMTP_HOST ?? '',
    smtpPort:Number(process.env.SMTP_PORT ?? 587),
    smtpSecure:process.env.SMTP_SECURE==='true',
    smtpUser:process.env.SMTP_USER ?? '',
    smtpPassword:process.env.SMTP_PASSWORD ?? '',
    mailFrom:process.env.MAIL_FROM ?? '',
    mailTo:(process.env.MAIL_TO ?? '').split(',').map(s=>s.trim()).filter(Boolean),
  };
}
export function channelConfig() {
  const s=settings();
  return {discord:Boolean(s.discordWebhook),email:Boolean(s.smtpHost&&s.mailFrom&&s.mailTo.length)};
}
