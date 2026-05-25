import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions, Text } from 'react-native';

const { width } = Dimensions.get('window');

// Use require at module level to ensure the image is bundled
const appIcon = require('../../assets/icon.png');

export default function SplashScreen() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate the loading bar
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Image
        source={appIcon}
        style={styles.icon}
        resizeMode="contain"
      />
      <Text style={styles.appName}>MUA Planner</Text>
      <View style={styles.loadingContainer}>
        <View style={styles.loadingTrack}>
          <Animated.View
            style={[
              styles.loadingBar,
              { width: progressWidth },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 140,
    height: 140,
    borderRadius: 28,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B8A',
    marginBottom: 40,
  },
  loadingContainer: {
    width: width * 0.5,
    alignItems: 'center',
  },
  loadingTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#FFE4E8',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBar: {
    height: '100%',
    backgroundColor: '#FF6B8A',
    borderRadius: 2,
  },
});
