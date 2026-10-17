import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileForm } from '../components/ProfileForm';
import { KeyboardAware, styles } from '../components/ui';
import { todayKey } from '../lib/dates';
import { useStore } from '../lib/store';
import { colors, spacing } from '../theme';

export default function Onboarding() {
  const { setProfile, setWeight } = useStore();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAware>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
            <Text style={styles.h1}>Dobrodošao u FitnessPal 👋</Text>
            <Text style={styles.muted}>
              Unesi osnovne podatke pa ćemo izračunati tvoj dnevni kalorijski cilj, deficit i makronutrijente.
            </Text>
          </View>
          <ProfileForm
            submitLabel="Započni"
            onSubmit={(p) => {
              setWeight({ date: todayKey(), kg: p.startWeightKg });
              setProfile(p);
            }}
          />
        </ScrollView>
      </KeyboardAware>
    </SafeAreaView>
  );
}
