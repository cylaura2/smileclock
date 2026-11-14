import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StoreProvider, useStore } from './src/store';
import TodayScreen from './src/screens/TodayScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { colors, spacing } from './src/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type Tab = 'today' | 'calendar' | 'settings';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'today', label: 'Today', icon: '⏱' },
  { key: 'calendar', label: 'Calendar', icon: '📅' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

function Shell() {
  const { ready } = useStore();
  const [tab, setTab] = useState<Tab>('today');

  if (!ready) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>
          Smile<Text style={{ color: colors.primary }}>Clock</Text>
        </Text>
      </View>

      <View style={styles.body}>
        {tab === 'today' && <TodayScreen />}
        {tab === 'calendar' && <CalendarScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabIcon, { opacity: active ? 1 : 0.4 }]}>{t.icon}</Text>
              <Text style={[styles.tabLabel, { color: active ? colors.primaryDark : colors.faint }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: spacing.sm, paddingBottom: spacing.sm, alignItems: 'center' },
  brand: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.3 },
  body: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  tab: { flex: 1, alignItems: 'center' },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
