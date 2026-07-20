// This file declares the global types for the Telegram Web App API.

interface WebAppUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface WebAppInitData {
  query_id?: string;
  user?: WebAppUser;
  receiver?: WebAppUser;
  start_param?: string;
  auth_date: number;
  hash: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: WebAppInitData;
  ready: () => void;
  close: () => void;
  // Add other properties and methods as needed
}

// Extend the Window interface
interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
