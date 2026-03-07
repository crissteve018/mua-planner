import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants';

/**
 * UndoSnackbar — shown at the bottom after delete. Auto-dismisses after `duration` ms.
 * Props:
 *   visible: boolean
 *   message: string
 *   onUndo: () => void
 *   onDismiss: () => void
 *   duration: number (default 5000)
 */
export default function UndoSnackbar({ visible, message, onUndo, onDismiss, duration = 5000 }) {
  const translateY = useRef(new Animated.Value(100)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
      timerRef.current = setTimeout(() => {
        hide();
        onDismiss && onDismiss();
      }, duration);
    } else {
      Animated.timing(translateY, { toValue: 100, duration: 200, useNativeDriver: true }).start();
    }
    return () => clearTimeout(timerRef.current);
  }, [visible]);

  const hide = () => {
    Animated.timing(translateY, { toValue: 100, duration: 200, useNativeDriver: true }).start();
  };

  const handleUndo = () => {
    clearTimeout(timerRef.current);
    hide();
    onUndo && onUndo();
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <Text style={styles.message} numberOfLines={1}>{message}</Text>
      <TouchableOpacity onPress={handleUndo} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.undoText}>UNDO</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#323232',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    marginRight: 16,
  },
  undoText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
