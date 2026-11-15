import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { MissionHealthProvider } from '../context/MissionHealthContext';
import WelcomeScreen from './welcome';

export default function RootLayout() {
  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <MissionHealthProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#050B19' },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="missionintelligence" />
          <Stack.Screen name="missionreadiness" />
          <Stack.Screen name="missionreport" />
          <Stack.Screen name="missionevents" />
          <Stack.Screen name="missionoverview" />
          <Stack.Screen name="analysis" />
          <Stack.Screen name="alerts" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="explore" />
          <Stack.Screen name="welcome" />
        </Stack>

        {showWelcome && (
          <View style={styles.welcomeOverlay}>
            <WelcomeScreen onEnter={() => setShowWelcome(false)} />
          </View>
        )}
      </View>
    </MissionHealthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B19',
  },
  welcomeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#050B19',
    zIndex: 999,
    elevation: 999,
  },
});
