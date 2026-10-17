import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { ColorValue, Pressable } from 'react-native';

import { colors } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => (
  <Ionicons name={name} color={color as string} size={size} />
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dnevnik',
          tabBarIcon: icon('book-outline'),
          headerRight: () => (
            <Pressable onPress={() => router.push('/scan')} hitSlop={10} style={{ marginRight: 16 }}>
              <Ionicons name="barcode-outline" size={26} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="reports" options={{ title: 'Izvještaji', tabBarIcon: icon('bar-chart-outline') }} />
      <Tabs.Screen name="progress" options={{ title: 'Napredak', tabBarIcon: icon('trending-down-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  );
}
