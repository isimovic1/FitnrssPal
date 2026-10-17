import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider, useStore } from '../lib/store';
import { colors } from '../theme';

function RootNavigator() {
  const { state, ready } = useStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const onboarded = state.profile !== null;
  return (
    <Stack screenOptions={{ headerTintColor: colors.primary, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-food" options={{ title: 'Dodaj namirnicu' }} />
        <Stack.Screen name="food" options={{ title: 'Namirnica' }} />
        <Stack.Screen name="custom-food" options={{ title: 'Nova namirnica' }} />
        <Stack.Screen name="scan" options={{ title: 'Skeniraj bar-kod', presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="add-exercise" options={{ title: 'Dodaj aktivnost', presentation: 'modal' }} />
        <Stack.Screen name="log-weight" options={{ title: 'Unesi težinu', presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
