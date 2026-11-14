import React, { useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

const ACTION_W = 88;

type Props = {
  children: React.ReactNode;
  onPress: () => void;
  onDelete: () => void;
  topBorder?: boolean;
};

/**
 * iOS-style swipe-left-to-delete row. Drag the row left to reveal a red Delete
 * action; tap it to remove. A plain tap (no drag) fires onPress. Uses
 * PanResponder so it works in the web/PWA build without extra dependencies.
 */
export default function SwipeableRow({ children, onPress, onDelete, topBorder }: Props) {
  const tx = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);

  const settle = (to: number) => {
    openRef.current = to !== 0;
    Animated.spring(tx, { toValue: to, useNativeDriver: false, speed: 20, bounciness: 4 }).start();
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        const base = openRef.current ? -ACTION_W : 0;
        let next = base + g.dx;
        if (next > 0) next = 0;
        if (next < -ACTION_W - 24) next = -ACTION_W - 24;
        tx.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const base = openRef.current ? -ACTION_W : 0;
        settle(base + g.dx < -ACTION_W / 2 ? -ACTION_W : 0);
      },
      onPanResponderTerminate: () => settle(openRef.current ? -ACTION_W : 0),
    })
  ).current;

  return (
    <View style={styles.wrap}>
      <View style={styles.action}>
        <Pressable
          style={styles.deleteBtn}
          onPress={() => {
            settle(0);
            onDelete();
          }}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.fg, { transform: [{ translateX: tx }] }]} {...responder.panHandlers}>
        <Pressable
          onPress={() => (openRef.current ? settle(0) : onPress())}
          style={[styles.press, topBorder && styles.border]}
        >
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden' },
  action: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_W,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { flex: 1, width: ACTION_W, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  fg: { backgroundColor: colors.card },
  press: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
});
