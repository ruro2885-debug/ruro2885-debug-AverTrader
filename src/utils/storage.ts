/**
 * Safe wrapper for localStorage to handle QuotaExceededError and other storage issues.
 */

const memoryFallbackStore = new Map<string, string>();

export const safeStorage = {
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error: any) {
      if (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22 ||
        error.number === -2147024882
      ) {
        console.warn(`[Storage] Quota exceeded for key: ${key}. Performing storage cleanup...`);
        
        // 1. Clear ALL old sim_traders versions & non-essential cached keys
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && k !== key) {
              if (
                k.startsWith('aver_sim_traders_v') ||
                k.startsWith('aver_copytraders') ||
                k.startsWith('aver_copytrade_events') ||
                k.startsWith('aver_activity_') ||
                k.startsWith('aver_recommendations_') ||
                k.startsWith('aver_trades_') ||
                k.startsWith('user_profile_') ||
                k === 'portfolio_vault_balance' ||
                k === 'portfolio_active_offset'
              ) {
                localStorage.removeItem(k);
              }
            }
          }
        } catch (cleanErr) {
          console.warn("[Storage] Cleanup notice:", cleanErr);
        }

        // 2. Retry setting in localStorage
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryError) {
          // 3. Fallback to sessionStorage
          try {
            sessionStorage.setItem(key, value);
            return true;
          } catch (sessionErr) {
            // 4. Fallback to memory store so state is preserved during current session
            memoryFallbackStore.set(key, value);
            return true;
          }
        }
      }
      // Non-quota error fallback
      memoryFallbackStore.set(key, value);
      return false;
    }
  },

  getItem: (key: string): string | null => {
    try {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
      const sessionVal = sessionStorage.getItem(key);
      if (sessionVal !== null) return sessionVal;
      return memoryFallbackStore.get(key) || null;
    } catch (error) {
      return memoryFallbackStore.get(key) || null;
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
    try {
      sessionStorage.removeItem(key);
    } catch (e) {}
    memoryFallbackStore.delete(key);
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch (e) {}
    try {
      sessionStorage.clear();
    } catch (e) {}
    memoryFallbackStore.clear();
  }
};

/**
 * Creates an unambiguous user-scoped storage key
 */
export function getUserScopedKey(uid: string, key: string): string {
  if (!uid) return `aver:anon:${key}`;
  return `aver:user:${uid}:${key}`;
}

export function setUserScopedItem(uid: string, key: string, value: string): void {
  if (!uid) return;
  safeStorage.setItem(getUserScopedKey(uid, key), value);
}

export function getUserScopedItem(uid: string, key: string): string | null {
  if (!uid) return null;
  return safeStorage.getItem(getUserScopedKey(uid, key));
}

export function removeUserScopedItem(uid: string, key: string): void {
  if (!uid) return;
  safeStorage.removeItem(getUserScopedKey(uid, key));
}

/**
 * Purges ALL user-scoped storage data for a specific user ID upon signout or switch
 */
export function clearAllUserData(uid: string): void {
  if (!uid) return;

  const prefix1 = `aver:user:${uid}:`;
  const prefix2 = `_${uid}`;
  const directKeys = [
    `user_profile_${uid}`,
    `aver_wallet_${uid}`,
    `aver_portfolio_current_${uid}`,
    `aver_session_${uid}`,
    `aver_positions_${uid}`,
    `aver_trades_${uid}`,
    `aver_activity_${uid}`,
    `aver_recommendations_${uid}`,
    `aver_session_control_${uid}`,
    `aver_configs_${uid}`,
    `aver_txs_${uid}`,
    `aver_vault_balance_${uid}`,
    `portfolio_vault_balance_${uid}`,
    `vault_passcode_${uid}`,
    `vault_onboarded_${uid}`,
    `vault_target_${uid}`,
    `vault_target_configured_${uid}`,
    `vault_assets_${uid}`,
    `aver_twoFactorEnabled_${uid}`,
    `aver_email_verified_${uid}`,
    `aver_kyc_verified_${uid}`,
    `aver_bronze_completed_${uid}`,
    `aver_platinum_completed_${uid}`,
    `aver_welcome_bonus_claimed_${uid}`,
    `aver_task_deposit_1000_${uid}`,
    `aver_task_trade_500_${uid}`,
    `aver_task_copy_10_${uid}`,
    `aver_task_strat_2_${uid}`,
    `aver_copy_trades_count_${uid}`,
    `aver_used_strategies_count_${uid}`,
    `aver_custom_photo_${uid}`,
    `aver_session_end_cooldown_${uid}`,
    `aver_latest_completed_session_${uid}`
  ];

  directKeys.forEach(k => safeStorage.removeItem(k));

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(prefix1) || k.includes(prefix2) || k.includes(uid))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => safeStorage.removeItem(k));
  } catch (e) {}
}

/**
 * Purges legacy global unscoped keys that cause cross-account leaks
 */
export function purgeLegacyGlobalKeys(uid?: string): void {
  // Before purging, try to migrate legacy data if it exists
  try {
    // 1. Migrate legacy profile from aver_user_profile
    const legacyProfile = localStorage.getItem('aver_user_profile');
    if (legacyProfile) {
      const parsed = JSON.parse(legacyProfile);
      const targetUid = uid || parsed?.uid || 'guest';
      
      // Migrate photo
      if (parsed && (parsed.profilePhotoURL || parsed.avatarUrl)) {
        const photo = parsed.profilePhotoURL || parsed.avatarUrl;
        if (photo && !localStorage.getItem(`aver_custom_photo_${targetUid}`)) {
          console.log(`[Storage] Migrating legacy profile photo for user: ${targetUid}`);
          localStorage.setItem(`aver_custom_photo_${targetUid}`, photo);
        }
      }
      
      // Migrate profile to scoped storage if not exists
      const profileKey = `user_profile_${targetUid}`;
      if (!localStorage.getItem(profileKey)) {
        localStorage.setItem(profileKey, legacyProfile);
      }
    }

    // 2. Migrate standalone aver_custom_photo if it exists
    const legacyPhoto = localStorage.getItem('aver_custom_photo');
    if (legacyPhoto && uid) {
      if (!localStorage.getItem(`aver_custom_photo_${uid}`)) {
        localStorage.setItem(`aver_custom_photo_${uid}`, legacyPhoto);
      }
    }

    // 3. Migrate aver2_notified to global sticky if it exists
    const legacyNotified = localStorage.getItem('aver2_notified');
    if (legacyNotified === 'true') {
      localStorage.setItem('aver2_notified_global', 'true');
    }
  } catch (e) {}

  const globalLeakKeys = [
    'portfolio_vault_balance',
    'vault_passcode',
    'vault_onboarded',
    'vault_target',
    'vault_target_configured',
    'vault_assets',
    'aver_twoFactorEnabled',
    'aver_email_verified',
    'aver_kyc_verified',
    'aver_bronze_completed',
    'aver_platinum_completed',
    'aver_welcome_bonus_claimed',
    'aver_task_deposit_1000',
    'aver_task_trade_500',
    'aver_task_copy_10',
    'aver_task_strat_2',
    'portfolio_active_offset',
    'aver_active_user',
    'aver_user_profile',
    'aver_trading_config',
    'aver_connected_wallet'
  ];

  // Only purge stand-alone custom photo if we have a UID and confirmed it was migrated or isn't needed
  if (uid) {
    globalLeakKeys.push('aver_custom_photo');
  }

  globalLeakKeys.forEach(k => {
    safeStorage.removeItem(k);
  });
}
