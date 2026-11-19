import React, { useEffect, useState, useRef } from 'react';
import toast from '../../utils/toast';
import {
  Send,
  Link2,
  RefreshCw,
  Copy,
  Check,
  MessageSquare,
  Bot,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Globe,
  Bell,
  Eye,
  EyeOff,
  Save,
  Radio,
  Sparkles,
  Terminal,
  ShoppingBag,
  Trash2,
  KeyRound,
  Clock,
  UserCheck,
  BarChart3,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  getShopDetail,
  getTelegramSettings,
  setTelegramWebhook,
  testTelegram,
  updateShop,
  unlinkTelegramChat,
  disconnectTelegramAccount,
  generateTelegramLinkingToken,
  updateTelegramPreferences,
  sendTelegramStockAlert,
} from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n';
import { Breadcrumbs } from '../../components/common/Breadcrumbs';
import { sound } from '@/utils/sound';

// shadcn UI Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface LinkedAccountItem {
  chat_id: string;
  masked_chat_id: string;
  telegram_user_id?: string | number | null;
  username?: string | null;
  first_name?: string | null;
  linked_at?: string | null;
}

interface NotificationPreferences {
  daily_report_enabled: boolean;
  weekly_report_enabled: boolean;
  monthly_report_enabled: boolean;
  order_alerts_enabled: boolean;
  payment_alerts_enabled: boolean;
  stock_alerts_enabled: boolean;
}

export default function TelegramSettings() {
  const { user, shop } = useAuth();
  const { t } = useLanguage();

  const [tg, setTg] = useState({ bot_token: '', chat_id: '', enabled: false });
  const [profile, setProfile] = useState<{
    profile_id: string;
    secret_key: string;
    linked_chats: (string | number)[];
    linked_accounts: LinkedAccountItem[];
    bot_username: string;
  }>({
    profile_id: '',
    secret_key: '',
    linked_chats: [],
    linked_accounts: [],
    bot_username: '',
  });

  // Token Generation State
  const [activeToken, setActiveToken] = useState<{
    token: string;
    expires_at: string;
    command: string;
    deep_link?: string | null;
  } | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);

  // Notification Preferences State
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    daily_report_enabled: true,
    weekly_report_enabled: true,
    monthly_report_enabled: true,
    order_alerts_enabled: true,
    payment_alerts_enabled: true,
    stock_alerts_enabled: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingStockAlert, setSendingStockAlert] = useState(false);
  const [webhookBusy, setWebhookBusy] = useState(false);
  const [unlinkingChatId, setUnlinkingChatId] = useState<string | number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const shopName =
    shop?.shop_name ||
    shop?.name ||
    user?.shop_name ||
    'MiniStore';

  const isConfigured = Boolean(tg.bot_token.trim());
  const isLinked = profile.linked_chats.length > 0;

  // Countdown timer effect
  useEffect(() => {
    if (countdownSeconds === null || countdownSeconds <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdownSeconds !== null && countdownSeconds > 0]);

  const formatCountdown = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const load = () => {
    if (!user?.shop_id) return;
    setLoading(true);
    Promise.all([
      getShopDetail(user.shop_id),
      getTelegramSettings(user.shop_id).catch(() => null),
    ])
      .then(([s, st]) => {
        const rawTg =
          typeof s.telegram_settings === 'string'
            ? (() => {
                try {
                  return JSON.parse(s.telegram_settings);
                } catch {
                  return {};
                }
              })()
            : s.telegram_settings || {};

        setTg({
          bot_token: rawTg.bot_token || st?.bot_token || '',
          chat_id: rawTg.chat_id || st?.chat_id || '',
          enabled: rawTg.enabled ?? st?.enabled ?? false,
        });

        if (st) {
          setProfile({
            profile_id: st.profile_id || '',
            secret_key: st.secret_key || '',
            linked_chats: st.linked_chats || [],
            linked_accounts: st.linked_accounts || [],
            bot_username: st.bot_username || '',
          });

          if (st.notification_preferences) {
            setPreferences((prev) => ({
              ...prev,
              ...st.notification_preferences,
            }));
          }

          if (st.active_token && st.active_token.seconds_remaining > 0) {
            setCountdownSeconds(Math.floor(st.active_token.seconds_remaining));
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load shop telegram settings:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [user?.shop_id]);

  const save = async () => {
    sound.playClick();
    setSaving(true);
    try {
      await updateShop(user.shop_id, { telegram_settings: tg });
      const st = await getTelegramSettings(user.shop_id).catch(() => null);
      if (st) {
        setProfile({
          profile_id: st.profile_id || '',
          secret_key: st.secret_key || '',
          linked_chats: st.linked_chats || [],
          linked_accounts: st.linked_accounts || [],
          bot_username: st.bot_username || '',
        });
      }
      sound.playSuccess();
      toast.success(t('telegram.saveSuccess', 'Telegram settings saved successfully!'));
    } catch (err: any) {
      sound.playError();
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          t('telegram.saveFailed', 'Failed to save Telegram settings')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!user?.shop_id) return;
    sound.playClick();
    setGeneratingToken(true);
    try {
      const res = await generateTelegramLinkingToken(user.shop_id);
      if (res?.ok) {
        sound.playSuccess();
        setActiveToken({
          token: res.token,
          expires_at: res.expires_at,
          command: res.command,
          deep_link: res.deep_link,
        });
        setCountdownSeconds(res.expires_in_seconds || 900);
        toast.success(
          t('telegram.tokenGeneratedSuccess', 'Secure Linking Token generated! Valid for 15 minutes.')
        );
      }
    } catch (err: any) {
      sound.playError();
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          'Failed to generate linking token'
      );
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleDisconnect = async (chatId: string | number) => {
    if (!window.confirm(t('telegram.disconnectAccountConfirm', 'Are you sure you want to disconnect this Telegram account?'))) {
      return;
    }
    sound.playClick();
    setUnlinkingChatId(chatId);
    try {
      const res = await disconnectTelegramAccount(user.shop_id, chatId);
      sound.playSuccess();
      toast.success(t('telegram.disconnectSuccess', 'Telegram account disconnected successfully!'));
      setProfile((prev) => ({
        ...prev,
        linked_chats: prev.linked_chats.filter((c) => String(c) !== String(chatId)),
        linked_accounts: prev.linked_accounts.filter((a) => String(a.chat_id) !== String(chatId)),
      }));
    } catch (err: any) {
      sound.playError();
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          t('telegram.disconnectFailed', 'Failed to disconnect Telegram account')
      );
    } finally {
      setUnlinkingChatId(null);
    }
  };

  const handleSavePreferences = async () => {
    if (!user?.shop_id) return;
    sound.playClick();
    setSavingPrefs(true);
    try {
      await updateTelegramPreferences(user.shop_id, preferences);
      sound.playSuccess();
      toast.success(t('telegram.preferencesSaved', 'Notification preferences updated successfully!'));
    } catch (err: any) {
      sound.playError();
      toast.error('Failed to update notification preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const runTest = async () => {
    sound.playClick();
    const effectiveChatId =
      tg.chat_id.trim() ||
      (profile.linked_chats.length > 0 ? String(profile.linked_chats[0]) : '');

    if (!tg.bot_token.trim() || !effectiveChatId) {
      toast.error(t('telegram.missingCredentials', 'Please enter Bot Token and Chat ID first'));
      return;
    }

    setTesting(true);
    try {
      await updateShop(user.shop_id, { telegram_settings: tg });
      const res = await testTelegram({
        shop_id: user.shop_id,
        bot_token: tg.bot_token.trim(),
        chat_id: effectiveChatId,
      });

      if (res?.ok) {
        sound.playSuccess();
        toast.success(
          t('telegram.testSuccess', 'Test notification sent! Check your Telegram chat.')
        );
      } else {
        sound.playError();
        toast.error(res?.detail || t('telegram.testFailed', 'Failed to send test notification'));
      }
    } catch (err: any) {
      sound.playError();
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          t('telegram.testFailed', 'Failed to send test notification')
      );
    } finally {
      setTesting(false);
    }
  };

  const runStockAlert = async () => {
    sound.playClick();
    setSendingStockAlert(true);
    try {
      const res = await sendTelegramStockAlert(user.shop_id);
      if (res?.ok) {
        sound.playSuccess();
        toast.success(t('telegram.stockAlertSuccess', 'Low-stock alert sent successfully to Telegram!'));
      } else {
        sound.playError();
        toast.error(res?.detail || t('telegram.stockAlertFailed', 'Failed to send low-stock alert'));
      }
    } catch (err: any) {
      sound.playError();
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          t('telegram.stockAlertFailed', 'Failed to send low-stock alert')
      );
    } finally {
      setSendingStockAlert(false);
    }
  };

  const runWebhook = async () => {
    sound.playClick();
    setWebhookBusy(true);
    try {
      await setTelegramWebhook(user.shop_id);
      sound.playSuccess();
      toast.success(
        t('telegram.webhookSuccess', 'Webhook registered! You can now /start the bot and LINK this shop.')
      );
      load();
    } catch (err: any) {
      sound.playError();
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          t('telegram.webhookFailed', 'Failed to register webhook')
      );
    } finally {
      setWebhookBusy(false);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        sound.playClick();
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
        toast.success(t('telegram.copiedToClipboard', 'Copied to clipboard!'));
      })
      .catch(() => {
        sound.playError();
        toast.error(t('telegram.copyFailed', 'Failed to copy to clipboard'));
      });
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <Breadcrumbs />
        <Card className="p-8 flex flex-col items-center justify-center min-h-[300px] space-y-3">
          <RefreshCw className="size-6 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">
            {t('telegram.loading', 'Loading Telegram configurations...')}
          </p>
        </Card>
      </div>
    );
  }

  const effectiveCommand = activeToken
    ? activeToken.command
    : profile.profile_id && profile.secret_key
    ? `LINK ${profile.profile_id} ${profile.secret_key}`
    : '';

  const canTest = Boolean(tg.bot_token && (tg.chat_id || profile.linked_chats.length > 0));

  return (
    <div className="space-y-6 max-w-6xl pb-10">
      {/* ─── Breadcrumbs & Header ────────────────────────────────────── */}
      <div className="space-y-2">
        <Breadcrumbs />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {t('telegram.title', 'Telegram Bot')}
              </h1>

              {isConfigured ? (
                isLinked && tg.enabled ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold gap-1 px-2.5 py-1 rounded-lg"
                  >
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t('telegram.statusActive', 'Connected & Active')}
                  </Badge>
                ) : isLinked && !tg.enabled ? (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-bold gap-1 px-2.5 py-1 rounded-lg"
                  >
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    {t('telegram.statusDisabled', 'Notifications Disabled')}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-xs font-bold gap-1 px-2.5 py-1 rounded-lg"
                  >
                    <span className="size-1.5 rounded-full bg-sky-500" />
                    Bot Ready · Awaiting Link
                  </Badge>
                )
              ) : (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-bold gap-1 px-2.5 py-1 rounded-lg"
                >
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  {t('telegram.statusNotConfigured', 'Setup Incomplete')}
                </Badge>
              )}

              {profile.linked_chats.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs font-medium bg-muted text-muted-foreground border px-2.5 py-1 rounded-lg"
                >
                  {profile.linked_chats.length} {t('telegram.linkedBadge', 'Linked')}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t(
                'telegram.subtitle',
                'Connect your Telegram bot to receive real-time order and payment notifications directly in your groups or channels.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              onClick={save}
              disabled={saving}
              className="h-10 sm:h-10.5 px-5 rounded-xl gap-2 font-bold text-sm shadow-sm"
            >
              {saving ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>{t('telegram.saving', 'Saving...')}</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>{t('telegram.saveSettings', 'Save Settings')}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Main Two-Column Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration Cards */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Card 1: Secure Account Linking */}
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="space-y-1.5 pb-4 border-b border-border/80 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <Link2 className="size-5 text-primary" />
                  <CardTitle className="text-base font-bold">
                    {t('telegram.card1Title', 'Link Your Shop to a Telegram Chat')}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs leading-relaxed text-muted-foreground mt-1">
                  {t(
                    'telegram.card1Desc',
                    'The shop bot receives order & payment notifications in any chat that links to this shop.'
                  )}
                </CardDescription>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  sound.playClick();
                  load();
                }}
                className="h-9 px-3 rounded-xl gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground shrink-0"
              >
                <RefreshCw className="size-3.5" />
                <span>{t('telegram.refresh', 'Refresh')}</span>
              </Button>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              {/* Token Generator Banner */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                      <KeyRound className="size-4 text-primary" />
                      <span>{t('telegram.generateTokenBtn', 'Generate Linking Token')}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tokens are single-use, cryptographically secure, and expire after 15 minutes.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleGenerateToken}
                    disabled={generatingToken || !tg.bot_token}
                    size="sm"
                    className="h-9 px-4 rounded-xl font-bold text-xs gap-1.5 shrink-0"
                  >
                    {generatingToken ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>{t('telegram.generatingToken', 'Generating Token...')}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3.5" />
                        <span>
                          {activeToken
                            ? t('telegram.regenerateTokenBtn', 'Regenerate Token')
                            : t('telegram.generateTokenBtn', 'Generate Linking Token')}
                        </span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Active Token Display with Countdown */}
                {activeToken && countdownSeconds !== null && countdownSeconds > 0 && (
                  <div className="mt-2 p-3 bg-card rounded-xl border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <Clock className="size-3.5" />
                        <span>{t('telegram.tokenCountdown', 'Token expires in:')} {formatCountdown(countdownSeconds)}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Active Token
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-950 dark:bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs px-3 py-2 rounded-lg break-all flex items-center gap-2">
                        <Terminal className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="select-all font-bold">{activeToken.command}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(activeToken.command, 'active_token_cmd')}
                        className="size-9 rounded-lg shrink-0"
                        title={t('telegram.copyCommand', 'Copy command')}
                      >
                        {copiedField === 'active_token_cmd' ? (
                          <Check className="size-4 text-emerald-500" />
                        ) : (
                          <Copy className="size-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>

                    {profile.bot_username && (
                      <div className="pt-1">
                        <a
                          href={`https://t.me/${profile.bot_username}?start=link_${activeToken.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          <Send className="size-3" />
                          <span>{t('telegram.openInTelegram', 'Open Bot in Telegram')}</span>
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {activeToken && countdownSeconds === 0 && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{t('telegram.tokenExpired', 'Token expired. Please generate a new one.')}</span>
                  </div>
                )}
              </div>

              {/* Inset Stepper Box */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3.5">
                <p className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-4 text-primary" />
                  <span>{t('telegram.howToLinkTitle', 'How to link your group (3 steps):')}</span>
                </p>

                <div className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                  {/* Step 1 */}
                  <div className="flex items-start gap-2.5">
                    <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="leading-relaxed">
                      <span>{t('telegram.step1', 'Add the bot to your group from Telegram:')} </span>
                      {profile.bot_username ? (
                        <a
                          href={`https://t.me/${profile.bot_username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-600 dark:text-sky-400 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          @{profile.bot_username}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground font-medium">
                          {t('telegram.step1SaveFirst', 'save the Bot Token below first, then refresh')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-2.5">
                    <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="leading-relaxed">
                      <span>{t('telegram.step2', 'In that group, press Start (or send /start).')}</span>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-2.5">
                    <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="leading-relaxed">
                      <span>{t('telegram.step3', 'Send the command below in the group (or copy it):')}</span>
                    </div>
                  </div>
                </div>

                {/* Command Terminal Box */}
                {effectiveCommand ? (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 bg-slate-950 dark:bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs sm:text-sm px-3.5 py-2.5 rounded-xl break-all flex items-center gap-2 shadow-inner">
                      <Terminal className="size-4 text-muted-foreground shrink-0" />
                      <span className="select-all">{effectiveCommand}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(effectiveCommand, 'link_command')}
                      className="size-10 rounded-xl shrink-0"
                      title={t('telegram.copyCommand', 'Copy command')}
                    >
                      {copiedField === 'link_command' ? (
                        <Check className="size-4 text-emerald-500" />
                      ) : (
                        <Copy className="size-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic pt-1">
                    {t(
                      'telegram.profileIdNotSet',
                      'Profile ID / Secret Key will appear here once the bot token is saved.'
                    )}
                  </p>
                )}

                {/* Profile ID Inset */}
                <div className="pt-2 border-t border-border">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">
                      {t('telegram.profileIdLabel', 'Profile ID')}
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        readOnly
                        value={profile.profile_id || '—'}
                        className="h-10 text-xs sm:text-sm font-mono bg-background rounded-xl"
                      />
                      {profile.profile_id && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(profile.profile_id, 'profile_id')}
                          className="size-10 rounded-xl shrink-0"
                          title={t('telegram.copyCommand', 'Copy')}
                        >
                          {copiedField === 'profile_id' ? (
                            <Check className="size-4 text-emerald-500" />
                          ) : (
                            <Copy className="size-4 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Webhook Register Button */}
                <div className="pt-2 border-t border-border space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={runWebhook}
                    disabled={webhookBusy || !tg.bot_token}
                    className="h-10 px-4 rounded-xl gap-2 text-xs sm:text-sm font-bold"
                  >
                    {webhookBusy ? (
                      <>
                        <RefreshCw className="size-4 animate-spin text-primary" />
                        <span>{t('telegram.registeringWebhook', 'Registering Webhook...')}</span>
                      </>
                    ) : (
                      <>
                        <Globe className="size-4 text-primary" />
                        <span>{t('telegram.registerWebhookBtn', 'Register Webhook (enables /start + LINK)')}</span>
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t(
                      'telegram.webhookHelp',
                      'Required before any chat can link. Press it again after any update to re-register (also enables the bot to auto-reply with LINK instructions when added to a group).'
                    )}
                  </p>
                </div>
              </div>

              {/* Connected Telegram Accounts Container */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                    <UserCheck className="size-4 text-primary" />
                    <span>{t('telegram.connectedAccounts', 'Connected Telegram Accounts')} ({profile.linked_accounts.length || profile.linked_chats.length})</span>
                  </Label>
                </div>

                {profile.linked_accounts.length === 0 && profile.linked_chats.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t(
                        'telegram.noConnectedAccounts',
                        'No Telegram accounts connected yet. Follow the steps above to link the first one.'
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(profile.linked_accounts.length > 0
                      ? profile.linked_accounts
                      : profile.linked_chats.map((c): LinkedAccountItem => ({
                          chat_id: String(c),
                          masked_chat_id: String(c),
                          username: null,
                          first_name: null,
                          linked_at: null,
                        }))
                    ).map((account) => (
                      <div
                        key={account.chat_id}
                        className="flex items-center justify-between gap-2.5 p-3 rounded-xl border border-border bg-card shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-9 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                            <MessageSquare className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate">
                              {account.username ? `@${account.username}` : (account.first_name || 'Telegram User')}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground truncate">
                              ID: {account.masked_chat_id || account.chat_id}
                            </p>
                            {account.linked_at && (
                              <p className="text-[10px] text-muted-foreground/80">
                                {new Date(account.linked_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={unlinkingChatId === account.chat_id}
                            onClick={() => handleDisconnect(account.chat_id)}
                            className="h-8 px-2.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                            title={t('telegram.disconnectAccount', 'Disconnect')}
                          >
                            {unlinkingChatId === account.chat_id ? (
                              <RefreshCw className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                            <span>{t('telegram.disconnectAccount', 'Disconnect')}</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Notification Preferences */}
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="space-y-1.5 pb-4 border-b border-border/80 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <Layers className="size-5 text-primary" />
                  <CardTitle className="text-base font-bold">
                    {t('telegram.notificationPreferencesTitle', 'Notification Preferences')}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground mt-1">
                  {t(
                    'telegram.notificationPreferencesDesc',
                    'Choose which business reports and alerts you receive automatically through Telegram.'
                  )}
                </CardDescription>
              </div>

              <Button
                type="button"
                onClick={handleSavePreferences}
                disabled={savingPrefs}
                size="sm"
                className="h-9 px-4 rounded-xl font-bold text-xs gap-1.5 shrink-0"
              >
                {savingPrefs ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>{t('telegram.savingPreferences', 'Saving...')}</span>
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    <span>{t('telegram.savePreferences', 'Save Preferences')}</span>
                  </>
                )}
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
              {/* Daily Report Toggle */}
              <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="size-4 text-emerald-500" />
                    <Label className="text-xs sm:text-sm font-bold text-foreground">
                      {t('telegram.dailyReportLabel', 'Daily Sales Report (Nightly EOD at 10:00 PM)')}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {t('telegram.dailyReportDesc', 'Receive comprehensive end-of-day sales summary, best-sellers, and inventory status.')}
                  </p>
                </div>
                <Switch
                  checked={preferences.daily_report_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, daily_report_enabled: checked })
                  }
                />
              </div>

              {/* Weekly Report Toggle */}
              <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-sky-500" />
                    <Label className="text-xs sm:text-sm font-bold text-foreground">
                      {t('telegram.weeklyReportLabel', 'Weekly Sales Report (Sunday at 10:00 PM)')}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {t('telegram.weeklyReportDesc', 'Receive 7-day trend analysis, revenue growth, and comparison with previous week.')}
                  </p>
                </div>
                <Switch
                  checked={preferences.weekly_report_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, weekly_report_enabled: checked })
                  }
                />
              </div>

              {/* Monthly Report Toggle */}
              <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-indigo-500" />
                    <Label className="text-xs sm:text-sm font-bold text-foreground">
                      {t('telegram.monthlyReportLabel', 'Monthly Sales Report (1st of Month at 08:00 AM)')}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {t('telegram.monthlyReportDesc', 'Receive full monthly financial breakdown and 30-day performance trends.')}
                  </p>
                </div>
                <Switch
                  checked={preferences.monthly_report_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, monthly_report_enabled: checked })
                  }
                />
              </div>

              {/* Real-time Order Alerts Toggle */}
              <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="size-4 text-amber-500" />
                    <Label className="text-xs sm:text-sm font-bold text-foreground">
                      {t('telegram.orderAlertsLabel', 'New Order Alerts')}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {t('telegram.orderAlertsDesc', 'Instant notification when a customer places an order on your storefront.')}
                  </p>
                </div>
                <Switch
                  checked={preferences.order_alerts_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, order_alerts_enabled: checked })
                  }
                />
              </div>

              {/* Payment Alerts Toggle */}
              <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <Label className="text-xs sm:text-sm font-bold text-foreground">
                      {t('telegram.paymentAlertsLabel', 'Payment Confirmation Alerts (ABA KHQR)')}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {t('telegram.paymentAlertsDesc', 'Instant verification alert with transaction details and auto stock deduction.')}
                  </p>
                </div>
                <Switch
                  checked={preferences.payment_alerts_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, payment_alerts_enabled: checked })
                  }
                />
              </div>

              {/* Low Stock Alerts Toggle */}
              <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-4 text-rose-500" />
                    <Label className="text-xs sm:text-sm font-bold text-foreground">
                      {t('telegram.stockAlertsLabel', 'Low Stock & Out of Stock Alerts')}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {t('telegram.stockAlertsDesc', 'Automatic warning when items reach low stock threshold (≤ 5 units).')}
                  </p>
                </div>
                <Switch
                  checked={preferences.stock_alerts_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, stock_alerts_enabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Bot Token & General Settings */}
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="space-y-1.5 pb-4 border-b border-border/80">
              <div className="flex items-center gap-2 text-primary">
                <Bell className="size-5 text-primary" />
                <CardTitle className="text-base font-bold">
                  {t('telegram.card2Title', 'Payment & Order Alerts')}
                </CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {t(
                  'telegram.card2Desc',
                  'Receive automatic notifications when a customer places an order or pays successfully. Create a bot with @BotFather and add it to your group to get the chat ID.'
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              {/* Bot Token Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tg_bot_token" className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Bot className="size-4 text-muted-foreground" />
                    <span>{t('telegram.botTokenLabel', 'Bot Token')}</span>
                    <span className="text-rose-500">*</span>
                  </Label>
                  {tg.bot_token && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer"
                      >
                        {showToken ? (
                          <>
                            <EyeOff className="size-3.5" />
                            <span>{t('telegram.hide', 'Hide')}</span>
                          </>
                        ) : (
                          <>
                            <Eye className="size-3.5" />
                            <span>{t('telegram.reveal', 'Reveal')}</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tg.bot_token, 'bot_token')}
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === 'bot_token' ? (
                          <>
                            <Check className="size-3.5 text-emerald-500" />
                            <span className="text-emerald-500 font-semibold">{t('telegram.copied', 'Copied')}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" />
                            <span>{t('telegram.copyCommand', 'Copy')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="tg_bot_token"
                    type={showToken ? 'text' : 'password'}
                    value={tg.bot_token}
                    onChange={(e) => setTg({ ...tg, bot_token: e.target.value })}
                    placeholder={t('telegram.botTokenPlaceholder', '123456789:ABCdefGHI...')}
                    className="h-10 text-xs sm:text-sm font-mono pr-10 rounded-xl"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <ShieldCheck className="size-4 opacity-50" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'telegram.botTokenHelp',
                    'Create your bot with @BotFather, then paste its token here. Tokens are stored per-shop on the server.'
                  )}
                </p>
              </div>

              {/* Chat ID Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tg_chat_id" className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="size-4 text-muted-foreground" />
                    <span>{t('telegram.chatIdLabel', 'Chat ID (group / channel)')}</span>
                  </Label>
                  {tg.chat_id && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(tg.chat_id, 'chat_id')}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'chat_id' ? (
                        <>
                          <Check className="size-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">{t('telegram.copied', 'Copied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>{t('telegram.copyCommand', 'Copy')}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <Input
                  id="tg_chat_id"
                  value={tg.chat_id}
                  onChange={(e) => setTg({ ...tg, chat_id: e.target.value })}
                  placeholder={t('telegram.chatIdPlaceholder', '-1001234567890')}
                  className="h-10 text-xs sm:text-sm font-mono rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  {t(
                    'telegram.chatIdHelp',
                    'Negative IDs are supergroups; private chats use positive IDs.'
                  )}
                </p>
              </div>

              {/* Enable Notifications Switch Inset */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label
                    htmlFor="tg_enabled"
                    className="text-xs sm:text-sm font-bold text-foreground cursor-pointer flex items-center gap-2"
                  >
                    <span>{t('telegram.enableNotificationsLabel', 'Enable Telegram notifications')}</span>
                    {tg.enabled ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-2.5 py-0.5 rounded-md"
                      >
                        {t('telegram.statusEnabled', 'Notifications Active')}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-bold bg-muted text-muted-foreground border-border px-2.5 py-0.5 rounded-md"
                      >
                        {t('telegram.statusDisabled', 'Notifications Disabled')}
                      </Badge>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'telegram.enableNotificationsDesc',
                      'When turned on, the system sends instant alerts for every store activity.'
                    )}
                  </p>
                </div>
                <Switch
                  id="tg_enabled"
                  checked={tg.enabled}
                  onCheckedChange={(checked) => {
                    sound.playClick();
                    setTg({ ...tg, enabled: checked });
                  }}
                />
              </div>

              {/* Send Test Notification Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={runTest}
                    disabled={testing || !canTest}
                    className="h-10 px-4 rounded-xl gap-2 text-xs sm:text-sm font-bold"
                  >
                    {testing ? (
                      <>
                        <RefreshCw className="size-4 animate-spin text-primary" />
                        <span>{t('telegram.sendingTest', 'Sending Test Notification...')}</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-4 text-primary" />
                        <span>{t('telegram.sendTestBtn', 'Send Test Notification')}</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={runStockAlert}
                    disabled={sendingStockAlert || !canTest}
                    className="h-10 px-4 rounded-xl gap-2 text-xs sm:text-sm font-semibold"
                  >
                    {sendingStockAlert ? (
                      <>
                        <RefreshCw className="size-4 animate-spin text-primary" />
                        <span>{t('telegram.sendingStockAlert', 'Sending stock alert...')}</span>
                      </>
                    ) : (
                      <>
                        <Radio className="size-4 text-primary" />
                        <span>{t('telegram.sendStockAlertBtn', 'Send Low-Stock Test Alert')}</span>
                      </>
                    )}
                  </Button>
                </div>

                {!canTest && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="size-4 shrink-0" />
                    {t(
                      'telegram.missingConfigWarning',
                      'Enter Bot Token and at least one Chat ID to send test alerts'
                    )}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Telegram Notification Simulation & Setup Guide */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          {/* Mockup Preview Card */}
          <Card className="rounded-2xl border shadow-sm overflow-hidden sticky top-20 bg-card">
            <CardHeader className="p-4 bg-muted/40 border-b border-border/80 flex flex-row items-center justify-between gap-2 space-y-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Bot className="size-4.5 text-primary shrink-0" />
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground truncate">
                  {t('telegram.previewTitle', 'Telegram Preview')}
                </CardTitle>
              </div>
              <Badge
                variant="outline"
                className="text-xs font-bold whitespace-nowrap shrink-0 px-2.5 py-1 rounded-lg bg-primary/5 text-primary border-primary/20"
              >
                {t('telegram.liveSimulation', 'Live Simulation')}
              </Badge>
            </CardHeader>

            <CardContent className="p-5 flex flex-col items-center">
              {/* Telegram Phone Simulation Frame */}
              <div className="w-full max-w-[320px] rounded-2xl border border-border bg-[#EFEFEF] dark:bg-slate-950 shadow-md overflow-hidden relative">
                {/* Telegram Header Bar */}
                <div className="bg-[#2AABEE] text-white p-3 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8.5 rounded-full bg-white text-[#2AABEE] flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                      <Send className="size-4 -rotate-45" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold leading-tight flex items-center gap-1.5 truncate">
                        <span className="truncate">{profile.bot_username ? `@${profile.bot_username}` : `${shopName} Bot`}</span>
                        <span className="bg-white/20 text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold shrink-0">
                          {t('telegram.botBadge', 'bot')}
                        </span>
                      </div>
                      <div className="text-[10px] text-sky-100 flex items-center gap-1 pt-0.5">
                        <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        <span>{t('telegram.botOnline', 'Online')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Telegram Chat Message Bubble (Report Simulation) */}
                <div className="p-3.5 space-y-2">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl rounded-tl-xs shadow-sm space-y-2 text-left">
                    <div className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                      <BarChart3 className="size-4 text-emerald-500" />
                      <span>📊 របាយការណ៍ការលក់ប្រចាំថ្ងៃ</span>
                    </div>
                    <Separator />
                    <div className="space-y-1.5 font-mono text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground/80">ចំណូលលក់:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">$185.50</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground/80">ការកុម្ម៉ង់:</span>
                        <span className="text-foreground font-bold">8 វិក្កយបត្រ</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground/80">ទំនិញលក់បាន:</span>
                        <span className="text-foreground">14 ឯកតា</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground/80">AOV:</span>
                        <span className="text-foreground font-semibold">$23.19</span>
                      </div>
                      <div className="flex justify-between items-center pt-1.5 border-t border-border/40">
                        <span className="text-[11px] text-emerald-600 font-bold">
                          KHQR: 85% · Cash: 15%
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          10:00 PM
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BotFather Quick Setup Guide */}
              <div className="mt-4 w-full text-left p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-foreground">
                  <Bot className="size-4.5 text-primary" />
                  <span>{t('telegram.botFatherHelpTitle', 'Create Bot with @BotFather')}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(
                    'telegram.botFatherHelpDesc',
                    'Quick guide to generate your own Telegram bot token in 30 seconds:'
                  )}
                </p>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>{t('telegram.botFatherStep1', 'Open Telegram and message @BotFather')}</li>
                  <li>
                    {t(
                      'telegram.botFatherStep2',
                      "Send /newbot and choose a display name & username ending with 'bot'"
                    )}
                  </li>
                  <li>
                    {t(
                      'telegram.botFatherStep3',
                      'Copy the provided HTTP API token and paste it into the Bot Token field'
                    )}
                  </li>
                </ol>

                <div className="pt-1">
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    <span>{t('telegram.openBotFather', 'Open @BotFather')}</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
