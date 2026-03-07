import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View } from 'react-native';

import SignUpScreen from './src/screens/SignUpScreen';
import LoginScreen from './src/screens/LoginScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';

import EventListScreen from './src/screens/EventListScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import AddEventScreen from './src/screens/AddEventScreen';
import EditEventScreen from './src/screens/EditEventScreen';
import CancelEventScreen from './src/screens/CancelEventScreen';

import AddTravelScreen from './src/screens/AddTravelScreen';
import EditTravelScreen from './src/screens/EditTravelScreen';

import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { SettingsProvider, useSettings, useTheme } from './src/context/SettingsContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Auth stack (shown when not logged in) ──
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    </Stack.Navigator>
  );
}

// ── Home module stack ──
function HomeStack() {
  const C = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: C.surface },
        headerTintColor: C.primary,
        headerTitleStyle: { fontWeight: '700', color: C.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: C.background },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
    </Stack.Navigator>
  );
}

// ── Events module stack ──
function EventsStack() {
  const C = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: C.surface },
        headerTintColor: C.primary,
        headerTitleStyle: { fontWeight: '700', color: C.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: C.background },
      }}
    >
      <Stack.Screen
        name="EventList"
        component={EventListScreen}
        options={{ title: 'Events' }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: 'Event Details' }}
      />
      <Stack.Screen
        name="AddEvent"
        component={AddEventScreen}
        options={{ title: 'Add New Event', presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditEvent"
        component={EditEventScreen}
        options={{ title: 'Edit Event' }}
      />
      <Stack.Screen
        name="CancelEvent"
        component={CancelEventScreen}
        options={{ title: 'Cancel Event', presentation: 'modal' }}
      />
      <Stack.Screen
        name="AddTravel"
        component={AddTravelScreen}
        options={{ title: 'Add Travel', presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditTravel"
        component={EditTravelScreen}
        options={{ title: 'Edit Travel' }}
      />
    </Stack.Navigator>
  );
}

// ── Calendar module stack ──
function CalendarStack() {
  const C = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: C.surface },
        headerTintColor: C.primary,
        headerTitleStyle: { fontWeight: '700', color: C.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: C.background },
      }}
    >
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: 'Calendar' }}
      />
      <Stack.Screen
        name="AddEventFromCalendar"
        component={AddEventScreen}
        options={{ title: 'Add New Event', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

// ── Settings module stack ──
function SettingsStack() {
  const C = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: C.surface },
        headerTintColor: C.primary,
        headerTitleStyle: { fontWeight: '700', color: C.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: C.background },
      }}
    >
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}

// ── Main navigator (reads dynamic theme) ──
function AppNavigator() {
  const { isDark } = useSettings();
  const C = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: C.tabInactive,
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopWidth: 1,
            borderTopColor: C.border,
            paddingBottom: 6,
            paddingTop: 6,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStack}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="EventsTab"
          component={EventsStack}
          options={{
            tabBarLabel: 'Events',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sparkles" size={size} color={color} />
            ),
          }}
          listeners={({ navigation }) => ({
            tabPress: () => {
              navigation.navigate('EventsTab', { screen: 'EventList' });
            },
          })}
        />
        <Tab.Screen
          name="CalendarTab"
          component={CalendarStack}
          options={{
            tabBarLabel: 'Calendar',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="SettingsTab"
          component={SettingsStack}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </>
  );
}

function AppShell() {
  const { isDark } = useSettings();
  const C = useTheme();
  const { user, loading: authLoading } = useAuth();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    dark: isDark,
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: C.primary,
      background: C.background,
      card: C.surface,
      text: C.text,
      border: C.border,
      notification: C.danger,
    },
  };

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? <AppNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SettingsProvider>
          <AppShell />
        </SettingsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
