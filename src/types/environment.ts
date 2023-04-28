export interface GrammyEnvironmentConfig {
  BOT_TOKEN: string;
  CREATOR_ID?: string | null;
  USERS_WHITELIST: string;
}

export interface ServerEnvironmentConfig {
  PORT: number;
  HOST: string;
  BOT_PORT: number;
  BOT_HOST: string;
  USE_SERVER: boolean;
}

export interface MiscellaneousEnvironmentConfig {
  ENV: 'local' | 'develop' | 'production';
  UNIT_TESTING?: boolean;
  TEST_TENSOR: boolean; // deprecated
  TENSOR_RANK: number;
  REDIS_URL: string;
  DEBUG: boolean;
  DEBUG_MIDDLEWARE: boolean;
  DISABLE_LOGS_CHAT: boolean;
  ALARM_KEY: string;
}

export interface UserbotEnvironmentConfig {
  USERBOT_APP_ID: string;
  USERBOT_API_HASH: string;
  USERBOT_LOGIN_PHONE: string;
  USERBOT_LOGIN_CODE: string;
  USERBOT_TRAING_CHAT_NAME: string;
}

export interface PostgresEnvironmentConfig {
  POSTGRES_PASSWORD: string;
  PGHOST: string;
  PGUSER: string;
  PGDATABASE: string;
  PGPORT: string;
}

export interface GoogleEnvironmentConfig {
  GOOGLE_CREDITS: string;
  GOOGLE_SPREADSHEET_ID: string;
}

export interface AwsEnvironmentConfig {
  S3_BUCKET?: string | null;
  S3_PATH: string;
  AWS_REGION: string;
}

export type EnvironmentConfig = GrammyEnvironmentConfig &
  ServerEnvironmentConfig &
  MiscellaneousEnvironmentConfig &
  UserbotEnvironmentConfig &
  PostgresEnvironmentConfig &
  GoogleEnvironmentConfig &
  AwsEnvironmentConfig;
